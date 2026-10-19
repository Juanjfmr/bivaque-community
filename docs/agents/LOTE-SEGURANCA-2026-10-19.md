# Lote Segurança (SEC-001 a SEC-005): roteiro de execução

Data: 19/10/2026. Decisão: [ADR-20261019-correcoes-de-seguranca-pre-lancamento](../decisions/ADR-20261019-correcoes-de-seguranca-pre-lancamento.md).
Origem: [AUDITORIA_ADERENCIA_2026-10-19](../AUDITORIA_ADERENCIA_2026-10-19.md), seção 5.

## Quem faz o quê

| Papel | Quem |
|---|---|
| Implementa | **Codex** (`gpt-6.1-sol`, esforço `high`) |
| Revisa cada PR | **DeepSeek V4.1 Flash** (OpenCode, `--agent plan`, só leitura) |
| Revisão final do lote | **Claude Opus** |
| Aprova merge | **O dono (Juan)** |

Quem implementa nunca revisa o próprio trabalho.

## Tarefas, na ordem

| Ordem | Contrato | O que corrige |
|---|---|---|
| 1 | [SEC-003](tasks/SEC-003.task.yml) | A purga da conta pula arquivos do Storage. Só TypeScript, sem banco: bom para aquecer. |
| 2 | [SEC-005](tasks/SEC-005.task.yml) | O outbox envia aviso quando a consulta de preferência falha. Só TypeScript. |
| 3 | [SEC-001](tasks/SEC-001.task.yml) | Conteúdo removido pela moderação continua legível por SELECT direto. RLS. |
| 4 | [SEC-002](tasks/SEC-002.task.yml) | O telefone não público do prestador é legível. Grant e RLS. |
| 5 | [SEC-004](tasks/SEC-004.task.yml) | EXIF/GPS nas fotos, e a ação de foto de evento sem reconferir o vínculo. |

**Fora do lote:** a exposição da afiliação (Força e OM, card `BLOCK-AFFILIATION`). É uma decisão do dono,
e não deve ser mexida.

## Preparação (uma vez)

1. Trabalhar na branch `codex/seguranca`, que já está pronta na worktree
   `C:\Users\juana\bivaque-community\.claude\worktrees\seguranca`. Ela parte de `origin/main` (`6c6947c1`) e
   traz esta auditoria e os contratos.
2. Instalar com `npx pnpm@11.18.0 install --frozen-lockfile`.
3. Abrir o Docker Desktop e subir o banco local com `npx supabase start`. É o banco local de testes; **nunca**
   use `db push` nem `--linked`.
4. Fazer o reset com `npx supabase db reset`, e conferir a linha de base: `npx pnpm@11.18.0 test:db` e
   `npx pnpm@11.18.0 gate`. Registrar o que já falha **antes** de mexer, para não atribuir ao lote.
5. Não copiar `.env.local` de outro lugar. Se um teste precisar de variável, usar as do `supabase start` e as
   do `.env.example`.

## Ciclo de cada tarefa (TDD, como pede o contrato)

1. Ler o contrato inteiro e os arquivos citados na evidência. Ler as linhas reais que vai alterar.
2. **Teste primeiro:** escrever o teste negativo do contrato e rodar. Ele precisa **falhar** pelo motivo
   descrito. Guardar a saída.
3. Fazer a correção mínima. RLS e grants entram por **migration nova** (`npx supabase migration new <nome>`),
   e uma migration antiga nunca é editada.
4. Rodar o teste novo, que agora passa, e depois os da área (`test:db`, unitários, E2E citado no `proof`) e o
   `gate`. Ler a saída antes de seguir.
5. Se o schema público mudou, regenerar `supabase/database.generated.ts` com o comando que o repositório já
   usa (ver `package.json`).
6. Um commit por tarefa, com a mensagem `fix(seguranca): <o que> (SEC-00N)`, citando no corpo a saída que
   falhava e a que passa.
7. Se o contrato estiver errado ou impossível, **parar** e registrar o motivo. Não contornar.

## Fechamento

1. Abrir **um PR** para a `main` com as cinco tarefas.
2. O corpo do PR traz, para cada SEC:
   - o teste que falhava antes e passa depois;
   - o inventário pedido (SEC-002: usos de `contact_phone`; SEC-004: caminhos de upload);
   - as decisões tomadas, por exemplo quem ainda lê conteúdo removido.
3. A revisão do Flash pode ser rodada pela sessão do Claude, ou à mão:
   `opencode.cmd run --agent plan -m opencode-go/deepseek-v4.1-flash -f <prompt.md> "..."`, só leitura,
   sobre `git diff origin/main...HEAD`.
4. Os achados MEDIUM ou mais graves são corrigidos num commit seguinte, no mesmo PR.
5. O CI do PR precisa ficar verde em "Install, test, and build", que roda pgTAP e E2E. O robô "Claude Code
   review (DeepSeek)" pode falhar por falta de crédito na conta da DeepSeek; essa falha não é do código.
6. **Merge só com o ok do dono.** Depois do merge, o workflow de migrations aplica no banco remoto. Conferir
   o resultado do workflow.

## Regras que não mudam

- Nunca commitar segredos nem `.env`. Nunca force-push.
- Não editar o protótipo (`prototypes/bivaque-html`).
- Não afrouxar nenhuma outra policy. Se uma tela quebrar por causa da regra nova, o caminho é corrigir a tela,
  não a regra.
- Responder ao dono em português do Brasil.

## Prompt sugerido para o Codex

```
Execute o lote descrito em docs/agents/LOTE-SEGURANCA-2026-10-19.md, tarefa por tarefa na ordem da
tabela, seguindo cada contrato em docs/agents/tasks/SEC-00N.task.yml e o ciclo TDD do roteiro. Comece
pela preparação e registre a linha de base. Commit por tarefa. Ao final, abra o PR para a main (sem
merge) e me diga o link, o resultado de cada teste negativo antes/depois e o que ficou pendente.
```
