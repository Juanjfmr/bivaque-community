# Inventário de documentos e regras — o que é legado

Data: 23/10/2026 · Branch: `codex/inventario-legado` · Base confrontada: `56e048d4`
Escopo: `docs/**`, `AGENTS.md`, `CLAUDE.md`, `.claude/**`, `.opencode/**`, `.mcp.json`.
Tarefa: INV-001. Este documento **só levanta e classifica**; nada foi editado, movido ou apagado.

## 0. Método e régua

Classificação relativa à autoridade de outubro/2026, registrada no próprio repositório:

- **O protótipo `prototypes/bivaque-html/` é a especificação do produto** (opção A, dono, 19/10/2026):
  `docs/agents/HANDOFF-COORDENACAO-2026-10-22.md:104`.
- **Não existe "vila"** (tabela `communities`, "Comunidades" no plural): `docs/decisions/ADR-20261023-comunidade-do-prototipo.md:30-31,75`.
- **Não existe publicação/feed para a cidade inteira**: na cidade só há perguntas e respostas; publicar só dentro de grupo (`ADR-20261023:78-84`).
- **Navegação**: Início / Comunidade / Conversas / Você (`prototypes/bivaque-html/src/shell/navigation.js:4,47`).
- **Porte visual**: Material Web 2.5.0, Noto, tokens R70; o HeroUI sai tela a tela (`ADR-20261022-porte-visual-material-web`).
- **Localização no padrão de mercado**; entrada por conta→aceite→CPF→resultado→cidade e momento→boas-vindas (`ADR-20261022-localizacao-padrao-de-mercado`, `ADR-20261022-entrada-do-prototipo`).
- **Lançamento sem cobrança** (`HANDOFF-COORDENACAO-2026-10-22.md:94`).
- **Plano corrente** em lotes 0–9: `docs/AUDITORIA_ADERENCIA_2026-10-19.md`, seção 6.

Classes (uma por arquivo):

- **VIGENTE** — regra ou referência que vale hoje e não contradiz o protótipo.
- **LEGADO** — regra/decisão que não vale mais: contradiz o protótipo; foi substituída por decisão posterior; trata de vila, feed da cidade, navegação antiga, pranchas ou Figma como especificação; ou trata de processo/ferramenta abandonada.
- **HISTÓRICO** — registro datado (auditoria, handoff, postmortem, evidência, contrato fechado). Não é regra.
- **INCERTO** — não foi possível decidir com evidência; a seção 3 diz o que falta.

Na dúvida entre VIGENTE e LEGADO, foi marcado INCERTO. Conjuntos homogêneos de imagens foram agrupados numa linha com a contagem explícita; todo arquivo de texto (`.md`, `.html`, `.json`, `.css`, `.toml`, `.txt`, `.sh`, `.mjs`) aparece individualmente.

---

## 1. Tabela — arquivo, classe, motivo, evidência, substituído por

### 1.1 `docs/decisions/` (52 arquivos)

| arquivo | classe | motivo | evidência (arquivo:linha) | substituído por |
|---|---|---|---|---|
| docs/decisions/ADR-20261023-comunidade-do-prototipo.md | VIGENTE | Autoridade corrente da Comunidade e grupos; declara a vila fora | ADR-20261023:62 | — |
| docs/decisions/ADR-20261022-entrada-do-prototipo.md | VIGENTE | Entrada segue o protótipo | ADR-20261022-entrada-do-prototipo.md:38 | — |
| docs/decisions/ADR-20261022-porte-visual-material-web.md | VIGENTE | Porte para Material Web 2.5.0 | ADR-20261022-porte-visual-material-web.md:35 | — |
| docs/decisions/ADR-20261022-localizacao-padrao-de-mercado.md | VIGENTE | CEP e coordenada no padrão de mercado | ADR-20261022-localizacao-padrao-de-mercado.md:33 | — |
| docs/decisions/ADR-20261022-fundacao-dados-bairros-ocultar-chamados.md | VIGENTE (parcial) | Bairros, ocultar e chamados válidos; §1.4–1.5 superados | ADR-20261022-fundacao-dados-bairros-ocultar-chamados.md:59 | ─ (ver §2) |
| docs/decisions/ADR-20261020-identidade-visual-e-tema-escuro.md | VIGENTE (parcial) | Tema claro/escuro e tokens válidos; §1 pele superada nas telas portadas | ADR-20261020-identidade-visual-e-tema-escuro.md:45 | ─ (ver §2) |
| docs/decisions/ADR-20261019-correcoes-de-seguranca-pre-lancamento.md | VIGENTE | Cinco correções de privacidade pré-lançamento | ADR-20261019-correcoes-de-seguranca-pre-lancamento.md:33 | — |
| docs/decisions/ADR-20261016-mapa-de-bairros.md | LEGADO (parcial) | `proposed`; §§3–5 superados pelo ADR de localização | ADR-20261016-mapa-de-bairros.md:3 | ADR-20261022-localizacao-padrao-de-mercado.md:66 |
| docs/decisions/ADR-20261015-pedido-aberto-e-propostas.md | VIGENTE | Pedido aberto com até cinco propostas | ADR-20261015-pedido-aberto-e-propostas.md:119 | — |
| docs/decisions/ADR-20261006-anuncios-salvos-e-moderacao.md | VIGENTE (parcial) | Salvos/moderção válidos; "Figma como spec" histórico | ADR-20261006-anuncios-salvos-e-moderacao.md:16 | ─ (ver §2) |
| docs/decisions/ADR-20260926-bivaque-mais.md | VIGENTE | Vertical paga fora do app; não contradiz o protótipo | ADR-20260926-bivaque-mais.md:30 | — |
| docs/decisions/ADR-20260925-pagina-do-negocio.md | VIGENTE (parcial) | Página do negócio válida; D1/D6/D12 superados | ADR-20260925-pagina-do-negocio.md:48 | ─ (ver §2) |
| docs/decisions/ADR-20260925-memoria-de-indicacoes.md | VIGENTE (parcial) | Indicações válidas; vista "Conversa" sai da Comunidade | ADR-20260925-memoria-de-indicacoes.md:75 | — |
| docs/decisions/ADR-20260925-endereco-por-escolha.md | VIGENTE | Endereço é escolha de quem publica | ADR-20260925-endereco-por-escolha.md:34 | — |
| docs/decisions/ADR-20260925-consulta-outra-cidade.md | VIGENTE | Consulta a outra cidade | ADR-20260925-consulta-outra-cidade.md:28 | — |
| docs/decisions/ADR-20260925-aviso-de-pedido.md | VIGENTE | Aviso de pedido de indicação | ADR-20260925-aviso-de-pedido.md:29 | — |
| docs/decisions/ADR-20260923-teto-de-pedidos-por-par.md | VIGENTE | Teto de cinco pedidos por par | ADR-20260923-teto-de-pedidos-por-par.md:39 | — |
| docs/decisions/ADR-20260922-identidade-quando-portal-falha.md | VIGENTE | Identidade quando o Portal falha | ADR-20260922-identidade-quando-portal-falha.md:38 | — |
| docs/decisions/ADR-20260922-conversa-por-pedido.md | VIGENTE | Conversa por pedido | ADR-20260922-conversa-por-pedido.md:36 | — |
| docs/decisions/ADR-20260922-aviso-da-primeira-resposta.md | VIGENTE | Aviso da primeira resposta | ADR-20260922-aviso-da-primeira-resposta.md:31 | — |
| docs/decisions/ADR-20260922-aprovacao-por-identidade-sem-cidade.md | VIGENTE | Aprovação por identidade não exige cidade | ADR-20260922-aprovacao-por-identidade-sem-cidade.md:36 | — |
| docs/decisions/ADR-20260921-curadoria-assistida-do-guia.md | VIGENTE | Guia alimentado por job com aprovação humana | ADR-20260921-curadoria-assistida-do-guia.md:37 | — |
| docs/decisions/ADR-20260914-saida-de-comunidade.md | LEGADO | Trata `community_memberships`/vila, que não existe nesta versão | ADR-20260914-saida-de-comunidade.md:33 | ADR-20261023:31,75 |
| docs/decisions/ADR-20260914-exclusao-de-conta.md | VIGENTE | Exclusão de conta e retenção (LGPD) | ADR-20260914-exclusao-de-conta.md:29 | — |
| docs/decisions/ADR-20260910-suspensao-fora-da-exposicao.md | VIGENTE | Suspensão em `profile_suspensions` | ADR-20260910-suspensao-fora-da-exposicao.md:41 | — |
| docs/decisions/ADR-20260909-resposta-que-resolveu.md | VIGENTE (parcial) | Marcador da resposta; refeito em dois campos | ADR-20260909-resposta-que-resolveu.md:42 | ADR-20261023:93-98 |
| docs/decisions/ADR-20260909-perfil-bio.md | VIGENTE | Bio do perfil | ADR-20260909-perfil-bio.md:35 | — |
| docs/decisions/ADR-20260909-pedidos-e-conversa-contextual.md | VIGENTE (parcial) | Contexto/conversa válidos; D1 e D5 emendadas | ADR-20260909-pedidos-e-conversa-contextual.md:31 | ADR-20261015 |
| docs/decisions/ADR-20260909-midia-de-membro.md | VIGENTE (parcial) | Buckets privados e EXIF; bucket `community-images` é legado | ADR-20260909-midia-de-membro.md:29 | ─ (ver §2) |
| docs/decisions/ADR-20260909-guia-artigo-estruturado.md | VIGENTE | Guia como artigo em seções | ADR-20260909-guia-artigo-estruturado.md:31 | — |
| docs/decisions/ADR-20260909-canais-de-notificacao.md | VIGENTE | Preferência por tipo e canal | ADR-20260909-canais-de-notificacao.md:32 | — |
| docs/decisions/ADR-20260909-anuncios-mercado-e-moradia.md | VIGENTE (parcial) | Domínio `listings` válido; D5 revogada e D3 no ramo comunidade é legado | ADR-20260909-anuncios-mercado-e-moradia.md:75 | ADR-20260925-endereco-por-escolha |
| docs/decisions/ADR-20260908-perfil-campos-opcionais.md | VIGENTE (parcial) | Visibilidade por campo válida; exposição de Força/OM pendente | ADR-20260908-perfil-campos-opcionais.md:211 | ─ (ver §2) |
| docs/decisions/ADR-20260907-login-com-senha.md | VIGENTE | Login com e-mail e senha | ADR-20260907-login-com-senha.md:24 | — |
| docs/decisions/ADR-20260907-consentimento-no-cadastro.md | VIGENTE | Aceite no cadastro | ADR-20260907-consentimento-no-cadastro.md:29 | — |
| docs/decisions/ADR-20260901-mobile-session.md | VIGENTE | Sessão móvel; `expo-secure-store` em uso | apps/mobile/package.json | — |
| docs/decisions/ADR-20260901-mobile-session-DECISION-MATRIX.md | HISTÓRICO | Insumo de decisão datado; "esta matriz não decide" | ADR-20260901-mobile-session-DECISION-MATRIX.md:3 | — |
| docs/decisions/ADR-20260901-design-system.md | VIGENTE (parcial) | Governança/tokens válidos; direção "Casa comum" superada | ADR-20260901-design-system.md:30 | ADR-20261022-porte-visual-material-web.md:57 |
| docs/decisions/ADR-20260901-account-suspension.md | LEGADO | Coluna `is_suspended` em `profiles` foi removida | ADR-20260901-account-suspension.md:50 | ADR-20260910-suspensao-fora-da-exposicao + ADR-20260820-suspensao-de-conta |
| docs/decisions/ADR-20260831-mobile-native.md | VIGENTE | Cliente nativo aprovado e presente | tests/scope/workspace-foundation.test.mjs:21 | — |
| docs/decisions/ADR-20260820-suspensao-de-conta.md | VIGENTE | Devido processo de suspensão | ADR-20260820-suspensao-de-conta.md:37 | — |
| docs/decisions/ADR-20260820-conta-de-prestador.md | VIGENTE (parcial) | Visão do prestador válida; entrada por convite superada | ADR-20260820-conta-de-prestador.md:42 | ADR-20260925-pagina-do-negocio.md:12 |
| docs/decisions/ADR-20260820-alcance-pago.md | LEGADO | Unidade vendida (alcance pago) substituída; lançamento gratuito | ADR-20260820-alcance-pago.md:3 | ADR-20260925-pagina-do-negocio.md:48 |
| docs/decisions/ADR-20260816-transferencia-e-pertencimento.md | VIGENTE (parcial) | Transferência válida; "vila concedida pelo dono" é legado | ADR-20260816-transferencia-e-pertencimento.md:3 | ADR-20261022-entrada-do-prototipo.md:53 |
| docs/decisions/ADR-20260816-shells-e-navegacao.md | VIGENTE (parcial) | Shells por papel válidos; containers/nav antigos superados | ADR-20260816-shells-e-navegacao.md:15 | prototypes/bivaque-html/src/shell/navigation.js:4 |
| docs/decisions/ADR-20260816-national-localities.md | VIGENTE | Nacional por cidade; Manaus é piloto | ADR-20260816-national-localities.md:54 | — |
| docs/decisions/ADR-20260816-forma-da-admissao.md | VIGENTE | Admissão em duas fases | ADR-20260816-forma-da-admissao.md:42 | — |
| docs/decisions/ADR-20260815-guia-curadoria-ia.md | LEGADO | `proposed`, nunca aprovado; mesmo desenho aprovado depois | ADR-20260815-guia-curadoria-ia.md:3 | ADR-20260921-curadoria-assistida-do-guia.md:37 |
| docs/decisions/ADR-20260811-om-declarada.md | INCERTO | `proposed`; exposição de Força/OM pendente | ADR-20260811-om-declarada.md:135 | ─ (ver §3) |
| docs/decisions/RISK_MATRIX.md | VIGENTE | Matriz R0–R3 em uso | RISK_MATRIX.md:12 | — |
| docs/decisions/POSTMORTEM.md | VIGENTE | Template de incidente exigido pela RISK_MATRIX | POSTMORTEM.md:5 | — |
| docs/decisions/TEMPLATE.md | VIGENTE | Modelo de ADR em uso | TEMPLATE.md:3 | — |

