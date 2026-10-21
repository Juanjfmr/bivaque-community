# Passagem de bastão da coordenação: Claude (Opus) → Codex

Data: 19/10/2026, noite. O dono é **Juan**. Responda a ele sempre em português do Brasil, com uma decisão
por vez. A cota do Opus acabou, e a partir daqui **o Codex coordena**.

## Seu papel como coordenador

Você **não implementa**: você planeja, delega, revisa, verifica e entrega.

| Papel | Quem |
|---|---|
| Coordena, escreve contratos, verifica, faz commit quando o implementador não consegue, abre PR | **Codex** (você) |
| Implementa | **DeepSeek V4.1 Flash** pelo OpenCode, inclusive banco e RLS. Ele foi testado em 19/10 e se saiu bem: TDD, escopo respeitado, honesto sobre bloqueios. |
| Revisa o trabalho do implementador | **Outro modelo:** você (Codex) em modo só leitura, ou o DeepSeek quando quem implementou foi o Codex |
| Aprova merge e deploy | **Só o dono** |

Regra de ouro: **quem implementa não revisa o próprio trabalho.** Quem verifica roda os testes de verdade e
lê a saída antes de dizer que passou.

### Como chamar o DeepSeek para implementar

Escreva a tarefa num arquivo `.md` com contexto, passos em TDD, regras e o formato de resposta. Use como
modelos os arquivos `tarefa-*.md` da pasta de rascunho da sessão anterior, ou o roteiro do lote. Depois rode
no PowerShell, a partir da worktree:

```powershell
& "C:\Users\juana\.local\bin\opencode.cmd" run --agent build -m opencode-go/deepseek-v4.1-flash -f "<tarefa.md>" "Execute a tarefa descrita no arquivo anexado, no repositório do diretório atual. Siga o TDD e as regras dele." *> "<log>"
```

- Para revisão só de leitura, use `--agent plan` em vez de `build`.
- Prompts longos vão sempre por `-f`, porque o PowerShell corrompe argumentos longos.
- O DeepSeek não consegue rodar `supabase db reset` (o guard-rail bloqueia) e usa `supabase migration up
  --local`. **Você** faz o reset limpo e o `test:db` antes de aceitar o trabalho.

### Verificação obrigatória antes de cada commit e antes do PR

```bash
npx supabase db reset --local --no-seed     # sem seed, como o CI; com seed uns 40 testes falham por depender dos dados
npx pnpm@11.18.0 test:db                    # pgTAP
npx pnpm@11.18.0 exec vitest run <pastas>   # unitários da área
npx pnpm@11.18.0 gate                       # lint, typecheck, test, secrets; o build pula sem apps/web/.env.local (normal)
```

- O Supabase local precisa do Docker Desktop. Se ele cair com "The file cannot be accessed by the system" num
  socket (`Docker\run\dockerInference` ou `docker-secrets-engine\engine.sock`), reiniciar o Windows resolve.
- **Nunca** use `db push` ou `--linked`, porque esse é o banco de **produção** (`pjgvnfiscwwfhezbqwxi`).
- Nunca copie nem crie `.env.local`. Nunca faça commit de segredos.

### Regras do repositório que valem sempre

- Leia o `AGENTS.md`.
- Toda tarefa tem contrato `docs/agents/tasks/<ID>.task.yml`, que precisa passar em
  `node scripts/agents/task-contract.mjs`. Tarefa R3 (RLS, dado pessoal, pagamento) exige `adr:` aprovado.
- Uma migration aplicada nunca é editada: crie uma nova.
- PR para a `main` só com o CI verde em "Install, test, and build", que roda pgTAP e E2E.
- O robô "Claude Code review (DeepSeek)" do CI falha por falta de crédito na conta direta da DeepSeek. Isso
  não é falha do código; o dono sabe.
- **Merge e deploy só com o ok explícito do dono.**

## Onde estamos

