// Chamado uma vez por dia pelo cron da Vercel (painel/vercel.json).
// Uma consulta leve evita que o Supabase gratuito pause o projeto por inatividade.
var lib = require("./_lib");

module.exports = async function handler(req, res) {
  try {
    await lib.supabase("confirmacoes?select=id&limit=1");
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false });
  }
};
