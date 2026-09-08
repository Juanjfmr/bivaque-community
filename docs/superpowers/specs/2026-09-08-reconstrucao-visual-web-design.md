# Design — Reconstrução visual web (guia 2026-09-06), orquestrada com implementador externo

> Data: 2026-09-08 · Status: aguardando revisão do responsável
> Autoridade: [`docs/design/visual-guide-2026-09-06/PROCESSO-DE-CONSTRUCAO.md`](../../design/visual-guide-2026-09-06/PROCESSO-DE-CONSTRUCAO.md),
> [`DECISOES-2026-09-07.md`](../../design/visual-guide-2026-09-06/DECISOES-2026-09-07.md),
> [`README.md`](../../design/visual-guide-2026-09-06/README.md) do guia visual.
> Sequência de referência: as 8 etapas da §7 do PROCESSO (substituem a ordem histórica de ondas).

---

## 1. Problema

O guia visual de 06/09/2026 define a experiência-alvo (superfícies claras, verde
profundo, navegação **Início / Explorar / Comunidades / Perfil**, Guia e Mercado
como entradas explícitas). O código web hoje reflete a navegação histórica
("Cidade / Minha comunidade / Grupos / Eu", travada por
`tests/scope/navigation.test.mjs`) e não tem rotas de Explorar nem de Mercado/Moradia.

São **31 pranchas web** no manifesto do guia. Reconstruí-las é trabalho de
**apresentação** — traduzir cada prancha em componentes responsivos que fecham
entrada, ação, feedback, retorno e falha principal, **sem inventar backend,
permissão ou regra**. A autorização no servidor, RLS, persistência e o esquema de
confiança permanecem como estão ou passam pelo caminho R3 próprio.

Imagem gerada, código escrito, CI e runtime são estados diferentes
(PROCESSO §14). Não existe hoje cadeia integralmente automatizada de revisão
independente + prova de execução; a CI externa está bloqueada desde 2026-08-31
(limite de gastos do GitHub Actions). Qualquer alegação de "verificado" tem que
dizer qual camada de fato rodou.

## 2. Decisões

| # | Decisão | Justificativa |
|---|---|---|
| **D1** | **Implementador externo**: `opencode run` dirigindo `alibaba-token-plan/qwen3.8-flash` (multimodal, headless). Claude é **orquestrador + revisor + verificador visual** | O responsável pediu esse arranjo. `opencode-go/qwen3.8-flash` está sem saldo; `alibaba-token-plan/` é a rota autenticada |
| **D2** | **Unidade de execução = contrato por tela** (`docs/agents/tasks/RECON-*.task.yml`), uma mudança de comportamento observável por contrato | É a unidade real do repo (`TASK_CONTRACT.md`). Contrato inválido não vai para execução (`node scripts/agents/task-contract.mjs`) |
| **D3** | **Agrupamento por fluxo funcional**, alinhado às 8 etapas da §7 do PROCESSO; um grupo por vez | Bate com "não espalhar por vários módulos antes de fechar o ciclo" |
| **D4** | **Auditoria visual (Task 7) fecha cada grupo** e bloqueia o próximo. Veredito escrito em `docs/agents/VISUAL_AUDIT-<data>-<grupo>.md` | `docs/superpowers/plans/README.md` — o gate é não ter olhado. Telas que um grupo cria são auditadas dentro dele |
| **D5** | **A troca de navegação (G0) é feita pelo Claude**, não pelo qwen | Mexe em contrato de scope test, no grupo de rotas `(shell)`, em `bottom-nav.tsx` e no `app-shell`. Mudança de contrato deliberada, não trabalho de apresentação |
| **D6** | **Nada de persistência R3 pelo qwen.** Fallback de identidade (pranchas 38, 69) e Força Armada/OM autodeclarada (39, 51): o qwen constrói a UI e os estados; **nada persiste**. A camada de dados (ADR + contratos + RLS + testes na mesma migration) fica com o Claude / caminho R3 | AGENTS.md: "a coluna de escopo e as políticas que a leem entram na mesma migration — nunca no futuro". Correções de 07/09 autorizam os campos declarados, não removem os requisitos técnicos de privacidade |
| **D7** | `--auto` no `opencode run` (auto-aprova permissões não-negadas). Guard-rails globais do OpenCode seguem valendo (`--linked` negado, `db:reset` pergunta) | Sem `--auto` o loop headless trava em cada escrita de arquivo. Risco contido ao working tree não-commitado; revisão + gate + auditoria antes de qualquer commit |
| **D8** | **"Perfeito" = critério objetivo por tela**, não paridade de pixel | O guia diz que diferenças intencionais são válidas se explicadas por escrito. Ver §5 |
| **D9** | Trabalho continua na branch `work/apos-entrada-visual`; **um commit convencional por tela** | É a branch da entrada visual; `f2a0d33` já entregou a primeira fatia da prancha 36 |
| **D10** | **Board reconciliado na mesma leva.** Cada grupo ganha card com ID estável quando não houver um; `RECON-AUTH-ENTRADA-WEB` e `DS-001` já existem | AGENTS.md: o agente que descobre a tarefa registra; card `done` não mantém drift aberto |

