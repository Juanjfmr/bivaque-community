-- RUN-017 (4/4): quem sugeriu um verbete não sai pela Data API.
--
-- authenticated tem SELECT na tabela inteira de arrival_guide_entries
-- (20260815181708) e submitted_by (20260915210000) fica legível nas entradas
-- aprovadas, que são justamente as visíveis. O autor da sugestão é dado de
-- moderação: só o operador precisa dele, e o operador lê por service_role.
--
-- Grant por coluna, sem submitted_by. As duas leituras do app que pediam * —
-- /guide e /guide/[id] — passam a listar as colunas do cartão; `select *`
-- deixaria de funcionar com grant por coluna e quebraria a página.
-- A forma da tabela não muda: os tipos gerados continuam válidos.

revoke select on table public.arrival_guide_entries from authenticated;

grant select (
  id,
  locality_id,
  category,
  name,
  description,
  website_url,
  phone,
  created_at,
  updated_at,
  status,
  source,
  confidence,
  source_reply_id,
  review_note,
  reviewed_at,
  reviewed_by
) on table public.arrival_guide_entries to authenticated;
