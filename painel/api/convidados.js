// API do painel: listar, adicionar, editar e remover convidados.
// Sem senha, a pedido: o endereço do painel não é divulgado no convite.
var lib = require("./_lib");

// IDs de todas as respostas com o mesmo nome (sem diferenciar maiúsculas),
// para que editar ou remover não deixe uma resposta antiga "reaparecer".
async function idsDoMesmoNome(nome) {
  var todas = await lib.supabase("confirmacoes?select=id,nome");
  var alvo = nome.toLowerCase();
  return todas.filter(function (l) { return l.nome.toLowerCase() === alvo; }).map(function (l) { return l.id; });
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  var b = req.body;
  if (typeof b === "string") { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  b = b || {};
  var id = Number(req.query.id);

  try {
    if (req.method === "GET") {
      var lista = await lib.supabase("confirmacoes_atuais?select=id,criado_em,nome,vai,quantidade,acompanhante&order=criado_em.desc");
      return res.status(200).json({ convidados: lista });
    }

    if (req.method === "POST") {
      var v = lib.valida(b);
      if (v.erro) return res.status(400).json({ erro: v.erro });
      await lib.supabase("confirmacoes", { method: "POST", body: v.dados, headers: { Prefer: "return=minimal" } });
      return res.status(200).json({ ok: true });
    }

    if (req.method === "PATCH" || req.method === "DELETE") {
      if (!id) return res.status(400).json({ erro: "Convidado não informado." });
      var atual = await lib.supabase("confirmacoes?select=id,nome&id=eq." + id);
      if (!atual.length) return res.status(404).json({ erro: "Convidado não encontrado." });
      var antigos = (await idsDoMesmoNome(atual[0].nome)).filter(function (x) { return x !== id; });

      if (req.method === "PATCH") {
        var e = lib.valida(b);
        if (e.erro) return res.status(400).json({ erro: e.erro });
        await lib.supabase("confirmacoes?id=eq." + id, { method: "PATCH", body: e.dados, headers: { Prefer: "return=minimal" } });
      } else {
        antigos.push(id);
      }
      if (antigos.length) {
        await lib.supabase("confirmacoes?id=in.(" + antigos.join(",") + ")", { method: "DELETE", headers: { Prefer: "return=minimal" } });
      }
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", "GET, POST, PATCH, DELETE");
    return res.status(405).json({ erro: "Método não permitido." });
  } catch (err) {
    console.error(err);
    return res.status(502).json({ erro: "Não foi possível falar com o banco agora." });
  }
};
