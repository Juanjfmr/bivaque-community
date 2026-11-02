# Parecer preservado da sessão FIGMA-001

Sessão: `ses_eefd3e9f5ffeOQp6O91qgVMuWC`. Extração somente do último texto do parecer, sem ferramentas, prompts ou credenciais.
O texto abaixo é o parecer do modelo; limites e adjudicação constam no índice de rastreabilidade.

Provas concluídas. Parecer abaixo.

---

# Parecer independente — FIGMA-001 (Codex: coordenador)

**Candidato exato:** checkout `C:\Users\juana\.codex\worktrees\figma-production\bivaque-community`, `HEAD = b9faf50c282dc432240de867da0692486c4f4563`, `review-polish-snapshot.json` com 31 hashes.
**Reexecução de hash:** **31/31 MATCH antes e depois** de todas as provas (`HASHCHECK match=31 mismatch=0`). Não toquei em arquivo rastreado (`git status` 80 linhas antes e depois); meus artefatos vivem em `.visual/figma001-verifier/` (gitignored).

## Veredito: **PASS** — com 2 limites registrados (nenhum é falha determinística do candidato)

Não recebi defesa/sessão/handoff do implementador; trabalhei só de contrato, código, seed e runtime.

### Compatibilidade build/fonte/servidor (isolado 55621/55622)
- O build (`apps/web/.next`, BUILD_ID 03:00 local) **inlina 55621**; nenhuma ocorrência de 55321 em `apps/web/.next`.
- Porta 3000 = `next start` **deste** checkout (PID 47700, iniciado 03:02, depois do build). Fontes do candidato têm mtime ≤ 02:42 < build. Servidor/bundle/fonte consistentes.
- Shared 553xx/554xx intactos (só listados via `docker ps`, nunca tocados).

### E2E do contrato (execução própria, reusa o servidor)
- `test:e2e tests/e2e/messages/conversas.spec.ts` (isolado, sem CI, sem rebuild):
  - 1ª rodada: **20 passed / 1 failed** (só `desktop-1440` do teste "contato de prestador": botão `Conversar` ausente na ficha em 5s).
  - 2ª rodada completa: **21 passed**.
  - Isolado do teste que falhou, `--project=desktop-1440 --repeat-each=3`: **3 passed**.
- Cobre: membro abre/responde/persiste + reload; dono abre pedido/responde e **membro vê após reload** (contexto de navegador próprio); não-prestador negado por PostgREST (**42501**) e por UI (`/community`); membro sem alcance = não-encontrada honesta; thread `shared_group` com **offline → "Não enviado" com rascunho preservado → retomada entrega uma vez**; terceiro com leitura vazia e insert 42501; anon → `/login`.

### Prova CRÍTICA — segundo prestador real, autenticado, não participante
Fixture descartável criada **só no stack isolado** (`auth.admin.createUser` + `provider_accounts` + `provider_profiles`, sem schema/policy/migration):
- `is_provider_account(fixture) = true`; `fixture.auth.uid` = uid criado (verdadeiro).
- DB direto como o terceiro: `dm_conversations` → `[]`; `dm_messages` → `[]`; `insert` com **`sender_id` do próprio terceiro → erro `42501`** ("new row violates row-level security policy"). Sem spoof de sender, sem uuid inventado.
- Navegador: `/prestador/conversas` (dono) **não lista** a conversa alheia; URL direta `/prestador/conversas/<id>` → **"Conversa não disponível"**, sem vazar a mensagem; back href = `/prestador/conversas`.
- Fixture **removida** ao fim (cascade; `remaining verifier profiles = []`).

### Provas de UI (navegador, 24/24 asserts)
- Dono: h1 do thread = **nome pessoal** "Diego Almeida" (não o negócio); contexto comercial aparece só como contexto; back = `/prestador/conversas`.
- Membro: h1 = **"Climatiza Manaus"**, rótulo "Prestador", back = `/messages`, **reload reconstrói** (h1 estável).
- anon: `/messages/<id>`, `/prestador/conversas`, `/prestador/conversas/<id>` → `/login`.
- membro não-participante: estado honesto; painel do prestador → `/community`.

### Capturas 375/768/1440 + confronto Figma
Rotas `/messages/<id>`, `/messages`, `/prestador/conversas`, `/prestador/conversas/<id>`, `/prestador` — todas **authenticated=yes, valid=true, 0 high**, rota/h1/ator corretos (ex.: `/prestador` voltou a "Painel do prestador" nos 3 viewports). Só achados `medium` = `font-too-small` (metadados 12px vs token `minimumTextSize: 13`; o próprio Figma usa 12px). Sem overflow/touch-target/contraste **high**.
Confronto: cards, topbar (Buscar/Ctrl K, Conversas, Ajuda, Manaus, sino, avatar) e sidebar batem com as pranchas; composer de resposta idem. Divergências concretas registradas: (a) selo "● Não lida" ausente — sem estado de leitura no schema, contrato proíbe inventar; (b) botão "Acompanhamento" da prancha do thread não renderizado (módulo futuro; sem link morto — hoje há "Ver origem" + "Bloquear"); (c) shell do prestador não tem prancha Figma própria (reusa a apresentação do membro, autorizado).

### Checagens de segurança/contrato
- Bundle cliente: **nenhuma** chave privilegiada (`service key literal` ausente de todo `.js`); só a anon key pública. O match `"sb_secret_"` é o detector do SDK.
- Navegação: sem Comunidades/Grupos; Conversas no shell superior e na bottom-nav mobile (`Início/Explorar/Perfil`).

## Limites (não-verificados por mim)
1. **Não reexecutei `gate` nem `build`** (evitei duplicar/concorrer, conforme instrução). Confirmei o resultado do candidato em `candidate-polish-tool-proofs.json` (gate VERDE 06:59Z) e **provei** que o servidor na 3000 serve o build do HEAD hasheado inlinando 55621 — mas "gate verde" é relato do candidato + consistência de build, não reexecução minha.
2. **HTTP 500 antigo** (`/prestador` desktop-1440, 10×500, `heading:null` em `figma001-final-provider-painel`) **não reproduziu**: recaptura atual válida, 0 console error, 0 high. Causa raiz **não comprovada**. A falha intermitente do E2E (1 em ~24 execuções do mesmo teste) também **não reproduziu** (2ª rodada 21/21 + isolado 3/3) — classifico como flake, provavelmente concorrência/SSR, não defeito determinístico do candidato; fica registrado, não fechado como provado.

## Artefatos brutos (para o coordenador)
- `.visual/figma001-verifier/e2e-conversas-raw.txt` (20/1), `e2e-conversas-raw-2.txt` (21/0), `e2e-desktop-repro.txt` (3/0)
- `.visual/figma001-verifier/testbed-output.json`, `browser-output.json` (24/24)
- `.visual/figma001-verifier/cap-*/report.json` + `shots/*.png`; `shot-A/B/C-*.png`
- Hashes: `.visual/opencode-figma-20261005/orchestration/review-polish-snapshot.json`

Não enviei nada ao implementador, não alterei fontes nem banco compartilhado, não fiz deploy/push/merge/reset. Evidência completa; nenhuma afirmação de PASS depende do relato do executor.
