// Shared between the browser client (src/dialogue.js) and the serverless
// proxy (api/chat.js) so both paths always use the same model and limits.
export const CHAT_MODEL = 'claude-sonnet-5';
export const CHAT_MAX_TOKENS = 300;
// Sonnet 5 defaults to adaptive thinking; disable it so the small token
// budget goes to dialogue text, not reasoning.
export const CHAT_THINKING = { type: 'disabled' };
export const MAX_MESSAGES = 20;
export const MAX_CONTENT_CHARS = 2000;
export const MAX_SYSTEM_CHARS = 6000;
