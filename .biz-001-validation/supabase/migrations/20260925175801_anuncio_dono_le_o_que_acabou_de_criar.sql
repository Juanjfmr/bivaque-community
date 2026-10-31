-- Publicar anúncio falhava com "new row violates row-level security policy".
--
-- As telas criam o anúncio com INSERT … RETURNING id (`.insert().select("id")`
-- no Mercado e em Imóveis). O RETURNING passa pela policy de SELECT, que era só
-- `private.can_read_listing(id)` — uma função STABLE que procura o anúncio na
-- tabela pelo id. Dentro do mesmo comando, a linha recém-inserida não está no
-- snapshot da função: ela não encontra o anúncio, devolve false e o Postgres
-- recusa o RETURNING. O INSERT sozinho passava, e os testes de banco só
-- faziam INSERT sem RETURNING — por isso ninguém viu. Achado na prova de
-- runtime de 25/09/2026 (anunciar no Mercado pela tela).
--
-- Correção: o dono lê a própria linha pela COLUNA da linha, sem consulta
-- (`owner_user_id = auth.uid()`), o que vale também no RETURNING. Os demais
-- casos continuam na porta única. O nome da policy é o mesmo (os guardas de
-- regressão contam por nome), e nada de acesso novo: a função já liberava o
-- dono.

drop policy listings_select_scoped on public.listings;

create policy listings_select_scoped
on public.listings
for select
to authenticated
using (
  owner_user_id = (select auth.uid())
  or private.can_read_listing(id)
);
