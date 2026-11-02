# APP-004 — dados demonstrativos, onda 1d

Porta de leitura: `apps/app/lib/dados/contrato.ts` e `index.ts`. Somente essa porta
é consumida pela casca (`src/contexto/casca.tsx`) e pelo resolvedor de imagens.
Projeções explícitas de `Tables` públicas; apresentação fica em `apresentacao: Json`.
Não há cliente Supabase, rede, escrita ou alegação de row completa.

| Entidade da referência | live | seed | Destino |
|---|---:|---:|---|
| `SOURCE.items` | 6 | 3 | `anuncios`, preço convertido para centavos |
| `SOURCE.biz` | 9 | 6 | `negocios`, categoria pública e categoria original na apresentação |
| `SOURCE.asks` | 7 | 0 | `perguntas`, `status=ok` vira `is_resolved` |
| Respostas aninhadas | 4 | 0 | `respostas`, vínculo `request_id` |
| `SOURCE.events` | 4 | 1 | `eventos`, metadados originais na apresentação |
| `SOURCE.threads` | 4 | 0 | `conversas` |
| Mensagens aninhadas | 7 | 0 | `mensagens`, vínculo `conversation_id` |
| `SOURCE.notices` | 2 | 1 | `avisos` |
| `buildGroups(stage)` | 10 | 3 | `grupos` |
| Publicações dos grupos | 9 | 0 | `publicacoes` |
| Comentários dos grupos | 4 | 0 | `comentarios` |

Origem: `prototypes/bivaque-html/src/data/demo/source.js` e
`features/groups/{presets,views}.js`. Os grupos reais vêm de `buildGroups`,
não de `SOURCE.comms`. Os IDs, textos, imagens e referências de demonstração
foram preservados; IDs sintéticos não são UUIDs de produção.

`auxiliares.json` preserva planos de chegada/saída, sugestões legadas `comms`,
11 memórias, `PHOTO_BY_ITEM`, `PHOTO_BY_BIZ`, `KNOWLEDGE_TEXT`, `MEMORY_BIZ`,
43 bairros/14 CEPs demonstrativos e `OWNER_DEMO`.
Origem adicional: `data/demo/{model,bairros,owner}.js`.
Os números do painel são exemplos, não medições do serviço. Coordenadas são
as da referência e não geocodificação real nem endereço de uma pessoa.

Quatro cidades de `SOURCE.cities`: Manaus, Brasília, Rio de Janeiro e Natal.
A referência só fornece essas entidades em Manaus; demais cidades devolvem
listas vazias, sem misturar conteúdo. Isso não cria limite nacional de acesso.
Cidade desconhecida e cancelamento têm falhas explícitas; cada leitura retorna
cópia independente. O resumo da casca deriva 2 avisos/3 conversas não lidas,
e o nome sintético Rafael Souza de `app/state.js`.

As 24 imagens de `assets.js` estão em `public/demo/`, com os mesmos bytes;
`imagem()` resolve caminhos locais e retorna vazio para chave inexistente.
Não há base64 de fotografias no bundle nem dependência de rede.

Diferenças deliberadas do modelo público:

- Conversas com contexto apenas textual mantêm esse texto na apresentação;
  `context_id`/`context_type` são opcionais nessa projeção, sem inventar alvo.
- Avisos preservam `go` na apresentação; destino sem ID permanece demonstrativo,
  sem alegar ação/enum de notificação pronta para o backend.
- Datas relativas são ancoradas em 25/10/2026; rótulos originais ficam na apresentação.
- Post legado de enquete vira pergunta textual, preservando o texto, sem portar
  votação. A decisão R2/P1 exclui enquete do produto vigente.
- Não foram portados para o contrato público `force`, `verified`, CPF, OM,
  patente ou flags de consulta ao Portal. Não há selo público de verificação.
- Constantes de formulários, estado mutável de jornadas, entrada e suporte
  continuam nas ondas consumidoras; `cobertura.json` registra essas pendências.

Provas: `apps/app/tests/dados-demo.test.ts`, oito casos (contagens live/seed,
isolamento/cidades, cancelamento/resumo, integridade, auxiliares e igualdade das 24 imagens).
Os testes verificam IDs únicos e referências de posts, comentários, respostas,
mensagens e contextos conhecidos. Provas finais e revisão ficam no STATUS.
