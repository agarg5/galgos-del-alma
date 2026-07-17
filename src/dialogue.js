// Dialogue system: UI + Anthropic API streaming
import { state } from './state.js';
import { discoverGalgo } from './galgos.js';
import { showMilestone, showTimedOverlay } from './hud.js';
import { CHAT_MODEL, CHAT_MAX_TOKENS, CHAT_THINKING, MAX_MESSAGES } from '../chat-config.js';
import { initVoice, speakAs, stopSpeaking, stopListening } from './voice.js';
import { t } from './i18n.js';

export function openDialogue(npc) {
  if (state.dialogueActive) return;
  state.dialogueActive = true;
  state.currentNPC = npc;
  document.getElementById('dialogue-overlay').style.display = 'block';
  document.getElementById('dialogue-npc-name').textContent = npc.name;
  renderHistory();
  const input = document.getElementById('dialogue-input');
  input.value = ''; // drop any stale text (e.g. a late voice transcript)
  input.focus();
}

let streamAbort = null;

export function closeDialogue() {
  state.dialogueActive = false;
  document.getElementById('dialogue-overlay').style.display = 'none';
  state.currentNPC = null;
  stopSpeaking();
  stopListening();
  // Abort any in-flight reply so a stalled connection can't leave the
  // streaming lock (and the send button) stuck for the next conversation.
  streamAbort?.abort();
}

function renderHistory() {
  const el = document.getElementById('dialogue-history');
  el.innerHTML = '';
  if (state.currentNPC) {
    state.currentNPC.history.forEach(msg => {
      const div = document.createElement('div');
      div.className = 'msg ' + (msg.role === 'assistant' ? 'npc' : 'player');
      div.textContent = msg.content;
      el.appendChild(div);
    });
  }
  el.scrollTop = el.scrollHeight;
}

// The API requires messages to alternate starting with a user turn. After
// pruning to the last N entries the array can start with an assistant turn,
// which would 400 — drop leading assistant messages.
function apiMessages(history) {
  const msgs = history.slice(-MAX_MESSAGES);
  while (msgs.length && msgs[0].role !== 'user') msgs.shift();
  return msgs;
}

// Stream a completion through the serverless proxy (default) or directly
// against the Anthropic API when the player supplied their own key.
// Calls onDelta(textSoFar) as tokens arrive; returns the full text.
async function streamCompletion(systemPrompt, messages, onDelta, signal) {
  const apiKey = sessionStorage.getItem('anthropic_key');

  const res = apiKey
    ? await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: CHAT_MODEL,
          max_tokens: CHAT_MAX_TOKENS,
          thinking: CHAT_THINKING,
          system: systemPrompt,
          messages,
          stream: true,
        }),
      })
    : await fetch('/api/chat', {
        method: 'POST',
        signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system: systemPrompt, messages }),
      });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const err = await res.json();
      detail = err?.error?.message || err?.error || detail;
    } catch { /* non-JSON error body */ }
    throw new Error(detail);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let text = '';
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      try {
        const parsed = JSON.parse(data);
        if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
          text += parsed.delta.text;
          onDelta(text);
        }
        if (parsed.type === 'error') {
          throw new Error(parsed.error?.message || 'stream error');
        }
      } catch (e) {
        if (e instanceof SyntaxError) continue; // partial/non-JSON line
        throw e;
      }
    }
  }
  return text;
}

// Spec §14.1 — NPCs hold pieces of the map. Each entry drives BOTH the
// in-character prompt nudge and the deterministic unlock from one gate:
// the nudge is injected on the exchange that will trigger the unlock, and
// the unlock fires once the NPC has completed `unlockAfterExchanges` replies.
const DISCOVERIES = [
  {
    npcId: 'veterinaria',
    unlockAfterExchanges: 1,
    pending: () => !state.lunaHinted,
    promptAddition: '\n\nIMPORTANT for this conversation: early on, mention that you have heard reports of an abandoned galgo spotted out in the dehesa — thin, fawn-colored, very skittish. You are worried about her and hope someone checks on her.',
    unlock() {
      state.lunaHinted = true;
      localStorage.setItem('luna_hinted', 'true');
      showMilestone(t('milestone.lunaHint'));
    },
  },
  {
    npcId: 'cazador',
    unlockAfterExchanges: 2,
    pending: () => {
      const rayo = state.galgos.find(g => g.id === 'rayo');
      return rayo && !rayo.discovered;
    },
    promptAddition: '\n\nIMPORTANT for this conversation: at some point, let slip that after the season ended you left a brindle galgo near the edge of the village — you could not keep him and did not want to deal with it. You are a little defensive about it.',
    unlock() {
      discoverGalgo('rayo');
      showMilestone(t('milestone.rayo'));
    },
  },
];

const completedExchanges = npc => npc.history.filter(m => m.role === 'assistant').length;

function discoveryPromptAddition(npc) {
  const d = DISCOVERIES.find(d => d.npcId === npc.id);
  return d && d.pending() && completedExchanges(npc) >= d.unlockAfterExchanges - 1
    ? d.promptAddition
    : '';
}

function handleDiscoveryUnlocks(npc) {
  const d = DISCOVERIES.find(d => d.npcId === npc.id);
  if (d && d.pending() && completedExchanges(npc) >= d.unlockAfterExchanges) {
    d.unlock();
  }
}

