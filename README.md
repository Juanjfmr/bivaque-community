# Bivaque Community

Comunidade de acesso verificado para militares federais, veteranos, pensionistas e famílias,
organizada por cidade, em todo o Brasil. App em React (`apps/app`) sobre um servidor Next.js
(`apps/web`) e Supabase.

Repositório privado. Não é pacote publicado — não existe `npm install bivaque-community`.

**Estado: pré-lançamento.** O que falta para lançar, e o que é "pronto", está em
[`docs/LANCAMENTO.md`](docs/LANCAMENTO.md).

## Onde está a documentação

Este README é um roteador. Nada de produto vive aqui.

| Pergunta | Documento |
|---|---|
| o que entra no lançamento, o que é pronto, a ordem | [`docs/LANCAMENTO.md`](docs/LANCAMENTO.md) |
| regras para quem trabalha no repositório: comandos, fronteiras, evidência | [`AGENTS.md`](AGENTS.md) |
| como cada coisa funciona e por quê; a régua de risco | [`docs/decisions/`](docs/decisions/) |
| a régua visual e a identidade das peças | [`docs/agents/regua-nextdoor/`](docs/agents/regua-nextdoor/) |
| o quadro de trabalho | [`tools/backend-kanban/BOARD.md`](tools/backend-kanban/BOARD.md) |
| o banco: ambientes, migrations, RLS | [`supabase/README.md`](supabase/README.md) |
| textos que o membro aceita | [`docs/legal/`](docs/legal/) |
| marca | [`docs/brand/`](docs/brand/) |
| como relatar vulnerabilidade | [`SECURITY.md`](SECURITY.md) |
| documentos que já foram autoridade | [`docs/historico/`](docs/historico/) — registro, não instrução |

## Rodar

Node 22 ou superior. **`pnpm` e `corepack` não estão no PATH** — sempre via `npx`.

```sh
npx pnpm@11.18.0 install
npx pnpm@11.18.0 gate          # porta única: lint, typecheck, testes e varredura de segredo
npx pnpm@11.18.0 gate --fast   # só lint e typecheck, para o loop de edição
```

O `gate` é o que autoriza dizer que algo está pronto. Nenhum comando isolado substitui ele.

Para o banco é preciso Docker e a stack local de pé:

```sh
npx pnpm@11.18.0 exec supabase start
```

O conjunto completo de comandos, incluindo os do banco e os do loop visual, está no
[`AGENTS.md`](AGENTS.md). Ele também lista as armadilhas de ambiente que fazem teste falhar
sem relação com a mudança em curso — leia antes de investigar suíte vermelha.

## Licença

Nenhuma licença declarada. O repositório é privado e o `package.json` marca `private: true`.
Enquanto não houver decisão, trate como todos os direitos reservados.
