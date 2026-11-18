# ADR-20261116 — perfil no app: transferência de cidade e afiliação privada

- Status: Aceito por delegação — aguarda ratificação do dono (16/11/2026, lote RUN-170/F10)
- Decisor: agente coordenador (mandato de 02/11); revisão independente e parecer de segurança registrados no card no fechamento
- Lotes afetados: F10 (troca do /profile próprio + editar), fase 6

## Contexto

`/profile` e `/profile/editar` ainda servem tela de membro na web (fase 6 não fecha com isso). A
troca não é redirect puro: a web carrega dois recursos aprovados que o app não tem — a
**transferência de cidade** (decisão do dono em 25/09, ADR-20260925: "a cidade muda pelo perfil",
padrão 30 dias, teto 180; RPC `declare_locality_transfer` existente, grant `authenticated`,
constraints no banco) e a **autodeclaração Força/OM** (ADR-20260908 D2: opcionais, desligadas por
padrão). Matar a tela sem destino mataria produto aprovado; o mandato manda o agente portar.

O toggle **"Exibir Força/OM a outros"** do editar web nunca teve consumidor legítimo no produto
atual: expor Força/OM a outros membros está fora de escopo (BLOCK-AFFILIATION no AGENTS; perfil
alheio do app o proíbe por contrato), e a tela alheia da web já saiu (RUN-163). A **foto de
avatar** só tem porta de upload dentro de `/profile/editar`; o app é iniciais por régua e nada na
linha F10 pede foto.

## Decisão

1. Transferência portada ao app **sem migration**: `POST /api/app/voce/cidade` chama o RPC
   existente com o cliente da sessão; validação é o módulo compartilhado `lib/locality/move-city.ts`
   (a mesma que a action web chama); UI no Você com estado "de saída até <data>" e bloqueio
   enquanto houver `leaving`. Não se porta "desfazer" — não existe como produto em lugar nenhum
   (`reverse_locality_transfer` permanece hatch de suporte, service_role).
2. Afiliação portada **privada por construção**: `GET/PUT /api/app/voce/afiliacao` gravam
   `is_visible = false` sempre; a pessoa lê e apaga as próprias linhas (RLS de dono). O **toggle
   "Exibir" é aposentado** com a tela web — nenhuma outra pessoa nunca viu esses dados pelo app, e
   remover o toggle remove a única porta que podia ligar a visibilidade. Se o dono quiser
   visibilidade no futuro, é decisão nova com consumidores novos.
3. A porta de **upload de foto** morre com a tela; leitura dos objetos existentes continua intacta
   nos consumidores web (feed, comunidade, `/api/avatar/*`) e bucket/rota não são tocados. Card
   pós-lançamento registra a volta da foto ao app.

## Consequências

- O CTA "Vou me mudar para cá" (consulta de cidade, e o `/profile?mudar=` do city-switcher) passa a
  pousar em `/app/voce?mudar=<id>`, que o Você lê e pré-seleciona o destino — a query sobrevive ao
  307 da troca (Lote B), que só roda depois deste lote pousar.
- A troca real (`/profile`+`/editar` → `/app/voce`, remoção das telas e dos ~20 pins) é o Lote B,
  destravado por este lote e pelo #246.
- Editar Força/OM pelo app zera a visibilidade da linha mesmo que a web a tenha deixado visível —
  mudança na direção de *menos* exposição, aceitável porque o toggle "Exibir" morre com a tela no
  Lote B e nenhum outro membro jamais consumiu esses campos (BLOCK-AFFILIATION).
- A RATIFICAÇÃO ganha esta linha; a emenda ao contrato de privacidade (toggle aposentado) é o item
  que o dono ratifica ou reverte no marco.

## Emenda de 16/11/2026 (SEC-014, auditoria independente de 16/11)

A auditoria do `security-auditor` sobre `2bb231d8` (escopo 2 do lote 2b) achou duas lacunas
pré-existentes que este ADR precisa cobrir, porque é ele que declara a afiliação privada e a
transferência portada:

1. **A1 (MEDIUM) — `public.profile_affiliations_for` segue chamável pela Data API.** A função é
   SECURITY DEFINER com `execute` para `authenticated`: qualquer membro da mesma cidade lê, por alvo,
   as linhas `is_visible = true` que o titular marcou no período do toggle web (09/09 a 16/11). A
   decisão deste ADR é que exibir Força/OM a terceiros está fora do lançamento, então a porta fecha:
   migration `20261116224929` revoga `execute` de `public`, `anon` e `authenticated`, sem tocar em
   linha nenhuma nem em `is_visible`. **Reabrir é decisão do BLOCK-AFFILIATION** (governança LGPD de
   terceiros), com `grant execute to authenticated` — não é decisão de tela, e a função fica de pé
   com corpo e vetos intactos para esse dia.
2. **A2 (LOW) — `declare_locality_transfer` não vetava estado de conta.** Suspensa (token válido por
   até 1h) ou com exclusão pedida, a pessoa declarava a transferência e ganhava vínculo `current` na
   cidade de destino. Migration `20261116224936` acrescenta os dois vetos em
   `private.account_unavailable` — o mesmo predicado da RPC de afiliação, que também respeita
   suspensão vencida — recusando com `42501` e a frase segura que a porta já usa (`sessao-expirada`
   em `lib/locality/move-city.ts`, a mesma da porta de afiliação). A regra de quem pode se transferir
   para qual cidade e a atomicidade da função não mudam.

Prova: pgTAP `profile-affiliations.sql` (42501 para `authenticated` e `anon`; os vetos de conteúdo
seguem asseridos como dono da função) e `locality-transfer.sql` (os dois negativos novos + os
positivos de antes), com o unitário da rota para o mapeamento sem eco. A evidência de banco só roda
em CI (`ci:full`).