### 1. Lote de segurança: branch `codex/seguranca`, worktree `.claude/worktrees/seguranca`

O roteiro está em `docs/agents/LOTE-SEGURANCA-2026-10-19.md`. O ADR é
`docs/decisions/ADR-20261019-correcoes-de-seguranca-pre-lancamento.md`, que registra a exceção do PDF de
identidade, guardado byte a byte por causa da assinatura do governo.

| Tarefa | Situação |
|---|---|
| SEC-001 conteúdo moderado (leitura, escrita do autor, interações) | ✅ commitada e verificada |
| SEC-002 telefone do prestador (grant por coluna + RPC) | ✅ |
| SEC-003 purga recursiva da conta | ✅ |
| SEC-004 limpeza de EXIF/GPS no servidor (`sanitize-image.ts`, sharp) | ✅ |
| SEC-005 outbox: não envia na dúvida e processa lote grande em blocos (versão do DeepSeek) | ✅ |
| SEC-006 nada grava imagem direto no Storage; Mercado, Moradia e Pedido enviam pelo servidor, foto a foto | ✅ `c25aa239` + correções `29fd1fee` (DeepSeek). Verificado: reset limpo, 1.929 pgTAP, 361 unitários, gate verde |

**O que falta, nesta ordem:**

1. **A revisão de confirmação da SEC-006 terminou com FAIL.** O texto completo está em
   `codex-review-sec006-b.md` (caminho abaixo).
   - M1 e L3 ficaram resolvidos; o M2 ficou parcial.
   - Há **3 regressões novas, todas MEDIUM:**
     - o Mercado fica preso em "Enviando…" quando uma etapa falha;
     - o Pedido com 7 fotos descarta todas sem avisar e mostra sucesso;
     - a Moradia gera posições de foto duplicadas.
   - Há também **lacunas antigas** nas actions por foto: quantidade burlável na Moradia, fotos órfãs e troca
     de formato no Pedido, atomicidade incompleta.
   - Mande o DeepSeek corrigir tudo isso, com teste primeiro. Se precisar de constraint no banco, use uma
     migration nova. Depois verifique e revise de novo antes do PR.

   Ler a sua própria revisão de confirmação da SEC-006. O resultado fica
   em `codex-review-sec006-b.md`, na pasta de rascunho da sessão anterior:
   `C:\Users\juana\AppData\Local\Temp\claude\C--Users-juana-AppData-Roaming-Claude-scratch-workspaces-a0b72b39-02e4-4ec9-8144-3ef364ba0999-ef306464-50e5-4883-82e6-5a1e27f72244-scratch-2026-10-14-106e75\6fac2a1f-1a9a-4793-92a4-5b7b8851dae3\scratchpad\seguranca\`
   - Se ela não existir, rode a revisão de novo sobre `git show 29fd1fee`.
   - Se houver achado MEDIUM ou mais grave, mande o DeepSeek corrigir, verifique e só então avance.
2. **Abrir o PR** `codex/seguranca` → `main`, sem merge.
   - O corpo lista cada SEC, com o teste que falhava antes e passa depois.
   - O corpo cita quem implementou e quem revisou em cada tarefa: SEC-001 a 004 pelo Codex; SEC-005 e
     SEC-006 pelo DeepSeek.
   - A branch `codex/seguranca-ds` foi só o teste comparativo e não entra no PR.
3. **Acompanhar o CI.** Se o E2E quebrar por causa das mudanças de upload, corrija pelo mesmo ciclo.
4. **Pedir o ok do dono** para o merge. Depois do merge, o workflow aplica as migrations no banco remoto:
   confira o resultado.

**Fora do lote, e decisão do dono:** a exposição da afiliação (Força e OM, card `BLOCK-AFFILIATION`).

### 2. Lote de lançamento: branch `codex/lancamento`, worktree `.claude/worktrees/lancamento`, só local

- **R69** (lançamento sem cobrança no protótipo) está pronta, com commit `28e6fbde` e o registro em
  `prototypes/bivaque-html/docs/ROUND_69.md`. O produto pago fica atrás de `window.BIVAQUE_LABS.paidPlans`.
- **R70 e R71** (landing v8 com título F) **ainda não começaram**:
  - R70 aplica a landing no protótipo, a partir de `.visual/bivaque-html-landing-v3/v8/maquete-v8.html`, com
    `?t=f` como título final;
  - R71 porta a landing para o Next (`apps/web/app/landing/`).
  - A R71 é o **piloto do porte visual**: Material Web, fontes e tokens do protótipo dentro do Next,
    comparados por captura de tela.
- Essa branch também tem cópias dos commits de documentação (auditoria e contratos SEC). Ao abrir o PR dela,
  rebaseie sobre a `main` depois do merge do lote de segurança.

### 3. Plano geral: opção A, confirmada pelo dono

**O Bivaque real é o Next.js + Supabase, e o protótipo HTML é a especificação completa** (visual, UX,
textos e comportamento). O plano em lotes está em `docs/AUDITORIA_ADERENCIA_2026-10-19.md`, na seção 6:

1. contratos;
2. segurança (este lote);
3. fundação de dados: bairros, propostas, negócio gratuito municipal, ocultar, chamados;
4. piloto visual com a landing;
5. telas por jornada;
6. aceite com as provas do protótipo adaptadas.

**Podem esperar:** cobrança (sem CNPJ, com ADR novo), IA documental e mobile.

### 4. Direção visual: decidida em 20/10, branch `codex/lancamento` (commit `293d8d2c`)

A decisão está no `docs/decisions/ADR-20261020-identidade-visual-e-tema-escuro.md`, e o material, em
`docs/brand/` (brandbook em PDF, guia, tokens, logos e maquete).

- **A pele do Bivaque real é o brandbook oficial** (Grafite, Papel, Brasa, Noto Serif e Noto Sans), com os
  ajustes da maquete `docs/brand/maquete-2026-10-20/`:
  - Brasa só na ação principal e no botão Criar; a cidade em Brasa escurecida `#9E3B2C`;
  - links, ações secundárias, aba ativa e contadores em Grafite; o vermelho fica só para erro;
  - cantos de 12 px (abas com 10 px), botão Criar como quadrado de cantos suaves e ícones Outlined;
  - avatares a partir de 28 px e busca alinhada à esquerda.
