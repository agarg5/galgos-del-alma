// Voice: NPCs speak their replies (speechSynthesis) and the player can talk
// back (SpeechRecognition). Both are built into the browser — no API keys.
// Replies always stream as text too; speech is a layer on top.

const synth = window.speechSynthesis || null;
const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition || null;

// Distinct delivery per character — same engine, different pitch/rate
const VOICE_PROFILES = {
  cazador: { pitch: 0.7, rate: 0.92 },
  veterinaria: { pitch: 1.05, rate: 1.0 },
  alcalde: { pitch: 0.85, rate: 0.9 },
  adoptante: { pitch: 1.15, rate: 1.03 },
  whisper: { pitch: 1.25, rate: 0.85, volume: 0.75 },
};

let voiceEnabled = localStorage.getItem('voice_enabled') !== 'false';
let cachedVoice;

function pickVoice() {
  if (cachedVoice !== undefined) return cachedVoice;
  const voices = synth.getVoices();
  cachedVoice =
    voices.find(v => v.lang === 'en-US' && /google/i.test(v.name)) ||
    voices.find(v => v.lang.startsWith('en')) ||
    voices[0] || null;
  return cachedVoice;
}

function updateButtons() {
  const toggle = document.getElementById('voice-toggle');
  toggle.textContent = voiceEnabled ? '\u{1F5E3}️ On' : '\u{1F5E3}️ Off';
  toggle.title = voiceEnabled ? 'NPC voices on — click to mute' : 'NPC voices off — click to enable';
}

export function speakAs(profileId, text) {
  if (!synth || !voiceEnabled || !text) return;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const profile = VOICE_PROFILES[profileId] || {};
  const voice = pickVoice();
  if (voice) u.voice = voice;
  u.pitch = profile.pitch ?? 1;
  u.rate = profile.rate ?? 1;
  u.volume = profile.volume ?? 1;
  const stopBtn = document.getElementById('voice-stop');
  u.onstart = () => { stopBtn.style.display = 'inline-block'; };
  u.onend = u.onerror = () => { stopBtn.style.display = 'none'; };
  synth.speak(u);
}

export function stopSpeaking() {
  if (!synth) return;
  synth.cancel();
  document.getElementById('voice-stop').style.display = 'none';
}

// --- Speech-to-text -------------------------------------------------------

let recognizer = null;
let listening = false;

function initRecognition(onFinal) {
  recognizer = new Recognition();
  recognizer.lang = 'en-US';
  recognizer.interimResults = true;
  recognizer.continuous = false;

  const input = document.getElementById('dialogue-input');
  const micBtn = document.getElementById('mic-btn');

  recognizer.onresult = e => {
    let text = '';
    let isFinal = false;
    for (const result of e.results) {
      text += result[0].transcript;
      if (result.isFinal) isFinal = true;
    }
    input.value = text;
    if (isFinal && text.trim()) onFinal();
  };
  recognizer.onend = () => {
    listening = false;
    micBtn.classList.remove('listening');
  };
  recognizer.onerror = () => {
    listening = false;
    micBtn.classList.remove('listening');
  };
}

export function initVoice(sendMessage) {
  const toggle = document.getElementById('voice-toggle');
  const stopBtn = document.getElementById('voice-stop');
  const micBtn = document.getElementById('mic-btn');

  if (!synth) {
    toggle.style.display = 'none';
    stopBtn.style.display = 'none';
  } else {
    // Voice list loads asynchronously in some browsers
    synth.addEventListener?.('voiceschanged', () => { cachedVoice = undefined; });
    updateButtons();
    toggle.addEventListener('click', () => {
      voiceEnabled = !voiceEnabled;
      localStorage.setItem('voice_enabled', String(voiceEnabled));
      if (!voiceEnabled) stopSpeaking();
      updateButtons();
    });
    stopBtn.addEventListener('click', stopSpeaking);
  }

  if (!Recognition) {
    micBtn.style.display = 'none';
    return;
  }
  initRecognition(sendMessage);
  micBtn.addEventListener('click', () => {
    if (listening) {
      recognizer.stop();
      return;
    }
    stopSpeaking(); // don't transcribe the NPC's own voice
    try {
      recognizer.start();
      listening = true;
      micBtn.classList.add('listening');
    } catch { /* start() throws if called too soon after stop */ }
  });
}
