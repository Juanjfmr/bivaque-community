# Auditoria visual — onda T (transferência)

Run: `.visual/2026-08-20T07-14-02-383Z/` (após duas iterações de correção — ver
`.visual/2026-08-20T07-05-04-680Z/` e `.visual/2026-08-20T07-10-22-370Z/` para o antes).

Telas tocadas pela onda: `/localidade` (novo, T4), `/arrivals` (novo, T5). A fila de aprovação
(`/communities/[id]/admin/pending`, T5) já estava na rota da onda E e não muda de forma visual —
só ganhou o texto do sinal de chegada, coberto pelo pgTAP (`supabase/tests/declared-arrivals.sql`),
não pela captura visual (a rota exige um `communityId` real que o script de captura não parametriza).

## Veredito: **high = 0**

Achado real, não de T: a primeira captura (`2026-08-20T07-05-04-680Z`) trouxe **228 achados high**
em quase toda tela autenticada — `/localidade` incluído, porque a página renderiza
`<CityReference />` (componente da onda E) para quem não tem transferência declarada, e
`CityReference` tinha dois `<a>` sem `min-h-11`: o link de cada evento na lista "Próximos eventos
da cidade" e o CTA "Ver todos os eventos". Corrigido em `city-reference.tsx` — o link do evento
agora envolve a linha inteira (data + título), não só o título truncado, o que também melhora o
alvo de toque sem regra nova nenhuma. Efeito colateral: como `CityReference` é renderizado em
`/`, `/onboarding` (redirecionam pra `/community`), `/arrivals` (redireciona quando o operador não
é autenticado como operador) e agora `/localidade`, a correção zerou o achado em toda essa
superfície de uma vez — não é um conserto de seis telas, é um conserto de um componente.

- `/localidade` @ 375/768/1440 — **clean**
- `/arrivals` @ 375/768/1440 — **clean** (redireciona pra `/community` porque a conta de captura
  não é operadora; é o comportamento correto do gate, não um achado)

## O que não foi capturado

O switcher (as duas abas "cidade atual" / "\<origem\> (saindo)") só aparece pra uma conta com
transferência declarada — a conta padrão de captura (`visual@`) não tem. `tests/e2e/transfer-switch.spec.ts`
cobre esse estado via a conta dedicada do seed (`membro-transferencia@`) e passou limpo nos 3
viewports na execução de 2026-08-20 (ver `docs/PRODUCT_STATUS.md` "O que não foi verificado").
