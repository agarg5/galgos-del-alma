// Internationalization — English and Spanish. The game world is Spain, so
// Spanish is the default; the player picks a language on the start screen and
// it persists across sessions. Every player-facing string flows through t(),
// and static markup is translated declaratively via data-i18n attributes.

const STRINGS = {
  en: {
    'start.subtitle': 'A story of patience, compassion, and trust',
    'start.description':
      'Every year after hunting season ends in Spain, thousands of galgos — Spanish greyhounds — are abandoned by their owners. Left in fields, tied to trees, or worse. In this world, you are a volunteer. Walk the golden dehesa, earn the trust of three frightened galgos, and speak with the people of the village. There are no enemies here — only fear, and the slow medicine of kindness.',
    'start.begin': 'Begin',
    'start.continue': 'Continue',
    'start.reset': 'Start over',
    'start.langLabel': 'Language',
    'reset.confirm': 'Start over? All trust, conversations, and progress will be lost.',

    'apikey.summary': 'Use your own API key (optional)',
    'apikey.placeholder': 'Enter your Anthropic API key',
    'apikey.note': 'Your key is stored only in this browser tab.',

    'hint.start': 'Use WASD to walk. Hold and drag the mouse to look around.',
    'hint.idleNpc': 'The people of this village each know something. Try talking to someone.',
    'hint.idleExplore': 'Ask around — someone may know where other galgos have been seen.',
    'hint.firstNpc': 'Press E to talk. These conversations shape the story.',
    'hint.firstGalgo': 'Press E to care for this galgo. Earning trust takes patience.',
    'hint.afterCare': 'Trust builds slowly. Try different actions — sit nearby, offer food, or a gentle touch when the time is right.',

    'hud.reputation': 'Village standing: {n} / 100',
    'hud.audioTitle': 'Enable ambient sound',
    'audio.muteTitle': 'Mute sound & music',
    'audio.enableTitle': 'Enable sound & music',
    'prompt.default': 'Press E to interact',
    'prompt.talk': 'E: Talk to {name}',
    'prompt.care': 'E: Care for {name}',

    'zone.dehesa': 'La Dehesa',
    'zone.pueblo': 'El Pueblo',
    'zone.refugio': 'El Refugio',
    'zone.road': 'The Road',

    'care.title': 'Care for {name}',
    'care.sit': 'Sit nearby quietly (+3 trust)',
    'care.food': 'Offer food (+8 trust)',
    'care.touch': 'Gentle touch (+12 trust)',
    'care.foodLocked': 'Offer food (needs more trust)',
    'care.touchLocked': 'Gentle touch (needs more trust)',
    'care.whisper': 'Listen',
    'care.close': 'Walk away',

    'dialogue.close': 'End conversation',
    'dialogue.send': 'Send',
    'dialogue.placeholder': 'Speak or type...',
    'dialogue.micTitle': 'Speak your reply',
    'dialogue.error': "[{name} pauses — the words don't come. ({detail})]",
    'dialogue.langInstruction':
      'IMPORTANT: You must reply only in natural English, no matter what language the player writes in.',

    'voice.on': '\u{1F5E3}️ On',
    'voice.off': '\u{1F5E3}️ Off',
    'voice.stop': '■ Stop talking',
    'voice.titleOn': 'NPC voices on — click to mute',
    'voice.titleOff': 'NPC voices off — click to enable',

    'milestone.lunaHint': 'Dr. Amparo mentioned a galgo out in the dehesa. Maybe you should look for her.',
    'milestone.rayo': 'A brindle galgo has been left near the village outskirts. Rayo.',
    'milestone.luna': 'A thin, fawn-colored galgo watches you from the trees. Luna.',
    'milestone.trustStarting': '{name} is starting to trust you.',
    'milestone.trustReady': '{name} is ready for a forever home.',

    'whisper.prompt':
      'You are {name}, a galgo who has learned to trust again. Speak in simple, sensory, present-tense observations, in English. No dramatics. Just small true things. Two or three short sentences at most.',
    'whisper.opening': 'The person you trust kneels beside you quietly.',
  },

  es: {
    'start.subtitle': 'Una historia de paciencia, compasión y confianza',
    'start.description':
      'Cada año, cuando termina la temporada de caza en España, miles de galgos son abandonados por sus dueños. Los dejan en el campo, atados a los árboles, o cosas peores. En este mundo, tú eres voluntario. Recorre la dehesa dorada, gánate la confianza de tres galgos asustados y habla con la gente del pueblo. Aquí no hay enemigos, solo el miedo y la lenta medicina de la bondad.',
    'start.begin': 'Comenzar',
    'start.continue': 'Continuar',
    'start.reset': 'Empezar de nuevo',
    'start.langLabel': 'Idioma',
    'reset.confirm': '¿Empezar de nuevo? Se perderán toda la confianza, las conversaciones y el progreso.',

    'apikey.summary': 'Usa tu propia clave API (opcional)',
    'apikey.placeholder': 'Introduce tu clave API de Anthropic',
    'apikey.note': 'Tu clave se guarda solo en esta pestaña del navegador.',

    'hint.start': 'Usa WASD para caminar. Mantén pulsado y arrastra el ratón para mirar alrededor.',
    'hint.idleNpc': 'Cada persona de este pueblo sabe algo. Prueba a hablar con alguien.',
    'hint.idleExplore': 'Pregunta por ahí: alguien podría saber dónde se han visto otros galgos.',
    'hint.firstNpc': 'Pulsa E para hablar. Estas conversaciones dan forma a la historia.',
    'hint.firstGalgo': 'Pulsa E para cuidar a este galgo. Ganarse su confianza requiere paciencia.',
    'hint.afterCare': 'La confianza se construye despacio. Prueba distintas acciones: siéntate cerca, ofrece comida o una caricia suave cuando sea el momento.',

    'hud.reputation': 'Reputación en el pueblo: {n} / 100',
    'hud.audioTitle': 'Activar sonido ambiente',
    'audio.muteTitle': 'Silenciar sonido y música',
    'audio.enableTitle': 'Activar sonido y música',
    'prompt.default': 'Pulsa E para interactuar',
    'prompt.talk': 'E: Habla con {name}',
    'prompt.care': 'E: Cuida a {name}',

    'zone.dehesa': 'La Dehesa',
    'zone.pueblo': 'El Pueblo',
    'zone.refugio': 'El Refugio',
    'zone.road': 'El Camino',

    'care.title': 'Cuida a {name}',
    'care.sit': 'Siéntate cerca en silencio (+3 de confianza)',
    'care.food': 'Ofrece comida (+8 de confianza)',
    'care.touch': 'Caricia suave (+12 de confianza)',
    'care.foodLocked': 'Ofrece comida (necesita más confianza)',
    'care.touchLocked': 'Caricia suave (necesita más confianza)',
    'care.whisper': 'Escucha',
    'care.close': 'Aléjate',

    'dialogue.close': 'Terminar conversación',
    'dialogue.send': 'Enviar',
    'dialogue.placeholder': 'Habla o escribe...',
    'dialogue.micTitle': 'Habla tu respuesta',
    'dialogue.error': '[{name} se detiene — las palabras no llegan. ({detail})]',
    'dialogue.langInstruction':
      'IMPORTANTE: Debes responder únicamente en español (castellano de España), sin importar en qué idioma escriba el jugador.',

    'voice.on': '\u{1F5E3}️ Sí',
    'voice.off': '\u{1F5E3}️ No',
    'voice.stop': '■ Dejar de hablar',
    'voice.titleOn': 'Voces activadas — clic para silenciar',
    'voice.titleOff': 'Voces desactivadas — clic para activar',

    'milestone.lunaHint': 'La Dra. Amparo mencionó a una galga en la dehesa. Quizá deberías ir a buscarla.',
    'milestone.rayo': 'Han dejado a un galgo atigrado en las afueras del pueblo. Rayo.',
    'milestone.luna': 'Una galga delgada y de color canela te observa entre los árboles. Luna.',
    'milestone.trustStarting': '{name} empieza a confiar en ti.',
    'milestone.trustReady': '{name} está lista para un hogar para siempre.',

    'whisper.prompt':
      'Eres {name}, un galgo que ha aprendido a confiar de nuevo. Habla con observaciones sencillas, sensoriales y en presente, en español. Sin dramatismos. Solo pequeñas cosas verdaderas. Dos o tres frases cortas como mucho.',
    'whisper.opening': 'La persona en quien confías se arrodilla en silencio a tu lado.',
  },
};

