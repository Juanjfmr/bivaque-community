# Passagem de bastão da coordenação: estado em 22/10/2026

O dono é **Juan**. Responda sempre em português do Brasil, com uma decisão por vez e uma recomendação clara.

Este documento substitui o [HANDOFF-COORDENACAO-2026-10-19](HANDOFF-COORDENACAO-2026-10-19.md). Os comandos daquele
documento continuam válidos onde este não diz o contrário.

## Papéis

| Papel | Quem |
|---|---|
| Coordena, escreve ADR e contratos, revisa, verifica, abre PR | **Opus (Claude)**, de novo desde 21/10 |
| Implementa | **DeepSeek V4.1 Flash** pelo OpenCode (`--agent build`), inclusive banco e RLS. Roda em paralelo, uma worktree por tarefa |
| Revisão independente | **Codex** (gpt-6.1-sol, esforço alto, só leitura) quando a cota permite; obrigatória em R3 |
| Aprova ADR, merge e deploy | **Só o dono** |

Quem implementa não revisa o próprio trabalho. Quem verifica roda os comandos e lê a saída.

## Como paralelizar o DeepSeek (aprendido em 22/10)

- **Uma worktree e uma branch por tarefa:**
  - criar com `git worktree add -b <branch> .claude/worktrees/<nome> <base>`;
  - rodar `npx pnpm@11.18.0 install --frozen-lockfile` em cada worktree.
- **Disparar sem bloquear**, com o PowerShell:
  `Start-Process powershell -ArgumentList '-NoProfile','-Command',"Set-Location '<worktree>'; & 'C:\Users\juana\.local\bin\opencode.cmd' run --agent build -m opencode-go/deepseek-v4.1-flash -f '<tarefa.md>' '<instrução curta>' *> '<log>'" -WindowStyle Hidden`.
- **Duas tarefas de banco ao mesmo tempo precisam de duas pilhas do Supabase:**
  - na segunda worktree, trocar `project_id` e portas em `supabase/config.toml` (por exemplo, `bivaque-dados2` e
    portas 564xx);
  - rodar `git update-index --skip-worktree supabase/config.toml`, para nunca comitar a troca;
  - rodar `supabase start`.
- **O DeepSeek não consegue rodar `db reset`.** Quem verifica roda:
  - `npx supabase db reset --local --no-seed`;
  - `npx pnpm@11.18.0 test:db`;
  - `npx pnpm@11.18.0 gate`.

  Depois de verificar na pilha principal, rode `npx supabase db reset --local` (com seed) para os e2e.
- **E2E local sem `.env.local`.** Exporte as variáveis do `supabase status -o env` no ambiente: `SUPABASE_URL`,
  `NEXT_PUBLIC_*`, `SUPABASE_ANON_KEY`, `USER_PASSWORD` e `BIVAQUE_*=bivaque-e2e-local`.
  - O Chromium local é
    `C:/Users/juana/AppData/Local/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-win64/chrome-headless-shell.exe`.
  - Antes do e2e, confira que a porta 3000 está livre: o Playwright reaproveita servidor antigo.
- **Contrato escrito pelo DeepSeek pelo PowerShell pode sair com BOM**, e o validador recusa. Linha de comentário
  com aspas também é recusada. Normalize antes do commit.
- **A bateria do protótipo roda sozinha.**
  - Parar a tarefa não mata o `run.sh`. Mate pela linha de comando: todo processo que casa com
    `run.sh|round\d+-proof|runtime-proof`.
  - Falha em bateria concorrida só vale depois de rodar de novo sozinha.

## Onde estamos (22/10, fim do dia)

**Mergeado na `main`:**

| PR | Conteúdo | Observação |
|---|---|---|
| #98 | Lote de segurança | 11 migrations em produção em 22/10, depois que o dono trocou o token do Supabase |
| #99 | Fundação de dados: DATA-001 (bairros e bairro do perfil) e DATA-002 (ocultar e chamados) | 9 migrations em produção |
| #100 | Lote Lançamento do protótipo (R69 a R72) e base visual **R72** (`7e7657c3…`) | |
| #101 | Landing v8 no Next (PORT-001, R73), o piloto do porte visual | No ar em https://bivaque-community-web.vercel.app, com o conteúdo no HTML do servidor |
| #102 | ADR-20261022-localizacao-padrao-de-mercado | |

**Plano (auditoria, seção 6):**

- Lotes **1** (segurança), **2** (fundação, em parte) e **3** (piloto visual) entregues.
- Próximos: **4** (Entrada, perfil e contexto), **5** (Comunidade e grupos), **6** (Negócios, pedidos e conversas),
  **7** (Desapegos e Imóveis, agora com a localização no padrão de mercado e a malha de bairros do IBGE),
  **8** (Agenda, Guia e operação) e **9** (aceite).
- Cada tela portada segue o ADR-20261022-porte-visual-material-web:
  - Material Web por adaptadores cliente;
  - tokens escopados;
  - a tela sai do HeroUI;
  - comparação de captura com o protótipo nos dois temas.

**Kanban** (`tools/backend-kanban/public/board.json`) atualizado em 22/10. Os próximos cards são:

- `DATA-IBGE-BAIRROS`;
- `LOC-IMPL`;
- `AJUDA-PUBLICA`.

## Pendências com o dono

- **Exposição da afiliação** (Força e unidade para outros membros), `BLOCK-AFFILIATION`. A unidade declarada para a
  própria distância já foi aprovada no ADR da localização.
- **Ajuda pública.** No Next, `/ajuda` exige sessão, e a landing ficou sem "Ajuda" e "Fale com a gente".
- **Hierarquia de CTA por tela no porte.** No protótipo, a comparação de propostas tem um "Escolher" em Brasa por
  proposta.
- **Crédito do DeepSeek no robô de revisão do CI.** Ele falha em todo PR e é ignorado no critério de merge.
- **Disco quase cheio.** O banco do OpenCode (`~/.local/share/opencode/opencode.db`) passa de 8 GB; o dono decide
  limpar.

## Decisões do dono que não se reabrem

- O produto é nacional, para as três Forças, organizado **por cidade**. O bairro é um extra de filtro, distância e
  mapa. Não é um app de transferências. O mote é "Juntos somos mais fortes".
- O lançamento é **sem cobrança**.
- **O rigor de segurança está na entrada**, que exige vínculo confirmado. Lá dentro, o produto segue o padrão de
  mercado:
  - **localização** (ADR-20261022-localizacao-padrao-de-mercado):
    - CEP e coordenada são guardados;
    - CEP obrigatório no imóvel e opcional no desapego;
    - a coordenada do perfil serve só para cálculo e nunca é mostrada;
  - **"Mostrar meu bairro"** vale só para o bairro do perfil.
- O PDF de identidade é aceito e guardado byte a byte.
- O dado militar é público: não proteja demais na cópia.
- **O protótipo HTML é a especificação.** O Next é refeito para ficar igual (opção A).
- **Não existem comunidades** no produto atual. `communities` e `community_id` são legado.
- Merge e deploy só com o ok do dono. O classificador do modo automático pode bloquear o merge; nesse caso, peça e
  espere o dono confirmar, sem contornar.