## 3. Fronteiras — o que o qwen NÃO toca

Lista de `forbidden` herdada por todo contrato `RECON-*`:

- Autorização no servidor, migração de banco, RLS, esquema de confiança, regra de
  visibilidade de conteúdo.
- Campo, validação ou mensagem de recusa que decide quem entra.
- Fazer a tela prometer aprovação, prazo, SLA ou acesso que o servidor não garante.
- Ecoar em tela qualquer identificador enviado num formulário; revelar motivo
  interno de recusa.
- Introduzir família tipográfica, biblioteca de componentes (HeroUI v3 é a única) ou
  modo escuro novos.
- Cor crua em JSX / `style` inline / classe Tailwind de paleta — tudo deriva de
  `packages/tokens`.
- Importar HeroUI direto onde já existe wrapper Bivaque
  (`apps/web/app/components/bivaque/`).
- Baixar o limite de um teste existente para a suíte passar.
- Repetir onboarding/aceites já registrados; mostrar navegação de membro, conteúdo
  privado ou sucesso de participação antes da admissão.
- Usar dado ilustrativo da prancha (datas, contadores, fotos, nomes) como regra ou
  fixture real.

## 4. Grupos funcionais

| Grupo | Pranchas | Etapa PROCESSO | Notas |
|---|---|---|---|
| **G0 — Fundação web** | navegação Início/Explorar/Comunidades/Perfil (+ `navigation.test.mjs`), `01-web-inicio`, `61-web-explorar-servicos`, `60-web-estados`, página interna de demonstração de componentes | 1 | **Claude faz a navegação e o scope test.** qwen pode assumir `01`, `61`, `60` e a demo depois que a nav fecha |
| **G1 — Auth e onboarding** | `36-web-auth-entrada`, `37-web-auth-confirmacao`, `38-web-auth-admissao`, `39-web-onboarding-contexto` | 2 | `37` toca BLOCK-RESEND (código é referência visual; mecanismo real é link). `38` fallback de identidade e `39` Força/OM entram como **UI sem persistência** (D6). Rótulo exato "Sou militar das Forças Armadas" (correção 1) |
| **G2 — Ciclo de comunidade** | `42-web-comunidades`, `43-web-comunidade-grupos`, `45-web-publicacao`, `15-web-conversa`, `54-web-retorno` | 3 | Correção 3 (motivo opcional privado, resumo só-leitura no pendente) e correção 4 (seletor "Toda a cidade" + confirmação de destino + alcance repetido na conversa; respostas herdam o público) |
| **G3 — Explorar e Guia** | `12-web-guia`, `25-web-guia-referencia` | 4 | Guia é diretório curado; sugerir correção; estado sem resultados |
| **G4 — Serviços e Meu negócio** | `17-web-pedido-servico`, `23-web-meu-negocio`, `62-web-prestador-pedido` | 5 | Destinatário do pedido é só-leitura; coluna "Quando" (não "Contato"); telefone segue opcional |
| **G5 — Mercado e Moradia** | `13-web-mercado`, `63-web-mercado-anuncio`, `64-web-mercado-edicao`, `21-web-meus-anuncios`, `19-web-imoveis`, `65-web-imoveis-alertas` | 6 | Rotas Mercado/Moradia ainda não existem. Sem checkout, custódia, comissão, assinatura, selo, ranking, estrelas. Preservar rascunho em falha |
| **G6 — Eventos, perfil, config, confiança, operação** | `48-web-eventos`, `67-web-evento-informacoes`, `51-web-perfil`, `52-web-configuracoes`, `56-web-confianca`, `57-web-operacao-admissoes`, `58-web-operacao-moderacao`, `69-web-identidade-recuperacao` | 7 | Correção 5 ("Pedir mais informações" antes e depois de confirmar presença). Correção 6 (Força/OM na edição de perfil, "Exibir no perfil" desligado por padrão) como **UI sem persistência** (D6). Operação = workspace restrito, fora da navegação do membro |

Ordem: G0 → G1 → G2 → G3 → G4 → G5 → G6. Cada grupo é um plano executável em
`docs/superpowers/plans/` (via skill `writing-plans`), gerado quando o grupo
anterior fecha a auditoria.

## 5. Definição de "pronto" por tela

Uma tela fecha quando **todas** valem:

1. `node scripts/visual/loop.mjs` do grupo sem finding de severidade **high**.
2. `npx pnpm@11.18.0 gate` verde (lint → typecheck → test → secrets).
3. Os estados que a prancha mostra estão presentes: entrada, ação, feedback,
   retorno, falha principal — com rascunho preservado onde a prancha indica.
4. As correções do dono aplicáveis àquela prancha estão satisfeitas (§4, coluna Notas).
5. Nenhuma das fronteiras da §3 foi cruzada.
6. Diferenças intencionais em relação à prancha estão **explicadas por escrito** no
   veredito de auditoria do grupo (o guia não exige paridade de pixel).
