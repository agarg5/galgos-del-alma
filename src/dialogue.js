// Dialogue system: UI + Anthropic API streaming
import { state } from './state.js';
import { discoverGalgo } from './galgos.js';
import { showMilestone } from './hud.js';

export function openDialogue(npc) {
  if (state.dialogueActive) return;
  state.dialogueActive = true;
  state.currentNPC = npc;
  document.getElementById('dialogue-overlay').style.display = 'block';
  document.getElementById('dialogue-npc-name').textContent = npc.name;
  renderHistory();
  document.getElementById('dialogue-input').focus();
}

export function closeDialogue() {
  state.dialogueActive = false;
  document.getElementById('dialogue-overlay').style.display = 'none';
  state.currentNPC = null;
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
  const msgs = history.slice(-20);
  while (msgs.length && msgs[0].role !== 'user') msgs.shift();
  return msgs;
}

// Stream a completion through the serverless proxy (default) or directly
// against the Anthropic API when the player supplied their own key.
// Calls onDelta(textSoFar) as tokens arrive; returns the full text.
async function streamCompletion(systemPrompt, messages, onDelta) {
  const apiKey = sessionStorage.getItem('anthropic_key');

  const res = apiKey
    ? await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-5',
          max_tokens: 300,
          // Sonnet 5 runs adaptive thinking by default; disable it so the
          // 300-token budget goes to dialogue, not reasoning.
          thinking: { type: 'disabled' },
          system: systemPrompt,
          messages,
          stream: true,
        }),
      })
    : await fetch('/api/chat', {
        method: 'POST',
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

// Spec §14.1 — NPCs hold pieces of the map. These additions steer the LLM to
// drop the hint in character; the actual unlock is deterministic (below).
function discoveryPromptAddition(npc) {
  if (npc.id === 'veterinaria' && localStorage.getItem('luna_hinted') !== 'true') {
    return '\n\nIMPORTANT for this conversation: early on, mention that you have heard reports of an abandoned galgo spotted out in the dehesa — thin, fawn-colored, very skittish. You are worried about her and hope someone checks on her.';
  }
  const rayo = state.galgos.find(g => g.id === 'rayo');
  if (npc.id === 'cazador' && rayo && !rayo.discovered && npc.history.length >= 2) {
    return '\n\nIMPORTANT for this conversation: at some point, let slip that after the season ended you left a brindle galgo near the edge of the village — you could not keep him and did not want to deal with it. You are a little defensive about it.';
  }
  return '';
}

function handleDiscoveryUnlocks(npc) {
  if (npc.id === 'veterinaria' && localStorage.getItem('luna_hinted') !== 'true') {
    localStorage.setItem('luna_hinted', 'true');
    showMilestone('Dr. Amparo mentioned a galgo out in the dehesa. Maybe you should look for her.');
  }
  const rayo = state.galgos.find(g => g.id === 'rayo');
  // Second completed exchange with Miguel: he lets the brindle galgo slip.
  if (npc.id === 'cazador' && rayo && !rayo.discovered && npc.history.length >= 4) {
    discoverGalgo('rayo');
    showMilestone('A brindle galgo has been left near the village outskirts. Rayo.');
  }
}

export async function sendMessage() {
  if (!state.currentNPC || state.streaming) return;
  const input = document.getElementById('dialogue-input');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';

  const npc = state.currentNPC;
  npc.history.push({ role: 'user', content: text });
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
    '\n\nStay in character. Keep replies to a few conversational sentences.';

  const historyEl = document.getElementById('dialogue-history');
  const msgDiv = document.createElement('div');
  msgDiv.className = 'msg npc';
  historyEl.appendChild(msgDiv);

  try {
    const npcText = await streamCompletion(
      systemPrompt,
      apiMessages(npc.history),
      textSoFar => {
        msgDiv.textContent = textSoFar;
        historyEl.scrollTop = historyEl.scrollHeight;
      }
    );

    if (npcText) {
      npc.history.push({ role: 'assistant', content: npcText });
      if (npc.history.length > 20) {
        npc.history = npc.history.slice(-20);
      }
      localStorage.setItem(`npc_${npc.id}_history`, JSON.stringify(npc.history));

      const summaryText = `Last spoke about: "${text.slice(0, 60)}". NPC responded about: "${npcText.slice(0, 80)}".`;
      npc.summary = summaryText;
      localStorage.setItem(`npc_${npc.id}_summary`, summaryText);

      handleDiscoveryUnlocks(npc);
    }
  } catch (err) {
    msgDiv.textContent = `[${npc.name} pauses — the words don't come. (${err.message})]`;
  }

  state.streaming = false;
  document.getElementById('dialogue-send').disabled = false;
}

// Spec §8.3 — a bonded galgo's short poetic inner monologue.
export async function requestWhisper(galgo) {
  if (state.streaming) return;
  state.streaming = true;
  const el = document.getElementById('whisper');
  el.textContent = '...';
  el.style.display = 'block';
  try {
    const text = await streamCompletion(
      `You are ${galgo.name}, a galgo who has learned to trust again. Speak in simple, sensory, present-tense observations. No dramatics. Just small true things. Two or three short sentences at most.`,
      [{ role: 'user', content: 'The person you trust kneels beside you quietly.' }],
      textSoFar => { el.textContent = textSoFar; }
    );
    if (!text) el.style.display = 'none';
  } catch {
    el.style.display = 'none';
  }
  state.streaming = false;
  clearTimeout(el._hideTimer);
  el._hideTimer = setTimeout(() => { el.style.display = 'none'; }, 9000);
}

export function initDialogueListeners() {
  document.getElementById('dialogue-close').addEventListener('click', closeDialogue);
  document.getElementById('dialogue-send').addEventListener('click', sendMessage);
}
