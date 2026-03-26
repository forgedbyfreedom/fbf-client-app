// ============================================================
// AI R&D Council — Configuration
// ============================================================

export const CONFIG = {
  // Delivery
  recipients: [
    { name: 'Bryan Antonelli', email: 'forgedbyfreedom@proton.me', phone: '+17757418213' },
    { name: 'Wendy Antonelli', email: 'wantonelli2@comcast.net', phone: '+17757418209' },
  ],

  // Twilio (FBF account)
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    from: '+18035906669',
  },

  // Email (uses Gmail SMTP or any SMTP — configure in .env)
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
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

  // ntfy push notifications (ntfy.sh app)
  // Install ntfy app on your phone, subscribe to your topic
  ntfy: {
    server: process.env.NTFY_SERVER || 'https://ntfy.sh',
    topic: process.env.NTFY_TOPIC || 'fbf-rd-council',
  },

  // OpenAI
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
  },

  // Models to use for council members (rotate through these for diversity)
  // 24 members — cycle through all available models for maximum perspective diversity
  models: [
    { provider: 'openai', model: 'gpt-4o' },
    { provider: 'openai', model: 'gpt-4.1' },
    { provider: 'openai', model: 'gpt-4o-mini' },
    { provider: 'openai', model: 'gpt-4.1-mini' },
    { provider: 'openai', model: 'gpt-4.1-nano' },
    { provider: 'openai', model: 'o4-mini' },
    { provider: 'openai', model: 'gpt-4o' },
    { provider: 'openai', model: 'gpt-4.1' },
    { provider: 'openai', model: 'gpt-4o-mini' },
    { provider: 'openai', model: 'gpt-4.1-mini' },
    { provider: 'openai', model: 'gpt-4.1-nano' },
    { provider: 'openai', model: 'o4-mini' },
    { provider: 'openai', model: 'gpt-4o' },
    { provider: 'openai', model: 'gpt-4.1' },
    { provider: 'openai', model: 'gpt-4o-mini' },
    { provider: 'openai', model: 'gpt-4.1-mini' },
    { provider: 'openai', model: 'gpt-4.1-nano' },
    { provider: 'openai', model: 'o4-mini' },
    { provider: 'openai', model: 'gpt-4o' },
    { provider: 'openai', model: 'gpt-4.1' },
    { provider: 'openai', model: 'gpt-4o-mini' },
    { provider: 'openai', model: 'gpt-4.1-mini' },
    { provider: 'openai', model: 'gpt-4.1-nano' },
    { provider: 'openai', model: 'o4-mini' },
    { provider: 'openai', model: 'gpt-4o' },
  ],
};
