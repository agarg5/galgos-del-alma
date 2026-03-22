// Dialogue system: UI + Anthropic API streaming
import { state } from './state.js';

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

export async function sendMessage() {
  if (!state.currentNPC || state.streaming) return;
  const input = document.getElementById('dialogue-input');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';

  state.currentNPC.history.push({ role: 'user', content: text });
  renderHistory();

  state.streaming = true;
  document.getElementById('dialogue-send').disabled = true;

  const galgoState = state.galgos.map(g => `${g.name}: trust ${g.trust}/100`).join(', ');
  const systemPrompt = state.currentNPC.system +
    (state.currentNPC.summary ? `\n\nRelationship summary from previous sessions: ${state.currentNPC.summary}` : '') +
    `\n\nCurrent world state: Session ${state.sessions}. Galgo trust levels: ${galgoState}. Village reputation: ${state.reputation}/100.`;

  try {
    const apiKey = sessionStorage.getItem('anthropic_key');
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        system: systemPrompt,
        messages: state.currentNPC.history.slice(-20),
        stream: true,
      }),
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let npcText = '';

    const historyEl = document.getElementById('dialogue-history');
    const msgDiv = document.createElement('div');
    msgDiv.className = 'msg npc';
    historyEl.appendChild(msgDiv);

    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              npcText += parsed.delta.text;
              msgDiv.textContent = npcText;
              historyEl.scrollTop = historyEl.scrollHeight;
            }
          } catch (e) { /* skip unparseable */ }
        }
      }
    }

    if (npcText) {
      state.currentNPC.history.push({ role: 'assistant', content: npcText });
      if (state.currentNPC.history.length > 20) {
        state.currentNPC.history = state.currentNPC.history.slice(-20);
      }
      localStorage.setItem(`npc_${state.currentNPC.id}_history`, JSON.stringify(state.currentNPC.history));

      const summaryText = `Last spoke about: "${text.slice(0, 60)}". NPC responded about: "${npcText.slice(0, 80)}".`;
      state.currentNPC.summary = summaryText;
      localStorage.setItem(`npc_${state.currentNPC.id}_summary`, summaryText);
    }
  } catch (err) {
    const historyEl = document.getElementById('dialogue-history');
    const errDiv = document.createElement('div');
    errDiv.className = 'msg npc';
    errDiv.textContent = `[Connection error: ${err.message}]`;
    historyEl.appendChild(errDiv);
  }

  state.streaming = false;
  document.getElementById('dialogue-send').disabled = false;
}

export function initDialogueListeners() {
  document.getElementById('dialogue-close').addEventListener('click', closeDialogue);
  document.getElementById('dialogue-send').addEventListener('click', sendMessage);
}