7. `PRODUCT_STATUS.md` e o card do board reconciliados; linha só sai de
   `PRODUCT_STATUS.md` quando o ciclo do usuário fecha de fato.

Telas com amarra R3 (D6) fecham como **"UI pronta; backend R3 pendente"**, com a
dívida registrada em `ADR-20260811-om-declarada` e nos cards `BLOCK-*`.

## 6. Loop de refinamento (por tela)

```
Passo 0  opencode run "<peça descrição de campos/ações/público/estados>" \
           --dir <repo> -m alibaba-token-plan/qwen3.8-flash -f <prancha>.png
         # confirma que o modelo enxergou a imagem ANTES de qualquer código
         # (mensagem vem antes do -f — yargs consome array)

Passo 1  Claude escreve docs/agents/tasks/RECON-<tela>.task.yml
         node scripts/agents/task-contract.mjs docs/agents/tasks/RECON-<tela>.task.yml

Passo 2  opencode run "<corpo do contrato>" --auto \
           --dir <repo> -m alibaba-token-plan/qwen3.8-flash -f <prancha>.png

Passo 3  git diff → revisão adversarial (skill adversarial-review):
           a) aderência ao contrato
           b) coerência produtor/consumidor nas bordas
           c) Biome / token-discipline / wrappers HeroUI
           d) correções do dono aplicáveis
           e) nenhuma fronteira da §3 cruzada
         npx pnpm@11.18.0 gate --fast   (loop de edição)

Passo 4  findings → notas de refinamento →
           opencode run "<notas>" --auto -s <session-id> --dir <repo>
         repetir Passo 3–4 até o diff passar

Passo 5  npx pnpm@11.18.0 gate   (completo, antes de fechar)
         commit convencional da tela

Passo 6  (fim do grupo) node scripts/visual/loop.mjs → iterar em findings high
         veredito em docs/agents/VISUAL_AUDIT-<data>-<grupo>.md
         reconciliar PRODUCT_STATUS.md + board
```

`retry_budget` por contrato = 3. Esgotado vira `HUMAN_DECISION`, nunca `PASS`.
O revisor (Claude) difere do executor (qwen) — `reviewer_must_differ_from_executor`
é satisfeito por construção.

## 7. Verificação — o que será dito

- **Roda nesta sessão:** `gate` local, `test:scope`, `scripts/visual/loop.mjs` local,
  revisão adversarial do diff pelo Claude.
- **Fica pendente:** revisão de código independente (segunda sessão, sem ler a
  justificativa do executor) e CI contra a revisão entregue — a CI externa está
  bloqueada por pagamento desde 2026-08-31.
- Cada tela é reportada como **"implementada; revisão independente pendente"** até
  que uma segunda sessão a revise. Nenhuma tela é chamada de "verificada de ponta a
  ponta" sem CI + runtime.
- `apps/mobile` não é criado aqui; a §5 do PROCESSO pede as duas plataformas para
  um fluxo "fechar" — os fluxos ficam **parcialmente fechados (web)** e isso é dito
  explicitamente em `PRODUCT_STATUS.md`.

## 8. Riscos

| Risco | Mitigação |
|---|---|
| qwen3.8-flash não segura as restrições (Biome sem `;`, token-discipline, HeroUI wrappers, Next server runtime) | `retry_budget` 3 + revisão por diff pequeno + `gate --fast` a cada iteração; contrato lista `forbidden` explícito |
| Deriva de escopo: qwen "melhora" backend/autz/persistência | §3 herdada por todo contrato; revisão rejeita qualquer toque em `supabase/`, `*.sql`, RPC, policy |
| Perfil fantasma "Visual Capture" quebra pgTAP | Rodar `db:reset` antes de `test:db` após qualquer captura; não subir dev server entre `db:reset` e `test:db` |
| Troca de nav (G0) quebra rotas `(shell)` em cascata | Claude faz, com teste positivo/negativo, como primeira unidade isolada; nenhuma tela de conteúdo antes da nav fechar |
| Saldo/limite do provedor qwen no meio do grupo | `alibaba-token-plan` é a rota ativa; se cair, o loop para e vira `HUMAN_DECISION` — não trocar de modelo no meio sem registrar |
| Custo em tokens do loop de refinamento | Passo 0 + contrato enxuto + reenviar resumo de continuidade, não histórico inteiro (protocolo `MODELOS-PARA-CONSTRUCAO`) |

## 9. Fora de escopo

- `apps/mobile` e qualquer tela mobile do guia.
- Persistência de afiliação declarada e de identidade (caminho R3 / ADR próprio).
- Entrega real de e-mail (BLOCK-RESEND), governança LGPD de IA (BLOCK-LEGAL-AI),
  textos legais de abertura pública (BLOCK-LEGAL-ENTRY).
- Mercado transacional (checkout, custódia, comissão, assinatura, selo, ranking).
- Desbloquear a CI externa.