export const SUPPORTED_LANGS = ['es', 'en'];
const DEFAULT_LANG = 'es';
const LANG_KEY = 'game_lang';
const LANG_EVENT = 'galgos:langchange';

let lang = localStorage.getItem(LANG_KEY);
if (!SUPPORTED_LANGS.includes(lang)) lang = DEFAULT_LANG;

export function getLang() {
  return lang;
}

// Look up a key in the current language, falling back to English, then the
// raw key. `params` values are substituted for {placeholder} tokens.
export function t(key, params) {
  let str = STRINGS[lang]?.[key] ?? STRINGS.en[key] ?? key;
  if (params) {
    for (const p in params) str = str.split(`{${p}}`).join(params[p]);
  }
  return str;
}

export function setLang(next) {
  if (!SUPPORTED_LANGS.includes(next) || next === lang) return;
  lang = next;
  localStorage.setItem(LANG_KEY, next);
  applyStaticTranslations();
  window.dispatchEvent(new CustomEvent(LANG_EVENT));
}

// Register a callback fired whenever the language changes at runtime. Used by
// modules that render dynamic text so they can refresh what's on screen.
export function onLangChange(cb) {
  window.addEventListener(LANG_EVENT, cb);
}

// Translate all declaratively-marked static markup and reflect the choice in
// <html lang> and the start-screen language buttons.
export function applyStaticTranslations() {
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.setAttribute('title', t(el.getAttribute('data-i18n-title')));
  });
  document.querySelectorAll('[data-lang]').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
  });
}

// Wire the start-screen language buttons. Safe to call once at startup.
export function initLanguageToggle() {
  document.querySelectorAll('[data-lang]').forEach(btn => {
    btn.addEventListener('click', () => setLang(btn.getAttribute('data-lang')));
  });
  applyStaticTranslations();
}
