// Entrega as confirmações em CSV para a planilha (Google Planilhas, via IMPORTDATA).
// Protegido por token: /api/relatorio?token=...
// Variáveis de ambiente (configuradas na Vercel, nunca no repositório):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (as mesmas do /api/confirmar)
//   RELATORIO_TOKEN                          texto aleatório que libera o acesso

var crypto = require("crypto");

function tokenValido(recebido, esperado) {
  if (!recebido || !esperado) return false;
  var a = Buffer.from(String(recebido)), b = Buffer.from(String(esperado));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Aspas em todo texto; evita que um nome começando com = + - @ vire fórmula na planilha.
function celula(v) {
  if (typeof v === "number") return String(v);
  var s = v == null ? "" : String(v);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}

var formatoData = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit", month: "2-digit", year: "numeric",
  hour: "2-digit", minute: "2-digit"
});

module.exports = async function handler(req, res) {
  if (!tokenValido(req.query && req.query.token, process.env.RELATORIO_TOKEN)) {
    return res.status(401).send("Acesso negado.");
  }

  var url = process.env.SUPABASE_URL;
  var chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) return res.status(500).send("Servidor não configurado.");
  var base = url.trim().replace(/\/+$/, "").replace(/\/rest\/v1$/, "");

  try {
    // Última resposta de cada nome (view confirmacoes_atuais), da mais antiga para a mais nova.
    var r = await fetch(base + "/rest/v1/confirmacoes_atuais?select=criado_em,nome,vai,quantidade,acompanhante&order=criado_em.asc", {
      headers: { apikey: chave, Authorization: "Bearer " + chave }
    });
    if (!r.ok) {
      console.error("Supabase respondeu", r.status, await r.text());
      return res.status(502).send("Não foi possível ler as confirmações.");
    }
    var linhas = await r.json();

    var acumulado = 0;
    var csv = [["Data e hora", "Nome", "Status", "Participantes", "Acompanhante", "Total de pessoas confirmadas"].map(celula).join(",")];
    linhas.forEach(function (l) {
      acumulado += l.quantidade || 0;
      csv.push([
        formatoData.format(new Date(l.criado_em)).replace(",", ""),
        l.nome,
        l.vai ? "Confirmado" : "Não vai",
        l.quantidade,
        l.acompanhante || "",
        acumulado
      ].map(celula).join(","));
    });

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(csv.join("\n") + "\n");
  } catch (e) {
    console.error("Falha ao ler o Supabase", e);
    return res.status(502).send("Não foi possível ler as confirmações.");
  }
};
