// Utilidades do painel. Arquivos com "_" na pasta api não viram endpoints na Vercel.
function limpa(v) {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "";
}

// Mesmas regras do formulário do convite: no máximo um acompanhante.
function valida(b) {
  var nome = limpa(b.nome);
  var vai = b.status === "sim" ? true : b.status === "nao" ? false : null;
  var quantidade = Number(b.quantidade);
  var acompanhante = limpa(b.acompanhante) || null;
  if (nome.length < 3 || nome.length > 80) return { erro: "O nome precisa ter entre 3 e 80 letras." };
  if (vai === null) return { erro: "Escolha se a pessoa vai ou não." };
  if (!vai) { quantidade = 0; acompanhante = null; }
  else if (quantidade !== 1 && quantidade !== 2) return { erro: "No máximo um acompanhante." };
  if (vai && quantidade === 1) acompanhante = null;
  if (vai && quantidade === 2 && !acompanhante) return { erro: "Falta o nome do acompanhante." };
  if (acompanhante && acompanhante.length > 80) return { erro: "Nome do acompanhante muito longo." };
  return { dados: { nome: nome, vai: vai, quantidade: quantidade, acompanhante: acompanhante } };
}

// Chamada à API REST do Supabase com a service role key.
async function supabase(caminho, opcoes) {
  var url = (process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "").replace(/\/rest\/v1$/, "");
  var chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) throw new Error("SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configuradas");
  opcoes = opcoes || {};
  var r = await fetch(url + "/rest/v1/" + caminho, {
    method: opcoes.method || "GET",
    headers: Object.assign({
      apikey: chave,
      Authorization: "Bearer " + chave,
      "Content-Type": "application/json"
    }, opcoes.headers || {}),
    body: opcoes.body ? JSON.stringify(opcoes.body) : undefined
  });
  var texto = await r.text();
  if (!r.ok) throw new Error("Supabase respondeu " + r.status + " " + texto);
  return texto ? JSON.parse(texto) : null;
}

module.exports = { valida: valida, supabase: supabase };
