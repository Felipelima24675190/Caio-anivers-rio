// Recebe a confirmação de presença do formulário e grava no Supabase.
// Variáveis de ambiente (configuradas na Vercel, nunca no repositório):
//   SUPABASE_URL               ex.: https://xxxx.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY  chave "service_role" do projeto

function limpa(v) {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "";
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ erro: "Método não permitido." });
  }

  var b = req.body;
  if (typeof b === "string") {
    try { b = JSON.parse(b); } catch (e) { b = null; }
  }
  if (!b || typeof b !== "object") return res.status(400).json({ erro: "Dados inválidos." });

  // Honeypot: robôs preenchem o campo escondido. Finge sucesso e não grava.
  if (limpa(b.site)) return res.status(200).json({ ok: true });

  var nome = limpa(b.nome);
  var vai = b.status === "sim" ? true : b.status === "nao" ? false : null;
  var quantidade = Number(b.quantidade);
  var acompanhante = limpa(b.acompanhante) || null;

  if (nome.length < 3 || nome.length > 80) return res.status(400).json({ erro: "Nome inválido." });
  if (vai === null) return res.status(400).json({ erro: "Escolha se vai participar." });
  if (!vai) { quantidade = 0; acompanhante = null; }
  else if (quantidade !== 1 && quantidade !== 2) return res.status(400).json({ erro: "No máximo um acompanhante." });
  if (vai && quantidade === 1) acompanhante = null;
  if (vai && quantidade === 2 && !acompanhante) return res.status(400).json({ erro: "Falta o nome do acompanhante." });
  if (acompanhante && acompanhante.length > 80) return res.status(400).json({ erro: "Nome do acompanhante muito longo." });

  var url = process.env.SUPABASE_URL;
  var chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) {
    console.error("SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configuradas");
    return res.status(500).json({ erro: "Servidor não configurado." });
  }

  try {
    var r = await fetch(url.replace(/\/$/, "") + "/rest/v1/confirmacoes", {
      method: "POST",
      headers: {
        apikey: chave,
        Authorization: "Bearer " + chave,
        "Content-Type": "application/json",
        Prefer: "return=minimal"
      },
      body: JSON.stringify({ nome: nome, vai: vai, quantidade: quantidade, acompanhante: acompanhante })
    });
    if (!r.ok) {
      console.error("Supabase respondeu", r.status, await r.text());
      return res.status(502).json({ erro: "Não foi possível registrar." });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("Falha ao falar com o Supabase", e);
    return res.status(502).json({ erro: "Não foi possível registrar." });
  }
};
