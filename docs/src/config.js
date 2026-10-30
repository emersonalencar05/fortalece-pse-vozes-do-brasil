// A fonte de verdade é ../config.js, usada também pelo painel admin.
// Em produção não há segredos aqui: apenas chaves publishable/anon próprias para clientes.
const publicConfig = window.FPSE_CONFIG || {};
export const CONFIG = Object.freeze({
  supabaseUrl: String(publicConfig.supabaseUrl || '').replace(/\/$/, ''),
  publishableKey: String(publicConfig.publishableKey || ''),
  refreshMs: 5 * 60 * 1000,
  kioskIdleMs: 90 * 1000,
});