export async function sendMessage() {
  if (!state.currentNPC || state.streaming) return;
  const input = document.getElementById('dialogue-input');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';

  stopSpeaking(); // a new exchange cuts off the previous spoken reply

  const npc = state.currentNPC;
  const userMsg = { role: 'user', content: text };
  npc.history.push(userMsg);
  renderHistory();

  state.streaming = true;
  document.getElementById('dialogue-send').disabled = true;

  const galgoState = state.galgos
    .filter(g => g.discovered)
    .map(g => `${g.name}: trust ${g.trust}/100`).join(', ') || 'none met yet';
  const systemPrompt = npc.system +
    (npc.summary ? `\n\nRelationship summary from previous sessions: ${npc.summary}` : '') +
    `\n\nCurrent world state: Session ${state.sessions}. Galgos the player has met: ${galgoState}. Village reputation: ${state.reputation}/100.` +
    discoveryPromptAddition(npc) +
    '\n\nStay in character. Keep replies to a few conversational sentences.' +
    '\n\n' + t('dialogue.langInstruction');

  const historyEl = document.getElementById('dialogue-history');
  const msgDiv = document.createElement('div');
  msgDiv.className = 'msg npc';
  historyEl.appendChild(msgDiv);

  streamAbort = new AbortController();
  try {
    const npcText = await streamCompletion(
      systemPrompt,
      apiMessages(npc.history),
      textSoFar => {
        msgDiv.textContent = textSoFar;
        historyEl.scrollTop = historyEl.scrollHeight;
      },
      streamAbort.signal
    );
    // An empty reply (e.g. the proxy's upstream died right after headers)
    // must take the rollback path too, or the dangling user turn breaks
    // role alternation on the next send.
    if (!npcText) throw new Error('no reply');

    npc.history.push({ role: 'assistant', content: npcText });
    if (npc.history.length > MAX_MESSAGES) {
      npc.history = npc.history.slice(-MAX_MESSAGES);
    }
    localStorage.setItem(`npc_${npc.id}_history`, JSON.stringify(npc.history));

    const summaryText = `Last spoke about: "${text.slice(0, 60)}". NPC responded about: "${npcText.slice(0, 80)}".`;
    npc.summary = summaryText;
    localStorage.setItem(`npc_${npc.id}_summary`, summaryText);

    handleDiscoveryUnlocks(npc);
    // Speak only if this conversation is still on screen — a reply landing
    // right as the player closes would otherwise talk over the open world
    // with the stop button hidden.
    if (state.dialogueActive && state.currentNPC === npc) {
      speakAs(npc.id, npcText);
    }

    // If the player closed and reopened this dialogue mid-stream, the live
    // panel was rebuilt without our streaming div — re-render from history.
    if (state.dialogueActive && state.currentNPC === npc && !msgDiv.isConnected) {
      renderHistory();
    }
  } catch (err) {
    // Roll the failed user turn back out of history so the conversation
    // isn't stuck with consecutive user messages (the API rejects those)
    // or an oversized message that fails validation on every retry. Only
    // if it's still the last entry — if the assistant reply already landed
    // the exchange succeeded and removing the user turn would break
    // alternation the other way.
    if (npc.history[npc.history.length - 1] === userMsg) npc.history.pop();
    // Only touch the panel if it still shows THIS NPC's conversation.
    if (state.dialogueActive && state.currentNPC === npc) {
      // Keep any partially streamed reply visible; append the error separately.
      const errDiv = msgDiv.textContent && msgDiv.isConnected
        ? document.createElement('div') : msgDiv;
      errDiv.className = 'msg npc';
      errDiv.textContent = t('dialogue.error', { name: npc.name, detail: err.message });
      if (!errDiv.isConnected) historyEl.appendChild(errDiv);
      historyEl.scrollTop = historyEl.scrollHeight;
    }
  }

  state.streaming = false;
  document.getElementById('dialogue-send').disabled = false;
}

// Spec §8.3 — a bonded galgo's short poetic inner monologue.
export async function requestWhisper(galgo) {
  if (state.streaming) return;
  state.streaming = true;
  // The whisper shares the streaming lock with dialogue — reflect that in
  // the send button so a send attempted mid-whisper doesn't look ignored.
  const sendBtn = document.getElementById('dialogue-send');
  sendBtn.disabled = true;
  const el = document.getElementById('whisper');
  el.textContent = '...';
  el.style.display = 'block';
  // A whisper has no cancel UI — time out a stalled stream so it can't
  // hold the shared streaming lock forever.
  streamAbort = new AbortController();
  const watchdog = setTimeout(() => streamAbort.abort(), 30000);
  try {
    const text = await streamCompletion(
      t('whisper.prompt', { name: galgo.name }),
      [{ role: 'user', content: t('whisper.opening') }],
      textSoFar => { el.textContent = textSoFar; },
      streamAbort.signal
    );
    if (text) {
      showTimedOverlay(el, text, 9000);
      speakAs('whisper', text);
    } else {
      el.style.display = 'none';
    }
  } catch {
    el.style.display = 'none';
  }
  clearTimeout(watchdog);
  state.streaming = false;
  sendBtn.disabled = false;
}

export function initDialogueListeners() {
  document.getElementById('dialogue-close').addEventListener('click', closeDialogue);
  document.getElementById('dialogue-send').addEventListener('click', sendMessage);
  initVoice(sendMessage);
}