### 1.2 `docs/agents/` — arquivos de topo (50 arquivos)

| arquivo | classe | motivo | evidência (arquivo:linha) | substituído por |
|---|---|---|---|---|
| docs/agents/AGENT_ARCHITECTURE.md | VIGENTE | Protocolo do harness em vigor | AGENT_ARCHITECTURE.md:3 | — |
| docs/agents/TASK_CONTRACT.md | VIGENTE | Formato do contrato de tarefa | TASK_CONTRACT.md:12 | — |
| docs/agents/LICOES.md | VIGENTE | Lições coladas em contratos futuros | LICOES.md:3 | — |
| docs/agents/HANDOFF-COORDENACAO-2026-10-22.md | VIGENTE | Autoridade corrente de coordenação | HANDOFF-COORDENACAO-2026-10-22.md:104 | — |
| docs/agents/DESIGN_SPEC.md | VIGENTE | Redirecionamento de compatibilidade ao doc canônico | DESIGN_SPEC.md:7 | — |
| docs/agents/DESIGN_SYSTEM.md | LEGADO (parcial) | HeroUI única, "Casa comum", Public Sans e nav antiga | DESIGN_SYSTEM.md:313 | ADR-20261022-porte-visual-material-web; ADR-20261023 |
| docs/agents/QWEN_BUILD_PROMPT.md | LEGADO | Fixa nav Início/Explorar/Comunidades/Perfil e HeroUI | QWEN_BUILD_PROMPT.md:27 | HANDOFF-2026-10-22; ADR-20261022-porte-visual-material-web |
| docs/agents/FIGMA-RASTREABILIDADE.md | LEGADO | Declara o Figma como autoridade de aparência/navegação | FIGMA-RASTREABILIDADE.md:11 | HANDOFF-2026-10-22.md:104 |
| docs/agents/FIGMA-ATUAL-COBERTURA.md | LEGADO | Adota o Figma atual como contrato de comparação dos lotes | FIGMA-ATUAL-COBERTURA.md:71 | protótipo (opção A); ADR-20261022-porte-visual-material-web |
| docs/agents/OPENCODE-FIGMA-CONTINUO.md | LEGADO | Execução contínua sobre o Figma, mantendo HeroUI | OPENCODE-FIGMA-CONTINUO.md:45 | protótipo; ADR-20261022-porte-visual-material-web |
| docs/agents/PRANCHAS-WEB-RESTANTES.md | LEGADO | Pranchas como critério de aceite da tela entregue | PRANCHAS-WEB-RESTANTES.md:8 | protótipo; AUDITORIA §6 |
| docs/agents/RECON-WEB-EXECUCAO.md | LEGADO | Manual de execução por prancha (RECON-018..035) | RECON-WEB-EXECUCAO.md:20 | protótipo; lotes de out/2026 |
| docs/agents/CONTRATOS-PENDENTES-W00-2026-09-08.md | LEGADO (parcial) | Entregável do gate W00 com pranchas 39/51 como alvo | CONTRATOS-PENDENTES-W00-2026-09-08.md:30 | protótipo; AUDITORIA §6 |
| docs/agents/VISUAL_GUIDE.md | LEGADO | Afirma containers de navegação antigos como decisão de produto | VISUAL_GUIDE.md:16 | HANDOFF-2026-10-22; protótipo |
| docs/agents/HARNESS.md | INCERTO | DRAFT, em inglês, sem referência nos AGENTS atuais | HARNESS.md:3 | ─ (ver §3) |
| docs/agents/AUDIT_PROMPT.md | INCERTO | Template de auditoria que fixa as ondas de 16/08 | AUDIT_PROMPT.md:25 | ─ (ver §3) |
| docs/agents/AUDIT-2026-08-19-plano-vs-execucao.md | HISTÓRICO | Auditoria datada (ondas T/D2/E/F) | AUDIT-2026-08-19-plano-vs-execucao.md:3 | — |
| docs/agents/AUDIT-PRODUCAO-2026-09-19-INICIO.md | HISTÓRICO | Auditoria datada da fatia Início | AUDIT-PRODUCAO-2026-09-19-INICIO.md:3 | — |
| docs/agents/AUDIT_LANCAMENTO-2026-08-25.md | HISTÓRICO | Auditoria datada de prontidão | AUDIT_LANCAMENTO-2026-08-25.md:3 | — |
| docs/agents/F4-design-question.md | HISTÓRICO | Questão de desenho datada, sem migration escrita | F4-design-question.md:48 | — |
| docs/agents/HANDOFF-2026-08-19.md | HISTÓRICO | Handoff datado | HANDOFF-2026-08-19.md:1 | — |
| docs/agents/HANDOFF-2026-09-09-fidelidade-pranchas.md | HISTÓRICO | Handoff datado de fidelidade às pranchas | HANDOFF-2026-09-09-fidelidade-pranchas.md:1 | — |
| docs/agents/HANDOFF-COORDENACAO-2026-10-19.md | HISTÓRICO | Handoff datado, substituído pelo de 22/10 | HANDOFF-COORDENACAO-2026-10-19.md:3 | HANDOFF-COORDENACAO-2026-10-22.md |
| docs/agents/HARNESS-PHASE0-2026-08-22.md | HISTÓRICO | Auditoria datada do harness | HARNESS-PHASE0-2026-08-22.md:2 | — |
| docs/agents/INVENTARIO-ROTAS-WEB-2026-09-08.md | HISTÓRICO | Inventário datado (leitura estática) | INVENTARIO-ROTAS-WEB-2026-09-08.md:9 | — |
| docs/agents/LOTE-SEGURANCA-2026-10-19.md | HISTÓRICO | Roteiro datado de lote já mergeado (PR #98) | LOTE-SEGURANCA-2026-10-19.md:3 | — |
| docs/agents/PORT_001.md | HISTÓRICO | Registro datado do piloto de porte | PORT_001.md:3 | — |
| docs/agents/REGISTRO-TESTES-2026-09-08.md | HISTÓRICO | Registro datado das camadas de teste (W00) | REGISTRO-TESTES-2026-09-08.md:6 | — |
| docs/agents/REVISAO-RECON-001-2026-09-08.md | HISTÓRICO | Revisão independente datada (FAIL) | REVISAO-RECON-001-2026-09-08.md:11 | — |
| docs/agents/W00-FECHAMENTO-2026-09-08.md | HISTÓRICO | Fechamento datado da etapa W00 | W00-FECHAMENTO-2026-09-08.md:4 | — |
| docs/agents/VISUAL_AUDIT-2026-08-06.md | HISTÓRICO | Veredito de auditoria visual datado | VISUAL_AUDIT-2026-08-06.md:1 | — |
| docs/agents/VISUAL_AUDIT-2026-08-06-family-invite.md | HISTÓRICO | Veredito datado (Onda 3) | VISUAL_AUDIT-2026-08-06-family-invite.md:1 | — |
| docs/agents/VISUAL_AUDIT-2026-08-06-moderation.md | HISTÓRICO | Veredito datado (Onda 1) | VISUAL_AUDIT-2026-08-06-moderation.md:1 | — |
| docs/agents/VISUAL_AUDIT-2026-08-06-navigation.md | HISTÓRICO | Veredito datado (Onda 5) | VISUAL_AUDIT-2026-08-06-navigation.md:1 | — |
| docs/agents/VISUAL_AUDIT-2026-08-06-pattern2.md | HISTÓRICO | Veredito datado (Onda 4) | VISUAL_AUDIT-2026-08-06-pattern2.md:1 | — |
| docs/agents/VISUAL_AUDIT-2026-08-06-preauth.md | HISTÓRICO | Veredito datado (Onda 6) | VISUAL_AUDIT-2026-08-06-preauth.md:1 | — |
| docs/agents/VISUAL_AUDIT-2026-08-06-refinements.md | HISTÓRICO | Veredito datado (Onda 7) | VISUAL_AUDIT-2026-08-06-refinements.md:1 | — |
| docs/agents/VISUAL_AUDIT-2026-08-14-onda-b.md | HISTÓRICO | Veredito datado (Onda B) | VISUAL_AUDIT-2026-08-14-onda-b.md:1 | — |
| docs/agents/VISUAL_AUDIT-2026-08-14-onda-c.md | HISTÓRICO | Veredito datado (Onda C) | VISUAL_AUDIT-2026-08-14-onda-c.md:1 | — |
| docs/agents/VISUAL_AUDIT-2026-08-15-onda-e-d1.md | HISTÓRICO | Veredito datado (frentes D/E/F e D1) | VISUAL_AUDIT-2026-08-15-onda-e-d1.md:1 | — |
| docs/agents/VISUAL_AUDIT-2026-08-17-p0-localidades.md | HISTÓRICO | Veredito datado (P0) | VISUAL_AUDIT-2026-08-17-p0-localidades.md:1 | — |
| docs/agents/VISUAL_AUDIT-2026-08-20-onda-f.md | HISTÓRICO | Veredito datado (onda F) | VISUAL_AUDIT-2026-08-20-onda-f.md:1 | — |
| docs/agents/VISUAL_AUDIT-2026-08-20-onda-t.md | HISTÓRICO | Veredito datado (onda T) | VISUAL_AUDIT-2026-08-20-onda-t.md:1 | — |
| docs/agents/VISUAL_AUDIT-2026-08-22-onda-h.md | HISTÓRICO | Veredito datado (onda H) | VISUAL_AUDIT-2026-08-22-onda-h.md:3 | — |
| docs/agents/VISUAL_AUDIT-2026-08-26-onda-g.md | HISTÓRICO | Veredito datado (onda G) | VISUAL_AUDIT-2026-08-26-onda-g.md:3 | — |
| docs/agents/VISUAL_AUDIT-2026-09-08-G0.md | HISTÓRICO | Veredito datado (G0) | VISUAL_AUDIT-2026-09-08-G0.md:3 | — |
| docs/agents/VISUAL_AUDIT-2026-09-08-TELAS.md | HISTÓRICO | Veredito datado (lote de cinco telas) | VISUAL_AUDIT-2026-09-08-TELAS.md:1 | — |
| docs/agents/PACOTE_ADVOGADO_BIVAQUE-2026-08-25.txt | HISTÓRICO | Pacote jurídico datado | PACOTE_ADVOGADO_BIVAQUE-2026-08-25.txt:2 | — |
| docs/agents/PACOTE_ADVOGADO_BIVAQUE-2026-08-25.docx | HISTÓRICO | Espelho binário do pacote jurídico | PACOTE_ADVOGADO_BIVAQUE-2026-08-25.txt:2 | — |
| docs/agents/PACOTE_ADVOGADO_BIVAQUE-2026-08-25.pdf | HISTÓRICO | Espelho binário do pacote jurídico | PACOTE_ADVOGADO_BIVAQUE-2026-08-25.txt:2 | — |

### 1.3 `docs/agents/design-audit/`, `mapas/`, `nextdoor-refs/`, `tasks/`

| arquivo (ou conjunto) | classe | motivo | evidência (arquivo:linha) | substituído por |
|---|---|---|---|---|
| docs/agents/design-audit/README.md | LEGADO | Protocolo cujo alvo normativo virou redirect de compatibilidade | design-audit/README.md:3,289-290 | ADR-20260901-design-system.md:30-31 |
| docs/agents/design-audit/AGENTS.md | LEGADO | Instruções de fase que dependem das autoridades antigas | design-audit/AGENTS.md:116,170 | ADR-20260901-design-system.md:30-31 |
| docs/agents/design-audit/PHASE1_PRODUCT_CONTEXT.md | LEGADO (parcial) | Fixa o escopo "community"/vila e "community owner" | PHASE1_PRODUCT_CONTEXT.md:47,61 | ADR-20261023:30-31; HANDOFF-2026-10-22.md:105 |
| docs/agents/design-audit/REFERENCE_DESIGN_SPEC.md | LEGADO (parcial) | REF-009 exige a hierarquia localidade→comunidade→grupo | REFERENCE_DESIGN_SPEC.md:95,410 | ADR-20261023:30-31 |
| docs/agents/design-audit/REFERENCE_VISUAL_GUIDE.md | LEGADO (parcial) | Repete a vila como MUST e mantém tipografia em EXPERIMENT | REFERENCE_VISUAL_GUIDE.md:288,292 | ADR-20261022-porte-visual-material-web.md:41-43,57 |
| docs/agents/design-audit/experiments/EXP-004-2026-08-21-172457/** (12 arquivos: README, comparison, 3× index.html/tokens.css/notes.md, scripts/capture.mjs) | LEGADO | Experimento de direção encerrado; candidatos publicam na cidade inteira | EXP-004/README.md:3-9; candidate-A/index.html:47-49 | ADR-20260901:33-37; ADR-20261022:41-43,57; ADR-20261023:78-84 |
| docs/agents/design-audit/experiments/EXP-004-*/screenshots/*.png (9) | HISTÓRICO | Captura datada de 21/08 (3 candidatos × 3 viewports) | EXP-004/README.md:76-80 | — |
| docs/agents/design-audit/RULE_LEDGER.md | HISTÓRICO | Extração datada; guarda regras mortas como registro | RULE_LEDGER.md:3,25-35 | ADJUDICATION.md:175 |
| docs/agents/design-audit/CONFLICT_MATRIX.md | HISTÓRICO | Confronto pré-runtime de 21/08 | CONFLICT_MATRIX.md:2,64 | — |
| docs/agents/design-audit/RUNTIME_FINDINGS.md | HISTÓRICO | Evidência de runtime de 08/2026 | RUNTIME_FINDINGS.md:3 | — |
| docs/agents/design-audit/ADJUDICATION.md | HISTÓRICO | Ledger congelado de vereditos | ADJUDICATION.md:3,175 | — |
| docs/agents/design-audit/PHASE6_REVIEW.md | HISTÓRICO | Revisão de fase; veredito substituído | PHASE6_REVIEW.md:3-5 | ADR-20260901:30-31; ADR-20261022:57 |
| docs/agents/mapas/lote5-comunidade.md | VIGENTE | Mapa código×protótipo base do ADR da Comunidade | mapas/lote5-comunidade.md:5-9; ADR-20261023:24-25 | — |
| docs/agents/nextdoor-refs/ANALYSIS.md | LEGADO | Análise do concorrente usada como direção; não é a pele atual | ANALYSIS.md:3,175 | ADJUDICATION.md:175; ADR-20261022:41-43 |
| docs/agents/nextdoor-refs/*.webp (9) | LEGADO | Capturas que sustentam a análise de direção | ANALYSIS.md:3-5,9-165 | protótipo; ADR-20261022-porte-visual-material-web |
| docs/agents/tasks/*.task.yml (154) | HISTÓRICO | Contratos fechados = registro, não regra (ver famílias em §2) | TASK_CONTRACT.md:3-4; tests/scope/agent-architecture.test.mjs:152-158 | — |

### 1.4 `docs/` — demais pastas e arquivos de raiz

| arquivo | classe | motivo | evidência (arquivo:linha) | substituído por |
|---|---|---|---|---|
| docs/AUDITORIA_ADERENCIA_2026-10-19.md | VIGENTE | Auditoria cuja seção 6 é o plano corrente em lotes 0–9 | AUDITORIA_ADERENCIA_2026-10-19.md:421-436 | — |
| docs/PRODUCT_STATUS.md | VIGENTE (parcial) | Descreve o código atual, com drifts a reconciliar | PRODUCT_STATUS.md:9 | reconciliação por AUDITORIA §4.4 |
| docs/PILOT_RUNBOOK.md | VIGENTE | Runbook operacional do piloto | PILOT_RUNBOOK.md:1-8 | — |
| docs/BIVAQUE.md | LEGADO (parcial) | Histórico onde conflita (vila/comunidades/nav/ondas antigas) | BIVAQUE.md:3-14 | AUDITORIA §4.4; PRODUCT_STATUS.md |
| docs/journeys/README.md | VIGENTE | Índice atual; rotula MAP como histórico | journeys/README.md:1-7 | — |
| docs/journeys/FLOWS.md | HISTÓRICO | Gerado do guia de setembro | FLOWS.md:3-5 | — |
| docs/journeys/MAP.md | HISTÓRICO | Superseded desde 2026-08-11 | MAP.md:3-7 | PRODUCT_STATUS.md / BIVAQUE.md |
| docs/legal/CODIGO_DE_CONDUTA.md | VIGENTE | Texto de aceite publicado (v2) | CODIGO_DE_CONDUTA.md:1-3 | — |
| docs/legal/PRIVACIDADE.md | VIGENTE (parcial) | Política publicável; usa "comunidades" e OM (ver §2) | PRIVACIDADE.md:1-3 | — |
| docs/legal/REVISAO_LANCAMENTO.md | HISTÓRICO | Dossiê interno datado de revisão legal | REVISAO_LANCAMENTO.md:1,10 | — |
| docs/superpowers/plans/README.md | LEGADO (parcial) | Índice do regime de ondas; parte técnica válida | plans/README.md:24-26,175-197 | protótipo; AUDITORIA §6; HANDOFF-2026-10-22 |
| docs/superpowers/plans/2026-09-12-mapeamento-de-jornadas-mobbin.md | LEGADO | Galeria derivada das 59 pranchas | 2026-09-12-mapeamento-de-jornadas-mobbin.md:10 | protótipo |
| docs/superpowers/plans/2026-09-08-w00-fundacao-web.md | LEGADO (parcial) | Autodeclarado superseded em parte; nav antiga | 2026-09-08-w00-fundacao-web.md:3,25 | protótipo |
| docs/superpowers/plans/2026-08-16-onda-e-a-vila.md | LEGADO | Constrói a "vila", inexistente no protótipo | 2026-08-16-onda-e-a-vila.md:1,10 | ADR-20261023; AUDITORIA §6 lote 5 |
| docs/superpowers/plans/2026-08-11-onda-b-coerencia-por-subtracao.md | LEGADO (parcial) | Task 1 contraria o ADR de login com senha | 2026-08-11-onda-b-coerencia-por-subtracao.md:30 | ADR-20260907-login-com-senha |
| docs/superpowers/plans/2026-08-05-comunidade.md | LEGADO | Planeja a entidade Comunidade (Vilas/Turmas) | 2026-08-05-comunidade.md:17 | ADR-20261023; AUDITORIA §6 lote 5 |
| docs/superpowers/plans/2026-08-05-auditoria-telas.md | LEGADO | Plano de auditoria de telas explicitamente superado | 2026-08-05-auditoria-telas.md:14-16 | ADR-20261022-porte-visual-material-web; AUDITORIA §6 |
| docs/superpowers/specs/2026-08-05-comunidade-design.md | LEGADO | Especifica Localidade/Comunidade(vila)/Grupo | 2026-08-05-comunidade-design.md:11-24,41 | ADR-20261023; AUDITORIA §6 lote 5 |
| docs/superpowers/specs/2026-09-08-reconstrucao-visual-web-design.md | LEGADO (parcial) | Reconstrução web de 08/09 superada; nav antiga | 2026-09-08-reconstrucao-visual-web-design.md:56 | protótipo; ADR-20261022/23 |
| docs/superpowers/specs/2026-09-20-resposta-candidata-guia-design.md | LEGADO (parcial) | Vínculo resposta→candidata recusado por ADR posterior | 2026-09-20-resposta-candidata-guia-design.md:32 | ADR-20260921-curadoria-assistida-do-guia:85-87 |
| docs/superpowers/plans/2026-08-20-onda-h-operacao.md | HISTÓRICO | Plano datado | 2026-08-20-onda-h-operacao.md:1-3 | — |
| docs/superpowers/plans/2026-08-20-onda-g-vitrine.md | HISTÓRICO | Plano datado | 2026-08-20-onda-g-vitrine.md:1-3 | — |
| docs/superpowers/plans/2026-08-16-p0-localidades-nacionais.md | HISTÓRICO | Plano datado | 2026-08-16-p0-localidades-nacionais.md:3 | — |
| docs/superpowers/plans/2026-08-16-onda-t-transferencia.md | HISTÓRICO | Plano datado | 2026-08-16-onda-t-transferencia.md:3 | — |
| docs/superpowers/plans/2026-08-16-onda-f-o-laco-semanal.md | HISTÓRICO | Plano datado | 2026-08-16-onda-f-o-laco-semanal.md:3 | — |
| docs/superpowers/plans/2026-08-16-onda-d2-a-porta.md | HISTÓRICO | Plano datado | 2026-08-16-onda-d2-a-porta.md:3 | — |
| docs/superpowers/plans/2026-08-11-onda-d1-infraestrutura.md | HISTÓRICO | Plano datado | 2026-08-11-onda-d1-infraestrutura.md:1-3 | — |
| docs/superpowers/plans/2026-08-11-onda-c-devolver-a-fala.md | HISTÓRICO | Plano datado | 2026-08-11-onda-c-devolver-a-fala.md:12-23 | — |
| docs/superpowers/plans/2026-08-11-onda-a-portas-e-vazamentos.md | HISTÓRICO | Plano datado | 2026-08-11-onda-a-portas-e-vazamentos.md:1-4 | — |
| docs/superpowers/plans/2026-08-09-onda8-rls-probe-auditoria-reconciliacao.md | HISTÓRICO | Plano datado | 2026-08-09-onda8-rls-probe-auditoria-reconciliacao.md:1 | — |
| docs/superpowers/plans/2026-08-06-preauth-robustness.md | HISTÓRICO | Plano datado | 2026-08-06-preauth-robustness.md:10-15 | — |
| docs/superpowers/plans/2026-08-06-onboarding-cycle.md | HISTÓRICO | Plano datado | 2026-08-06-onboarding-cycle.md:10-15 | — |
| docs/superpowers/plans/2026-08-06-observabilidade-do-produto.md | HISTÓRICO | Plano datado | 2026-08-06-observabilidade-do-produto.md:11-14 | — |
| docs/superpowers/plans/2026-08-06-navigation-and-detail.md | HISTÓRICO | Plano datado | 2026-08-06-navigation-and-detail.md:10-14 | — |
| docs/superpowers/plans/2026-08-06-moderation-surface.md | HISTÓRICO | Plano datado | 2026-08-06-moderation-surface.md:10-13 | — |
| docs/superpowers/plans/2026-08-06-family-invite-access.md | HISTÓRICO | Plano datado | 2026-08-06-family-invite-access.md:10-16 | — |
| docs/red-team/README.md | HISTÓRICO | Declara-se evidência datada | red-team/README.md:3-14 | — |
| docs/red-team/camada-0-contratos.md | HISTÓRICO | Snapshot de contratos de 10/08 | red-team/camada-0-contratos.md:1-5 | — |
| docs/red-team/lote-1-ancoras.md | HISTÓRICO | Findings-âncora de 10/08 | red-team/lote-1-ancoras.md:3-4 | — |
| docs/red-team/sintese-fase-2.md | HISTÓRICO | Síntese adversarial; arquitetura não vinculante | red-team/sintese-fase-2.md:188-192 | — |
| docs/red-team/lote-2-admin.md | HISTÓRICO | Varredura adversarial datada | red-team/lote-2-admin.md:3-5 | — |
| docs/red-team/lote-2-comunidades.md | HISTÓRICO | Varredura datada sobre a entidade Comunidade | red-team/lote-2-comunidades.md:3-7 | ADR-20261023 (evidência datada) |
| docs/red-team/lote-2-eventos.md | HISTÓRICO | Varredura adversarial datada | red-team/lote-2-eventos.md:3-4 | — |
| docs/red-team/lote-2-feed.md | HISTÓRICO | Varredura datada; feed municipal não existe no protótipo | red-team/lote-2-feed.md:32-40 | ADR-20261023 |
| docs/red-team/lote-2-grupos.md | HISTÓRICO | Varredura adversarial datada | red-team/lote-2-grupos.md:3-4 | — |
| docs/red-team/lote-2-indicacoes.md | HISTÓRICO | Varredura adversarial datada | red-team/lote-2-indicacoes.md:3-5 | — |
| docs/red-team/lote-2-mensagens.md | HISTÓRICO | Varredura adversarial datada | red-team/lote-2-mensagens.md:3-5 | — |
| docs/red-team/lote-2-moderacao.md | HISTÓRICO | Varredura adversarial datada | red-team/lote-2-moderacao.md:3-5 | — |
| docs/red-team/lote-2-notificacoes.md | HISTÓRICO | Varredura adversarial datada | red-team/lote-2-notificacoes.md:3-5 | — |
| docs/red-team/lote-2-onboarding.md | HISTÓRICO | Varredura adversarial datada | red-team/lote-2-onboarding.md:3-4 | — |
| docs/red-team/lote-2-perfil.md | HISTÓRICO | Varredura adversarial datada | red-team/lote-2-perfil.md:3-4 | — |
| docs/evidence/figma-2026-10-06/checkpoints.json | HISTÓRICO | Evidência datada de sessão Figma | figma-2026-10-06/checkpoints.json:1 | — |
| docs/evidence/figma-2026-10-06/figma001-review-verdict.md | HISTÓRICO | Veredito datado FIGMA-001 | figma-2026-10-06/figma001-review-verdict.md:1 | — |
| docs/evidence/figma-2026-10-06/figma001-runtime-verdict.md | HISTÓRICO | Veredito de runtime datado | figma-2026-10-06/figma001-runtime-verdict.md:1-12 | — |
| docs/evidence/figma-2026-10-06/glm-figma002-delta-review.md | HISTÓRICO | Revisão independente datada | figma-2026-10-06/glm-figma002-delta-review.md:1 | — |
| docs/evidence/figma-2026-10-06/glm-figma002-first-review.md | HISTÓRICO | Revisão independente datada | figma-2026-10-06/glm-figma002-first-review.md:1 | — |
| docs/evidence/figma-2026-10-06/local-artifacts-manifest.json | HISTÓRICO | Manifesto datado | figma-2026-10-06/local-artifacts-manifest.json:1 | — |
| docs/evidence/figma-2026-10-06/origin-source-manifest.json | HISTÓRICO | Manifesto datado | figma-2026-10-06/origin-source-manifest.json:1 | — |
| docs/evidence/figma-2026-10-06/production-source-manifest.json | HISTÓRICO | Manifesto datado | figma-2026-10-06/production-source-manifest.json:1 | — |
| docs/evidence/figma-2026-10-06/repair-run15-proof.json | HISTÓRICO | Prova datada | figma-2026-10-06/repair-run15-proof.json:2 | — |

### 1.5 `docs/brand/` (14), `docs/bivaque-html-kit/` (14)

| arquivo (ou conjunto) | classe | motivo | evidência (arquivo:linha) | substituído por |
|---|---|---|---|---|
| docs/brand/README.md | VIGENTE | Fonte operacional da identidade (atualizada em 20/10) | brand/README.md:3,5 | — |
| docs/brand/GUIDELINES.md | VIGENTE | Diretrizes operacionais da marca | brand/GUIDELINES.md:1-11 | — |
| docs/brand/reference/BIVAQUE_brand_spec.md | VIGENTE | Especificação operacional da marca | reference/BIVAQUE_brand_spec.md:1-9 | — |
| docs/brand/reference/BIVAQUE_brandbook.pdf | VIGENTE | Brandbook de referência | brand/README.md:3 | — |
| docs/brand/reference/bivaque-master-artwork.svg | VIGENTE | Mestre vetorial canônico | brand/README.md:41 | — |
| docs/brand/reference/brand-tokens.css | VIGENTE | Tokens portáveis da marca | brand/README.md:40 | — |
| docs/brand/reference/brand-tokens.json | VIGENTE | Tokens portáveis da marca | brand/README.md:40 | — |
| docs/brand/maquete-2026-10-20/maquete-brandbook.html | VIGENTE | Maquete/brandbook com tema claro e escuro | maquete-brandbook.html:5,14 | — |
| docs/brand/maquete-2026-10-20/maquete-brandbook.png | VIGENTE | Render da maquete | brand/README.md:3 | — |
| docs/brand/maquete-2026-10-20/img/*.svg (2) | VIGENTE | Logos do brandbook | brand/README.md:3 | — |
| docs/brand/maquete-2026-10-20/img/*.jpg (3) | VIGENTE | Fotos da maquete | brand/README.md:3 | — |
| docs/bivaque-html-kit/README.md | HISTÓRICO | Kit de processo (Codex/18 agentes) que originou o protótipo | bivaque-html-kit/README.md:1-3 | — |
| docs/bivaque-html-kit/AGENT_RULES.md | HISTÓRICO | Regras do processo | AGENT_RULES.md:4-8 | — |
| docs/bivaque-html-kit/ARCHITECTURE.md | HISTÓRICO | Arquitetura do protótipo HTML | ARCHITECTURE.md:3-7 | — |
| docs/bivaque-html-kit/ACCEPTANCE.md | HISTÓRICO | Matriz de aceite/QA do protótipo | ACCEPTANCE.md:1-3 | — |
| docs/bivaque-html-kit/CODEX_PROMPT_INICIAL.md | HISTÓRICO | Prompt do processo Codex | CODEX_PROMPT_INICIAL.md:1-6 | — |
| docs/bivaque-html-kit/INITIAL_INVENTORY.md | HISTÓRICO | Inventário heurístico do HTML original | INITIAL_INVENTORY.md:1-3 | — |
| docs/bivaque-html-kit/INSTALLATION.md | HISTÓRICO | Registro datado de instalação (13/10) | INSTALLATION.md:1-10 | — |
| docs/bivaque-html-kit/ROADMAP.md | HISTÓRICO | Roadmap por rodadas | ROADMAP.md:1-5 | — |
| docs/bivaque-html-kit/UI_UX.md | HISTÓRICO | Papel UI/UX do processo | UI_UX.md:1-3 | — |
| docs/bivaque-html-kit/config/CODEX_CONFIG_SNIPPET.toml | HISTÓRICO | Snippet opcional de config Codex | CODEX_CONFIG_SNIPPET.toml:1-3 | — |
| docs/bivaque-html-kit/tasks/ROUND_00.md | HISTÓRICO | Tarefa da rodada 00 | ROUND_00.md:1-3 | — |
| docs/bivaque-html-kit/templates/TASK_TEMPLATE.md | HISTÓRICO | Template do processo | TASK_TEMPLATE.md:1-5 | — |
| docs/bivaque-html-kit/MANIFEST_SHA256.json | HISTÓRICO | Manifesto de hashes do ZIP | MANIFEST_SHA256.json:2-5 | — |
| docs/bivaque-html-kit/PLANO_COMPLETO_18_AGENTES.md | INCERTO | Base visual atual, mas feature set do processo Codex abandonado | PLANO_COMPLETO_18_AGENTES.md:3-5,36 | ─ (ver §3) |

### 1.6 `docs/design/visual-guide-2026-09-06/` (141 arquivos — conjunto 1.6 agrupado em imagens)

| arquivo (ou conjunto) | classe | motivo | evidência (arquivo:linha) | substituído por |
|---|---|---|---|---|
| docs/design/visual-guide-2026-09-06/README.md | LEGADO | Descreve "a versão a ser construída" (setembro) | README.md:3,7,11 | protótipo (opção A); ADRs out/2026 |
| docs/design/visual-guide-2026-09-06/PROCESSO-DE-CONSTRUCAO.md | LEGADO (parcial) | Ordena construir a versão de setembro (W00–W09, nav antiga) | PROCESSO-DE-CONSTRUCAO.md:9,67-72 | ADR-20261022; ADR-20261023 |
| docs/design/visual-guide-2026-09-06/MAPA-DE-TELAS.md | LEGADO | Mapa das pranchas da versão antiga (Comunidades/Explorar) | MAPA-DE-TELAS.md:3,38-43 | protótipo |
| docs/design/visual-guide-2026-09-06/DECISOES-2026-09-07.md | LEGADO (parcial) | Decisões da versão de setembro | DECISOES-2026-09-07.md:1-3 | protótipo; ADRs out/2026 |
| docs/design/visual-guide-2026-09-06/AGENTS.md | LEGADO | Instruções do guia de setembro (59 pranchas) | visual-guide-2026-09-06/AGENTS.md:3,7 | protótipo |
| docs/design/visual-guide-2026-09-06/ARQUITETURA.md | LEGADO (parcial) | Recomenda HeroUI/Tailwind na web | ARQUITETURA.md:14 | ADR-20261022-porte-visual-material-web |
| docs/design/visual-guide-2026-09-06/MODELOS-PARA-CONSTRUCAO.md | LEGADO | Escolha de modelos/preços do processo de setembro | MODELOS-PARA-CONSTRUCAO.md:3-5,36-46 | — |
| docs/design/visual-guide-2026-09-06/PROMPT-INICIAL.md | LEGADO | Prompt que ordena construir a versão de setembro | PROMPT-INICIAL.md:9-11 | protótipo |
| docs/design/visual-guide-2026-09-06/index.html | LEGADO | Galeria interativa da versão de setembro | index.html:6 | protótipo |
| docs/design/visual-guide-2026-09-06/MOBBIN-INDICACOES-2026-09-20.md | HISTÓRICO | Registro datado de correção de interação | MOBBIN-INDICACOES-2026-09-20.md:1-3 | — |
| docs/design/visual-guide-2026-09-06/flows.html | HISTÓRICO | Galeria Mobbin derivada das pranchas | flows.html:6 | — |
| docs/design/visual-guide-2026-09-06/manifest.json | HISTÓRICO | Manifesto datado das pranchas | manifest.json:3-6 | — |
| docs/design/visual-guide-2026-09-06/VALIDACAO-2026-09-08.json | HISTÓRICO | Validação datada (runtime não executado) | VALIDACAO-2026-09-08.json:2,12 | — |
| docs/design/visual-guide-2026-09-06/auth-generation.json | HISTÓRICO | Proveniência datada das pranchas de auth | auth-generation.json:2 | — |
| docs/design/visual-guide-2026-09-06/completion-generation-2026-09-08.json | HISTÓRICO | Proveniência datada de geração | completion-generation-2026-09-08.json:1 | — |
| docs/design/visual-guide-2026-09-06/expansion-generation.json | HISTÓRICO | Proveniência datada de geração | expansion-generation.json:2-3 | — |
| docs/design/visual-guide-2026-09-06/final-flows-generation-2026-09-08.json | HISTÓRICO | Proveniência datada de geração | final-flows-generation-2026-09-08.json:1 | — |
| docs/design/visual-guide-2026-09-06/identity-single-file-generation-2026-09-08.json | HISTÓRICO | Proveniência datada de geração | identity-single-file-generation-2026-09-08.json:1 | — |
| docs/design/visual-guide-2026-09-06/remaining-generation-2026-09-07.json | HISTÓRICO | Proveniência datada de geração | remaining-generation-2026-09-07.json:1 | — |
| docs/design/visual-guide-2026-09-06/src/71-web-auth-recuperacao.html | LEGADO | Fonte/prancha da versão antiga | src/71-web-auth-recuperacao.html:1 | protótipo |
| docs/design/visual-guide-2026-09-06/src/72-web-auth-link-invalido.html | LEGADO | Fonte/prancha da versão antiga | src/72-web-auth-link-invalido.html:1 | protótipo |
| docs/design/visual-guide-2026-09-06/src/73-web-comunidade-pedidos.html | LEGADO | Fonte/prancha da versão antiga (comunidade no plural) | src/73-web-comunidade-pedidos.html:1 | protótipo |
| docs/design/visual-guide-2026-09-06/src/74-web-guia-curadoria.html | LEGADO | Fonte/prancha da versão antiga | src/74-web-guia-curadoria.html:1 | protótipo |
| docs/design/visual-guide-2026-09-06/src/75-web-conversas.html | LEGADO | Fonte/prancha da versão antiga | src/75-web-conversas.html:7-17 | protótipo |
| docs/design/visual-guide-2026-09-06/src/76-web-familia.html | LEGADO | Fonte/prancha da versão antiga | src/76-web-familia.html:1 | protótipo |
| docs/design/visual-guide-2026-09-06/src/77-web-ajuda.html | LEGADO | Fonte/prancha da versão antiga | src/77-web-ajuda.html:1 | protótipo |
| docs/design/visual-guide-2026-09-06/src/78-web-prestador-operacao.html | LEGADO | Fonte/prancha da versão antiga | src/78-web-prestador-operacao.html:1 | protótipo |
| docs/design/visual-guide-2026-09-06/src/79-web-indicar-prestador.html | LEGADO | Fonte/prancha da versão antiga | src/79-web-indicar-prestador.html:1 | protótipo |
| docs/design/visual-guide-2026-09-06/src/80-web-recomendacoes.html | LEGADO | Fonte/prancha da versão antiga | src/80-web-recomendacoes.html:1 | protótipo |
| docs/design/visual-guide-2026-09-06/src/81-web-comunidade-admin.html | LEGADO | Fonte/prancha da versão antiga | src/81-web-comunidade-admin.html:1 | protótipo |
| docs/design/visual-guide-2026-09-06/src/82-web-localidade.html | LEGADO | Fonte/prancha da versão antiga | src/82-web-localidade.html:1 | protótipo |
| docs/design/visual-guide-2026-09-06/src/83-web-landing.html | LEGADO | Fonte/prancha da versão antiga | src/83-web-landing.html:1 | protótipo |
| docs/design/visual-guide-2026-09-06/src/84-web-busca.html | LEGADO | Fonte/prancha da versão antiga | src/84-web-busca.html:1 | protótipo |
| docs/design/visual-guide-2026-09-06/src/85-web-arrivals.html | LEGADO | Fonte/prancha da versão antiga | src/85-web-arrivals.html:1 | protótipo |
| docs/design/visual-guide-2026-09-06/src/36-web-auth-entrada.html | INCERTO | Fonte regerada apontando para código atual sobre geometria antiga | src/36-web-auth-entrada.html | ─ (ver §3) |
| docs/design/visual-guide-2026-09-06/src/70-web-evento-organizar.html | INCERTO | Fonte regerada apontando para código atual sobre geometria antiga | src/70-web-evento-organizar.html | ─ (ver §3) |
| docs/design/visual-guide-2026-09-06/src/*.board.json (14) | INCERTO | Renderizam pranchas antigas, mas apontam contrato/código atuais | src/75-web-conversas.board.json:18-19 | ─ (ver §3) |
| docs/design/visual-guide-2026-09-06/*.png (75) | HISTÓRICO | Pranchas de setembro; referência, não especificação | README.md:11 | protótipo |
| docs/design/visual-guide-2026-09-06/history/2026-09-08/*.png (9) | HISTÓRICO | Originais substituídos, preservados como trilha | MOBBIN-INDICACOES-2026-09-20.md:31-33 | — |
| docs/design/visual-guide-2026-09-06/history/2026-09-20-home-compacta/*.png (2) | HISTÓRICO | Originais substituídos, preservados como trilha | MOBBIN-INDICACOES-2026-09-20.md:31-33 | — |
| docs/design/visual-guide-2026-09-06/history/2026-09-20-mobbin-indicacoes/*.png (5) | HISTÓRICO | Originais substituídos, preservados como trilha | MOBBIN-INDICACOES-2026-09-20.md:31-33 | — |

### 1.7 Harness: `AGENTS.md`, `CLAUDE.md`, `.claude/`, `.opencode/`, `.mcp.json`

| arquivo | classe | motivo | evidência (arquivo:linha) | substituído por |
|---|---|---|---|---|
| AGENTS.md | LEGADO (parcial) | Cabeçalho de autoridade é o de setembro (pranchas/W00–W09/nav "Comunidades"); corpo técnico ainda vigente (ver §2) | AGENTS.md:5,16-19,29 | AGENTS.md da main (autoridade 22/10); HANDOFF-2026-10-22.md:104 |
| CLAUDE.md | LEGADO (parcial) | Ponte para o AGENTS.md de setembro e "Versão atual" apontando ao processo de 06/09 | CLAUDE.md:5,16-22 | HANDOFF-2026-10-22.md |
| .claude/agents/implementer.md | VIGENTE | Papel `implementer` vigente | implementer.md:8-10; AGENT_ARCHITECTURE.md:71 | — |
| .claude/agents/reviewer.md | VIGENTE | Papel `reviewer` vigente | reviewer.md:9-11; AGENT_ARCHITECTURE.md:72 | — |
| .claude/agents/runtime-verifier.md | VIGENTE | Papel de adjudicação vigente | runtime-verifier.md:8-10; AGENT_ARCHITECTURE.md:73 | — |
| .claude/agents/security-auditor.md | VIGENTE | Fronteira de confiança/RLS vigente | security-auditor.md:37-38 | — |
| .claude/agents/explorer.md | VIGENTE | Descoberta estrutural vigente | explorer.md:8-11 | — |
| .claude/agents/experiment-judge.md | VIGENTE | Julgamento cego de EXP vigente | experiment-judge.md:8-11 | — |
| .claude/agents/visual-designer.md | LEGADO (parcial) | Contrato congelado diz "HeroUI v3 é a única biblioteca" | visual-designer.md:32-33 | ADR-20261022-porte-visual-material-web.md:24,35 |
| .claude/hooks/bash-guard.sh | VIGENTE | Firewall PreToolUse em uso | bash-guard.sh:2-13 | — |
| .claude/hooks/bash-guard.mjs | VIGENTE | Bloqueia rm/push forçado/--linked/db:reset/.env | bash-guard.mjs:38-54,79 | — |
| .claude/hooks/biome-format.sh | VIGENTE | Formata com Biome via npx pnpm | biome-format.sh:10-22 | — |
| .claude/hooks/secret-scrubber.sh | VIGENTE | Rejeita credenciais no prompt | secret-scrubber.sh:10-13 | — |
| .claude/hooks/stop-gate.sh | VIGENTE | Lembra o gate com mudanças não commitadas | stop-gate.sh:21-25 | — |
| .claude/skills/execute-task/SKILL.md | VIGENTE | Unidade = contrato, com fronteira e retry_budget | execute-task/SKILL.md:13,36-43 | — |
| .claude/skills/adversarial-review/SKILL.md | VIGENTE | Revisão independente entre camadas | adversarial-review/SKILL.md:12,22-35 | — |
| .claude/skills/adversarial-review/references/boundary-checklist.md | VIGENTE | Checklist técnico ainda verdadeiro | boundary-checklist.md:13,21-31 | — |
| .claude/skills/runtime-proof/SKILL.md | VIGENTE | "Existir não é evidência"; mapa comando↔prova | runtime-proof/SKILL.md:12-30 | — |
| .claude/skills/runtime-proof/references/proof-catalog.md | VIGENTE | Catálogo coerente com o gate atual | proof-catalog.md:8-9,27-32 | — |
| .claude/skills/gate-before-done/SKILL.md | VIGENTE | Gate e classificação de vermelho vigentes | gate-before-done/SKILL.md:14-19 | — |
| .claude/skills/plan-execution/SKILL.md | LEGADO (parcial) | Laço/parada vigentes; "ondas seriais" e fechamento por auditoria de 05/08 superados | plan-execution/SKILL.md:13-15,35-45 | AUDITORIA_ADERENCIA_2026-10-19.md:421-436 |
| .claude/skills/experiment-protocol/SKILL.md | VIGENTE | Protocolo de EXP vigente | experiment-protocol/SKILL.md:15-41 | — |
| .claude/skills/visual-system-experiment/SKILL.md | LEGADO (parcial) | Fixa `DESIGN_SPEC.md` como tokens e "HeroUI única" | visual-system-experiment/SKILL.md:19-22 | ADR-20261022-porte-visual-material-web.md:35 |
| .claude/skills/visual-system-experiment/references/evaluation-rubric.md | VIGENTE | Régua de avaliação sem dependência de produto revogado | evaluation-rubric.md:6-27 | — |
| .claude/launch.json | VIGENTE | Config `web-dev` coerente com os comandos atuais | launch.json:5-8 | — |
| .claude/memory.md | LEGADO (parcial) | Índice vigente; seção "Visual language" aponta DESIGN_SPEC/QWEN | memory.md:19-23 | DESIGN_SPEC.md:1-7 (redirect); ADR-20261022-porte-visual-material-web |
| .opencode/opencode.json | VIGENTE | Config de projeto (23/10); permissões e MCPs de propósito | opencode.json:4-13,42-46 | — |
| .mcp.json | VIGENTE | Registra codebase-memory-mcp, context7 e supabase | .mcp.json:3-14 | — |

---

## 2. LEGADO parcial — o que ainda vale em cada arquivo

**Arquivos de harness que precisam ser corrigidos, não apagados:**

- `AGENTS.md` — **não valem:** linhas 3-5 (cabeçalho "reconstrução de 08/09" e W00–W09), 7-9 (guia visual de setembro; Força/OM com visibilidade individual), 14-26 ("Current build authority" = PROCESSO de 06/09), 28-31 (nav Início/Explorar/Comunidades/Perfil), 79-87 ("the visual audit blocks" e onda A de BIVAQUE §10), 130 (PROCESSO = "current version"), 174-184 (loop visual com DESIGN_SYSTEM/QWEN), 189 ("no apps/mobile"), 191 ("HeroUI v3 is the only component library"), 267-310 (seção HeroUI + wrappers), 390-393 (evidência em `.omo/evidence/...` fora do repo; "no commits have been made yet"). **Valem:** comandos e pinos (`npx pnpm@11.18.0`, workspace roots com mobile), contratos de `tests/scope`, regras de Supabase/RLS/privacidade, Portal server-side, Playwright, board workflow.
- `CLAUDE.md` — **não valem:** linhas 3-9 (spec `2026-09-08` e pranchas) e 16-22 ("Versão atual" = PROCESSO de 06/09). **Valem:** regras de sessão, arquitetura de agentes e grafo. Nota: a linha 49 cita uma skill `supabase` que não existe em `.claude/skills/` (drift).
- `.claude/agents/visual-designer.md` — vale o papel; **não vale** o contrato "HeroUI única" (linhas 32-33).
- `.claude/skills/plan-execution/SKILL.md` — valem o laço por todo e a regra de parada; **não valem** "ondas seriais" e o fechamento por `2026-08-05-auditoria-telas.md` (linhas 13-15, 35-45).
- `.claude/skills/visual-system-experiment/SKILL.md` — vale o protocolo; **não valem** os tokens de `DESIGN_SPEC.md` e "HeroUI única" (linhas 19-22).
- `.claude/memory.md` — vale o índice; **não vale** a seção "Visual language" (linhas 19-23).

**ADRs parcialmente legados:**

- `ADR-20261022-fundacao-dados-bairros-ocultar-chamados` — **não valem:** §1.4 (CEP/coordenada "nunca gravados", já marcado "Substituído em 22/10/2026", linha 59) e §1.5 (imóvel sem endereço, linhas 66-71). **Valem:** §1.1-1.3 (catálogo/busca/bairro do perfil), §2 (ocultar), §3 (chamados).
- `ADR-20261020-identidade-visual-e-tema-escuro` — **não vale:** §1 (pele = brandbook/Brasa) nas telas portadas. **Valem:** §2 (claro/escuro, Automática), §3-§4 e os ativos de marca.
- `ADR-20261006-anuncios-salvos-e-moderacao` — **não vale:** "Figma atual como especificação" (linhas 15-16). **Valem:** salvos privados, denúncia/ocultação de listing, trilha auditável, endpoint autenticado de mídia.
- `ADR-20260925-pagina-do-negocio` — **não valem:** D1 ("Explorar é a cidade, por intenção"), D12 (entradas Chegando/Saindo) e D6 (Destaque/Plano pagos). **Valem:** D2, D3, D4, D5, D10-D11, D13.
- `ADR-20260925-memoria-de-indicacoes` — **não vale:** "A Comunidade ganha as vistas Conversa e Indicações" (linhas 75-76). **Valem:** D1-D4, `list_indications`, busca sem acento e `/indicacoes`.
- `ADR-20260909-resposta-que-resolveu` — **não valem:** D1 (uma coluna `resolved_reply_id`) e D5, refeitos em dois campos. **Vale:** o marcador escolhido por quem perguntou.
- `ADR-20260909-pedidos-e-conversa-contextual` — **não valem:** D1 (destinatário fixo) e D5, emendadas pelo ADR-20261015. **Valem:** D2 (contexto imutável), D3 (conversa de evento), D4 (anexo).
- `ADR-20260909-midia-de-membro` — **não vale:** o bucket `community-images` (vila). **Valem:** `listing-photos`/`post-photos`, leitura derivada, EXIF removido.
- `ADR-20260909-anuncios-mercado-e-moradia` — **não valem:** D5 (localização proibida, revogada) e D3 no ramo `community`. **Valem:** D1, D2, D4, D6, D7.
- `ADR-20260908-perfil-campos-opcionais` — **pendente:** exposição de Força/OM a terceiros (BLOCK-AFFILIATION). **Valem:** `profile_affiliations`, visibilidade por campo, padrão invisível, remoção que apaga.
- `ADR-20260901-design-system` — **não valem:** §Decision ("Casa comum", linha 30) e o D31 light-only. **Valem:** sistema canônico único, tokens primitive→semantic→component, governança/prova por runtime.
- `ADR-20260820-conta-de-prestador` — **não valem:** D1 (entrada só por convite) e D2 (ficha da comunidade). **Valem:** D3-D7.
- `ADR-20260820-alcance-pago` — **não valem:** D1/D2 (unidade vendida, R$49/mês). **Valem:** D4 (ordenação não lê dinheiro), D5, D6, D7.
- `ADR-20260816-transferencia-e-pertencimento` — **não vale:** a decisão 6 na parte de vila. **Valem:** transferência como estado declarado, localidade corrente e um vínculo de saída, degradação para leitura, um perfil por pessoa.
- `ADR-20260816-shells-e-navegacao` — **não valem:** os containers antigos (`cidade/community/groups/me`, depois `inicio/explorar/comunidades/perfil`). **Valem:** shells por papel e "destino novo entra num container, nunca vira aba".
- `ADR-20261016-mapa-de-bairros` — **não valem:** §§3-5 (proibição de coordenada; geocodificação e distância fora de escopo). **Valem como referência não aprovada:** §§1-2 (MapLibre, OpenFreeMap, malha do IBGE).
- `ADR-20260914-saida-de-comunidade` — **não vale:** o objeto (vila) e toda a mecânica de vila. **Reaproveitáveis para grupos:** "conteúdo permanece atribuído", "pedido pendente cancelável" e "o dono não sai sozinho".

**Outros arquivos parcialmente legados:**

- `docs/agents/DESIGN_SYSTEM.md` — **valem:** §1 (ordem de autoridade), §3 (princípios), §5 (tokens em camadas), §8 (responsivo), §9 (acessibilidade/WCAG), §11 (governança/rubrica), §10.2-10.3. **Não valem:** §4.1 Casa comum/verde, §4.3 Public Sans, §6 "HeroUI única" (linha 313), §7.1 nav antiga, §10.1 "Minha comunidade", §12.2 tema escuro condicionado a D31.
- `docs/agents/CONTRATOS-PENDENTES-W00-2026-09-08.md` — **valem:** §1.1-§1.4 (BLOCK-AFFILIATION, BLOCK-LEGAL-AI, BLOCK-LEGAL-ENTRY, PROXY-SURFACE-RISK) e §2 (ambientes/dependências). **Não valem:** enquadramento de etapa W00 e pranchas 33/38/39/51/68/69 como alvo; §3 (estado de CI de 08/09).
- `docs/agents/AUDIT-PRODUCAO-2026-09-19-INICIO.md` — **não vale:** linhas 387-388 ("HeroUI continua sendo a biblioteca permitida ... pranchas").
- `docs/agents/AUDIT_LANCAMENTO-2026-08-25.md` — **não vale:** escopo "MVP de Manaus"/"feed da vila" como estado-alvo (linhas 48, 227).
- `docs/agents/HANDOFF-2026-09-09-fidelidade-pranchas.md` — **não vale:** a "Regra do dono" que torna a prancha critério de aceite (linhas 9-18) e a pendência de comparação (linhas 54-58).
- `docs/agents/REGISTRO-TESTES-2026-09-08.md` — **não valem:** contrato de nav `inicio/explorar/comunidades/perfil` (linha 46) e "HeroUI como única biblioteca" (linha 47).
- `docs/agents/W00-FECHAMENTO-2026-09-08.md` — **não valem:** nav antiga (linhas 18, 90) e "HeroUI única" (linha 43).
- `docs/agents/INVENTARIO-ROTAS-WEB-2026-09-08.md` — **não vale:** placeholders tratados como "prancha 01"/"prancha 61" (linhas 206-208).
- `docs/agents/VISUAL_AUDIT-2026-09-08-G0.md` — **não valem:** nav antiga (linhas 9-22) e "sidebar rica das pranchas" (linhas 43-46).
- `docs/agents/VISUAL_AUDIT-2026-09-08-TELAS.md` — **não vale:** coluna "Prancha" como critério (linhas 9-15).
- `docs/agents/VISUAL_AUDIT-2026-08-26-onda-g.md` — **não vale:** termo "listagem de vilas" (linha 41).
- `docs/agents/REVISAO-RECON-001-2026-09-08.md` — **não valem:** "Minhas comunidades"/roster da sidebar (linhas 68-70, 161).
- `docs/agents/AUDIT-2026-08-19-plano-vs-execucao.md` — **não valem:** "containers de navegação" e "fila de aprovação em vila" (linhas 36-42, 85-91).
- `docs/agents/PACOTE_ADVOGADO_BIVAQUE-2026-08-25.txt` — **não valem:** "Piloto: Manaus" (linha 12) e "escopado por comunidade/cidade" (linha 78); o parecer jurídico em si segue pendente.
- `docs/bivaque-html-kit/**` — vale a regra "HTML soberano / Material Web, não copiar UI do Next.js nem do Figma" (`AGENT_RULES.md:4`); obsoleto o ferramental Codex/18 agentes e o conjunto de módulos antigos (feed/comunidades).
- `docs/design/visual-guide-2026-09-06/{PHASE1_PRODUCT_CONTEXT.md, REFERENCE_DESIGN_SPEC.md, REFERENCE_VISUAL_GUIDE.md}` (design-audit) — vale o restante (escopo antes da ação, WCAG 2.2 AA, separação de papéis, prova de runtime); **não vale** a vila como camada normativa (REF-009 etc.).
- `docs/design/visual-guide-2026-09-06/PROCESSO-DE-CONSTRUCAO.md` — **não vale:** a sequência W00–W09 e a nav antiga; **observação:** a §0 (execução enxuta) ainda é citada como cadência pelo `AGENTS.md` desta branch.
- `docs/design/visual-guide-2026-09-06/DECISOES-2026-09-07.md` — ainda citado como vigente pelo `AGENTS.md` desta branch (rótulo militar exato, CPF rápido, motivo opcional, perguntas à cidade, OM opcional); conflita com BLOCK-AFFILIATION.
- `docs/design/visual-guide-2026-09-06/ARQUITETURA.md` — **valem:** recomendações de compartilhamento (domínio/contratos/tokens/Supabase) e autorização no servidor (linhas 26-48); **não vale:** HeroUI/Tailwind na web.
- `docs/legal/PRIVACIDADE.md` — **conflitos:** linha 30 ("não publica OM/posto/força") contra `DECISOES-2026-09-07.md:10` e `ADR-20260811-om-declarada`; linhas 21, 38 usam "comunidades" no plural (ADR-20261023).
- `docs/legal/CODIGO_DE_CONDUTA.md` — usa "comunidades" no plural; texto de aceite v2 anterior à decisão de 23/10.
- `docs/brand/{README.md:26-27, GUIDELINES.md:76, reference/BIVAQUE_brand_spec.md:35}` — afirmam "light-only/D31", já superado por `ADR-20261020`.
- `docs/superpowers/plans/README.md` — **valem:** armadilhas conhecidas (perfil fantasma do `.visual/`, `dev-server.pid`, pnpm via npx), pgTAP sem `db:reset`, "E2E precisa de humano", "nunca inferir BIVAQUE de PRODUCT_STATUS". **Não valem:** ordem de ondas A→B→C→D1 e P0→T→D2→E→F→G→H; "o que o produto deve ser = BIVAQUE.md"; o portão dos quatro ADRs de onda.
- `docs/superpowers/plans/2026-09-08-w00-fundacao-web.md` — **valem:** registro das Tasks 1-3, 3.5, 3.6 já executadas. **Não valem:** nav antiga, Tasks 4-7 e stubs "Conteúdo em construção".
- `docs/superpowers/specs/2026-09-08-reconstrucao-visual-web-design.md` — **vale:** §1 (backend/persistência no escopo; "UI pronta, backend pendente" não fecha) e a noção de gates; **não valem:** §3.1 nav antiga, o catálogo de rotas/pranchas e os shells herdados.
- `docs/superpowers/specs/2026-09-20-resposta-candidata-guia-design.md` — **vale:** §2 ("o que existe hoje, com evidência"); **não valem:** §3 em diante, recusados pelo ADR-20260921.
- `docs/superpowers/plans/2026-08-11-onda-b-coerencia-por-subtracao.md` — **valem:** demais remoções de affordance morta; **não vale:** Task 1 ("login promete senha que não existe"), contrariada pelo ADR-20260907.
- `docs/PRODUCT_STATUS.md` — vigente, mas com drifts conhecidos (login, navegação, afiliação, suspensão, Mercado/Moradia) que a auditoria §4.4 manda reconciliar.
- `docs/agents/tasks/**` (154) — **por família:** pranchas/Figma superados: `RECON` (42), `FIGMA` (2); vila/lote 5 (merecem conferência contra o ADR): `COM` (7, de 23/10); mobile (não bloqueia web): `MOB` (2); processo abandonado: `HARNESS` (1), `HRN` (5); **vigentes/recentes:** `PORT` (6), `SEC` (6), `DATA` (2), `HTML` (73, inclui HTML-000 = protótipo), `BIZ` (1), `HARNESS-001` (23/10) e o `TEMPLATE`.

---

## 3. INCERTO — o que falta para decidir

- `docs/decisions/ADR-20260811-om-declarada.md` — falta aprovação humana explícita (`status: proposed`) e a decisão de BLOCK-AFFILIATION sobre exibir Força/OM a outros membros. O protótipo mostra "Força" no perfil (`ADR-20261022-entrada-do-prototipo.md:56`), o que o texto atual não cobre.
- `docs/agents/HARNESS.md` — marcado **DRAFT**, sem referência nos `AGENTS.md` atuais; falta decidir se ainda ordena ou foi absorvido por `AGENT_ARCHITECTURE.md` + `TASK_CONTRACT.md`.
- `docs/agents/AUDIT_PROMPT.md` — template reutilizável, mas fixa os planos de 16/08 (linha 25); falta decidir se continua sendo o procedimento de auditoria adotado.
- `docs/design/visual-guide-2026-09-06/src/*.board.json` (14) — renderizam pranchas antigas, mas apontam contrato/código atuais (`75-web-conversas.board.json:18-19`); falta decidir se são trilha histórica ou ainda amarram cobertura.
- `docs/design/visual-guide-2026-09-06/src/36-web-auth-entrada.html` e `src/70-web-evento-organizar.html` — fontes regeradas já apontando para código atual sobre a geometria antiga; mistura de referência antiga com contrato atual.
- `docs/bivaque-html-kit/PLANO_COMPLETO_18_AGENTES.md` — a base visual declarada (`Bivaque_Material_Web.html`, 13/10) é a atual, mas o plano de especialistas/feature set pertence ao processo Codex abandonado.
- `docs/agents/design-audit/experiments/EXP-004-*` — `ADJUDICATION.md:235` ainda lista EXP-004 como experimento **aberto**, embora o dono tenha decidido a pele por outra via; o encerramento formal é decisão humana.
- `docs/legal/REVISAO_LANCAMENTO.md` — classificado HISTÓRICO, mas mantém "decisões humanas pendentes" (linhas 39-50) que podem continuar abertas.
- `docs/agents/tasks/**` — qual contrato específico ainda descreve vila/feed antigo e se algum já reflete o ADR de 23/10 não é verificável sem abrir os contratos (a tarefa proibiu). A família `COM → feed/N2` é hipótese, não evidência.
- `docs/agents/design-audit/{RULE_LEDGER,CONFLICT_MATRIX,RUNTIME_FINDINGS,ADJUDICATION,PHASE6_REVIEW}.md` — HISTÓRICO pelo papel, mas não foi possível afirmar que nenhum documento vivo os trate como autoridade corrente.
- `.claude/settings.local.json` — não existe nesta worktree (existe no checkout principal); os hooks o referenciam como ponto de registro (`bash-guard.sh:7`), então a ligação dos hooks não é verificável aqui.

---

## 4. Contagem por classe

| classe | arquivos |
|---|---:|
| VIGENTE | 93 |
| LEGADO | 82 |
| HISTÓRICO | 360 |
| INCERTO | 20 |
| **Total** | **555** |

Conferência de escopo: 527 em `docs/**` + `AGENTS.md` + `CLAUDE.md` + 24 em `.claude/**` + `.opencode/opencode.json` + `.mcp.json` = 555.
As imagens (101 PNG em `docs/**`, 9 WEBP, 3 JPG) e os 154 contratos `docs/agents/tasks/*.task.yml` entraram agrupados, com a contagem declarada em cada linha, conforme permitido para `tasks/` ("só pelo nome").