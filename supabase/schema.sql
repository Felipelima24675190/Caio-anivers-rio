-- Tabela das confirmações de presença (RSVP) do aniversário.
-- Rode uma vez no SQL Editor do Supabase.
create table if not exists public.confirmacoes (
  id           bigint generated always as identity primary key,
  criado_em    timestamptz not null default now(),
  nome         text not null check (char_length(nome) between 3 and 80),
  vai          boolean not null,
  quantidade   smallint not null check (quantidade between 0 and 2),
  acompanhante text check (acompanhante is null or char_length(acompanhante) between 1 and 80),
  -- Quem não vai conta 0; quem vai conta 1 (só a pessoa) ou 2 (com um acompanhante, que precisa ter nome).
  constraint quantidade_coerente check (
    (not vai and quantidade = 0 and acompanhante is null) or
    (vai and quantidade = 1 and acompanhante is null) or
    (vai and quantidade = 2 and acompanhante is not null)
  )
);

-- RLS ligado e nenhuma política: o navegador (chave anon) não lê nem grava.
-- Só a função /api/confirmar, com a service role key, grava aqui.
alter table public.confirmacoes enable row level security;

-- O site diz "se mudar de ideia, é só responder de novo com o mesmo nome",
-- então vale a resposta mais recente de cada nome.
create or replace view public.confirmacoes_atuais
with (security_invoker = true) as
select distinct on (lower(nome)) *
from public.confirmacoes
order by lower(nome), criado_em desc;

-- Totais para acompanhar pelo painel.
create or replace view public.confirmacoes_resumo
with (security_invoker = true) as
select
  count(*) filter (where vai)      as respostas_sim,
  count(*) filter (where not vai)  as respostas_nao,
  coalesce(sum(quantidade), 0)     as total_pessoas
from public.confirmacoes_atuais;
