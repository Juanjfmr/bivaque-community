# Red Team de Produto — acervo de evidência

> **Isto é evidência, não fonte de decisão.** Os 151 achados aqui carregam a citação
> arquivo:linha que sustenta o estado descrito em
> [`../PRODUCT_STATUS.md`](../PRODUCT_STATUS.md). As decisões que saíram desta auditoria
> vivem em [`../BIVAQUE.md`](../BIVAQUE.md) §9 — não nestes arquivos.
>
> **Não leia isto para saber o que o produto deve ser.** Vários vereditos aqui foram
> revertidos depois: Comunidades foi congelada e descongelada, Vitrine foi adiada e trazida
> para o piloto, o perfil oculto era conflito e virou remoção. O registro de reversões está
> em `BIVAQUE.md` §9.1.
>
> **Data da varredura: 2026-08-10.** Nada foi reconferido linha a linha depois disso.
> Reconfirmar a citação antes de abrir PR em cima dela.

Auditoria de **coerência produto × backend**, rota por rota e fluxo por fluxo.
Não é auditoria técnica de bugs: o objetivo é encontrar lugares onde a UI
promete o que o backend não garante, onde o backend permite o que a UI esconde,
e onde uma feature não merece existir.

Escopo acordado: **~70 cenários RT em 15 domínios**, terminando em uma
arquitetura de produto revisada — o que permanece, o que muda, o que
desaparece, e quais decisões voltam para o dono do produto.

## Rubrica fixa (10 dimensões por fluxo)

| Dimensão | Pergunta |
|---|---|
| Necessidade | Esse fluxo precisa existir? |
| Modelo mental | Usuário entende o que está acontecendo? |
| Coerência | UI, copy, backend e política dizem a mesma coisa? |
| Happy path | Funciona da forma mais simples possível? |
| Sad paths | Falhas têm saída? |
| Permissões | Quem não deveria conseguir fazer isso consegue? |
| Privacidade | Alguma informação aparece além do esperado? |
| Abuso | Como um usuário malicioso explora isso? |
| Operação | Isso gera trabalho manual escondido? |
| Valor | Depois de concluir, algo útil realmente aconteceu? |

## Veredictos

**KEEP · MODIFY · REMOVE · MERGE · SPLIT · UNPROVEN**

REMOVE/MERGE/SPLIT existem porque a feature pode não merecer continuar
existindo. UNPROVEN marca o que não tem evidência suficiente para decidir.

## Baldes (obrigatório separar)

- **Balde A — correção inequívoca.** Affordance fraud com resposta óbvia,
  copy factualmente errada, botão morto cujo destino já existe. O agente
  fecha sozinho; não há decisão de produto em jogo.
- **Balde B — decisão do dono do produto.** REMOVE/MERGE/SPLIT, conflitos
  semânticos (ex.: "oculto" × exposição a co-membros), tradeoffs de copy de
  marca, exposição de capacidade que o banco já suporta. O agente recomenda;
  quem decide é o dono. `AGENTS.md` proíbe agente de tomar decisão de produto.

## Severidade (vocabulário do MAP §2.2)

- **P0** — bloqueia uso de outra área ou cria risco direto de
  segurança/privacidade; exige decisão antes de operar com membros
  não-técnicos.
- **P1** — degrada visivelmente, ou expõe incompletude na primeira sessão.
- **P2** — refinamento; só aparece em uso prolongado.

## Fases

1. **Fase 0 — Camada 0 (contratos globais).** Extraídos das
   `supabase/migrations/*.sql` — a régua contra a qual cada RT é medido.
   Contrato = o que o banco impõe, com citação migration:linha.
2. **Fase 1 — Findings-âncora.** Validação das inconsistências já apontadas
   no briefing, com evidência arquivo:linha. → [`lote-1-ancoras.md`](lote-1-ancoras.md)
3. **Fase 2 — Varredura dos ~70 RT por domínio**, comparando cada fluxo
   contra a Camada 0.

## Registro de correções

Claims do briefing invalidados pela evidência ficam registrados aqui — um Red
Team que esconde as próprias premissas erradas não é confiável.

