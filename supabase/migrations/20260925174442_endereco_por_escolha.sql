-- Endereço por escolha de quem publica (decisão do dono, 25/09/2026: "O
-- Bivaque não tem que limitar a escolha do usuário. Se ele quiser divulgar o
-- endereço, a liberdade é dele, assim como em eventos").
--
-- 1. Anúncio (Mercado e Imóveis) ganha `address`, OPCIONAL. Quem anuncia
--    decide se informa; quando informa, ele é lido por quem lê o anúncio (a
--    mesma porta `private.can_read_listing`, nada novo de acesso). O bairro
--    continua obrigatório no Mercado e continua sendo só bairro.
--    Revoga, para o anúncio, a regra "cidade e bairro, nunca endereço" do
--    ADR-20260909-anuncios-mercado-e-moradia (D5).
--
-- 2. O local do encontro (`events.venue`) deixa de recusar endereço e
--    instalação militar: "Rua", "Avenida", "Condomínio", "Quartel",
--    "Batalhão" passam. Na mesma sessão o dono completou: "São localizações
--    que são encontradas no Google. Não há por que essa super proteção." Fica
--    só o limite de tamanho, que antes vivia apenas no contrato da aplicação.
--
-- O que NÃO muda: o perfil do membro nunca guarda endereço residencial
-- (AGENTS.md); o endereço aqui é de um anúncio ou de um encontro, publicado
-- por decisão de quem publica.

alter table public.listings
  add column address text;

alter table public.listings
  add constraint listings_address_check
  check (address is null or char_length(address) between 3 and 200);

comment on column public.listings.address is
  'Endereço opcional, publicado por escolha de quem anuncia. Lido por quem lê o anúncio.';

alter table public.events
  drop constraint events_venue_check;

alter table public.events
  add constraint events_venue_check
  check (venue is null or char_length(venue) <= 200);
