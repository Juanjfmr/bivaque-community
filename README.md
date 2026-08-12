# Bivaque Community

Comunidade local de acesso controlado para militares federais, veteranos e pensionistas
militares, em piloto na cidade de Manaus. Next.js renderizado no servidor, sobre Supabase.

Repositório privado. Não é pacote publicado — não existe `npm install bivaque-community`.

**Estado: pré-lançamento.** O produto não está no ar. Ver
[`docs/PRODUCT_STATUS.md`](docs/PRODUCT_STATUS.md) para o que existe hoje, com evidência
arquivo:linha.

## Onde está a documentação

Este README é um roteador. Nada de produto vive aqui, para não virar mais uma cópia que
envelhece.

| Pergunta | Documento |
|---|---|
| o que o produto **deve** ser — visão, papéis, decisões, monetização, sequenciamento | [`docs/BIVAQUE.md`](docs/BIVAQUE.md) |
| o que o código **faz** hoje, e a distância até o alvo | [`docs/PRODUCT_STATUS.md`](docs/PRODUCT_STATUS.md) |
| comandos, armadilhas de ambiente, contratos de teste | [`AGENTS.md`](AGENTS.md) |
| decisões de risco alto, como ADR, e a régua que classifica risco | [`docs/decisions/`](docs/decisions/) |
| ondas de trabalho e como executá-las | [`docs/superpowers/plans/README.md`](docs/superpowers/plans/README.md) |
| linguagem visual e rubrica de auditoria de tela | [`docs/agents/DESIGN_SPEC.md`](docs/agents/DESIGN_SPEC.md), [`docs/agents/VISUAL_GUIDE.md`](docs/agents/VISUAL_GUIDE.md) |
| o banco: ambientes, migrations, RLS | [`supabase/README.md`](supabase/README.md) |
| textos que o membro aceita | [`docs/legal/`](docs/legal/) |
| auditoria de coerência produto × backend, com 151 achados | [`docs/red-team/`](docs/red-team/) |
| como relatar vulnerabilidade | [`SECURITY.md`](SECURITY.md) |

**`docs/BIVAQUE.md` e `docs/PRODUCT_STATUS.md` nunca se inferem um do outro.** O primeiro
descreve decisões, muitas ainda não construídas; o segundo descreve realidade. Ler decisão
como feature entregue é o erro que produziu o mapa que esses dois substituíram.

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