| # | Claim do briefing | Realidade verificada |
|---|---|---|
| X1 | "O login apresenta campo de senha" | Não existe campo de senha. Login é e-mail + magic link; Google é secundário. As affordances falsas são o checkbox "Manter conectado" e o link "Esqueci minha senha" (`login/components/bivaque-sign-in.tsx:229-259`). |
| X2 | "Aba Convidado de Eventos promete feature inexistente; código retorna lista vazia" | O mecanismo **existe**: migration `20260806171204_event_invites.sql` + RLS + UI de aceitar/recusar (`events/event-invites-section.tsx:26-120`). O comentário "No invite mechanism exists yet" em `events/page.tsx:334` está **desatualizado**. Resíduo real: sem fan-out de notificação; caminho de envio pelo organizador em verificação. |
| X3 | "A própria tela [de CPF] afirma que nenhum dado sensível é armazenado" | A promessa explícita está na tela imediatamente anterior, `/consent` (`consent/page.tsx:47-49`), não no passo do CPF. A contradição permanece — é o mesmo fluxo — mas a localização exata importa para o fix. |

## Board de progresso

| Domínio | Cenários | Estado |
|---|---|---|
| Camada 0 — contratos globais | — | ✅ [`camada-0-contratos.md`](camada-0-contratos.md) |
| Entrada (login, callback, consent) | RT-01..03 | ✅ [`lote-1-ancoras.md`](lote-1-ancoras.md) + [`lote-2-onboarding.md`](lote-2-onboarding.md) |
| Onboarding (CPF, pending, rejected, waitlist, família, welcome) | RT-04..09 | ✅ [`lote-2-onboarding.md`](lote-2-onboarding.md) |
| Shell | affordances | âncoras validadas |
| Home/Feed | RT-10 | ✅ [`lote-2-feed.md`](lote-2-feed.md) |
| Publicação | RT-11 | ✅ [`lote-2-feed.md`](lote-2-feed.md) |
| Grupos | RT-12..16 | ✅ [`lote-2-grupos.md`](lote-2-grupos.md) |
| Comunidades | RT-17..23 | ✅ [`lote-2-comunidades.md`](lote-2-comunidades.md) |
| Eventos | RT-24..30 | ✅ [`lote-2-eventos.md`](lote-2-eventos.md) |
| Mensagens | RT-31..37 | ✅ [`lote-2-mensagens.md`](lote-2-mensagens.md) |
| Notificações | RT-38..42 | ✅ [`lote-2-notificacoes.md`](lote-2-notificacoes.md) |
| Indicações | RT-43..47 | ✅ [`lote-2-indicacoes.md`](lote-2-indicacoes.md) |
| Perfil | RT-48..57 | ✅ [`lote-2-perfil.md`](lote-2-perfil.md) |
| Denúncia/moderação | RT-58..65 | ✅ [`lote-2-moderacao.md`](lote-2-moderacao.md) |
| Admin | RT-66..70 | ✅ [`lote-2-admin.md`](lote-2-admin.md) |

## Arquivos

- [`camada-0-contratos.md`](camada-0-contratos.md) — a régua (Fase 0).
- [`lote-1-ancoras.md`](lote-1-ancoras.md) — primeiro lote validado (Fase 1).
- [`lote-2-onboarding.md`](lote-2-onboarding.md) — RT-02, RT-04..09.
- [`lote-2-feed.md`](lote-2-feed.md) — RT-10..11.
- [`lote-2-perfil.md`](lote-2-perfil.md) — RT-48..57.
- [`lote-2-grupos.md`](lote-2-grupos.md) — RT-12..16.
- [`lote-2-comunidades.md`](lote-2-comunidades.md) — RT-17..23.
- [`lote-2-eventos.md`](lote-2-eventos.md) — RT-24..30.
- [`lote-2-mensagens.md`](lote-2-mensagens.md) — RT-31..37.
- [`lote-2-notificacoes.md`](lote-2-notificacoes.md) — RT-38..42.
- [`lote-2-indicacoes.md`](lote-2-indicacoes.md) — RT-43..47.
- [`lote-2-moderacao.md`](lote-2-moderacao.md) — RT-58..65.
- [`lote-2-admin.md`](lote-2-admin.md) — RT-66..70.
- [`sintese-fase-2.md`](sintese-fase-2.md) — consolidação executiva e arquitetura recomendada.