- **Tema claro e escuro desde o porte, com o padrão Automática.** O escuro segue a página 13 do brandbook:
  - Carvão, Elevado e Brasa Clara;
  - logo branco inteiro;
  - fotos 10% mais escuras.

  Este ADR substitui a D31 (light-only).
- **Toda cor vem de token, com o par claro e escuro.** Cada tela portada é aceita nos dois temas pela
  comparação de captura.
- **Pendente com o dono:**
  - os SVG oficiais do logo (no PDF eles estão em PNG de 1.024 px);
  - os ícones de app (16, 32 e 48 px, PWA e maskable).

  Até chegarem, use os PNG de `docs/brand/reference/`.
- **Ordem sugerida:**
  1. aplicar a pele primeiro no protótipo (R70, junto com a landing v8);
  2. portar a landing para o Next (R71), que é o piloto do porte visual.

  Assim o protótipo continua sendo a especificação exata do que vai para o Next.

## Decisões do dono que você não deve reabrir

- O produto é nacional, para as três Forças, organizado por cidade e bairro. Não é um app de transferências.
  O mote é "Juntos somos mais fortes".
- O lançamento é **sem cobrança**: a página do negócio é gratuita e completa, e ninguém aparece como
  Patrocinado.
- **CEP e coordenadas nunca são gravados.** O bairro é escolhido pela busca. O PDF de identidade é aceito e
  guardado byte a byte.
- O dado militar é público (Portal da Transparência): não proteja demais na cópia.
- Uma decisão por vez, com uma recomendação clara.
