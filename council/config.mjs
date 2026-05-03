// ============================================================
// AI R&D Council — Configuration
// ============================================================

import 'dotenv/config';

const ollamaModel = process.env.OLLAMA_MODEL || 'qwen2.5:32b';

export const CONFIG = {
  // LLM provider — read by llm.mjs. 'ollama' (free, local) or 'openai' (paid, cloud).
  llmProvider: process.env.LLM_PROVIDER || 'ollama',

  // Ollama
  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    model: ollamaModel,
  },

  // OpenAI (fallback path; activates when LLM_PROVIDER=openai)
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
  },

  // Delivery
  recipients: [
    { name: 'Bryan Antonelli', email: 'forgedbyfreedom@proton.me', phone: '+17757418213' },
    { name: 'Wendy Antonelli', email: 'wantonelli2@comcast.net', phone: '+17757418209' },
  ],

  // Twilio (FBF account) — disabled in Ollama edition; code paths preserved for future re-enable
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    from: '+18035906669',
    enabled: false,
  },

  // Email (Gmail SMTP via app password)
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    enabled: !!(process.env.SMTP_USER && process.env.SMTP_PASS),
  },

  // Ghost procurement report recipients (CONFIDENTIAL — restricted distribution)
  ghostRecipients: [
    { name: 'Bryan Antonelli', email: 'forgedbyfreedom@proton.me', phone: '+17757418213' },
    { name: 'Wendy Antonelli', email: 'wantonelli2@comcast.net', phone: '+17757418209' },
    { name: 'Jon Hobgood', email: 'jonhobgood@gmail.com' },
  ],

  // Brew Sheet report recipients (CONFIDENTIAL — Bryan & JB only)
  brewerRecipients: [
    { name: 'Bryan Antonelli', email: 'forgedbyfreedom@proton.me', phone: '+17757418213' },
    { name: 'Jon Hobgood', email: 'jonhobgood@gmail.com' },
  ],

  // ntfy push notifications
  ntfy: {
    server: process.env.NTFY_SERVER || 'https://ntfy.sh',
    topic: process.env.NTFY_TOPIC || 'fbf-rd-council',
    enabled: !!process.env.NTFY_TOPIC,
  },

  // Per-seat model assignment.
  // engine.mjs reads via CONFIG.models[i % CONFIG.models.length] for rotation.
  // Single workhorse for all 26 seats — same Ollama model everywhere.
  // Tier B/C diversity routing is a future iteration; see spec §3.
  models: new Array(26).fill({ provider: 'ollama', model: ollamaModel }),
};
