# ADR-20261117 — F10: Salvos fica no app, com busca e remoção em todo tipo

- Status: Aceito por delegação — aguarda ratificação do dono (17/11/2026, lote RUN-186)
- Decide sobre: `docs/LANCAMENTO.md` fase 6 e linha F10;
  [ADR-20261024-front-react-spa](ADR-20261024-front-react-spa.md) §8 (ordem da troca);
  [ADR-20261117-f10-conta-no-app](ADR-20261117-f10-conta-no-app.md) (a casca anterior)
- Escopo do lote: `/salvos`. `/configuracoes*` saiu no RUN-184; `/indicacoes/[id]` é do lote 3 do F09.

## Contexto

`apps/web/app/(shell)/salvos/page.tsx` (351 linhas) ainda servia tela de membro na web depois do
perfil (RUN-172), da conta (RUN-184) e das demais jornadas do F10. A lateral da casca e o atalho da
Ajuda pública linkavam a tela antiga, e `lib/saves/saved-items.ts` só existia para alimentá-la.

A tela do app (`/app/salvos`) já listava anúncios, publicações de grupo, perguntas seguidas e
referências do guia, pelas rotas `/api/app/{mercado/salvos,grupos/salvas,perguntas/salvas,guia/salvos}`,
mas não tinha busca e só sabia dessalvar anúncio. O levantamento de 17/11
(`.work/orq/relatorios/escopo-trocas.md`, seção 2, itens 2.3.6 a 2.3.9) registrou as lacunas.

| Parte da tela antiga | Situação em 17/11 |
|---|---|
| Anúncios salvos (mercado e imóveis) | já no app, com dessalvar |
| Publicações de grupo salvas | já no app, sem gesto de remover |
| Perguntas seguidas | já no app, sem gesto de remover |
| Referências do guia salvas | já no app, sem gesto de remover |
| Busca nos salvos | **não existia no app** |
| Abas por tipo + `?aba=` na URL | **não existiam no app** (o app organiza por seções) |
| Item indisponível ("conteúdo removido") | **não existe no app** |
| Indicações salvas | aparecem na seção de perguntas do Salvos (seguir respostas) |

## Decisão

1. **Troca.** `/salvos` responde 307 para `/app/salvos`, com a query preservada pelo Next. A pasta
   `(shell)/salvos` e `lib/saves/saved-items.ts` saem com os testes deles; o redirect antigo
   `/recommendations?aba=saved` passa a levar a `/app/salvos` (antes ia a `/salvos?aba=indicacao`).
   Os links vivos (lateral da casca e Ajuda pública) apontam direto para o app, e `active-nav`
   deixa de citar `/salvos`: a lista de destinos secundários fica vazia porque o 307 roda antes da
   casca — nenhuma rota desta casca acende a si mesma por declarar-se secundária.
2. **Busca construída no app, filtrando o que a tela já carregou.** O campo filtra por título as
   quatro seções já carregadas, sem chamada nova às rotas de salvos. A seção com conteúdo e sem
   casamento sai de cena — menos a de anúncios, que mantém o controle Desapegos/Imóveis e mostra
   ali o vazio da busca ("Nenhum anúncio salvo corresponde à busca.", ou "Nenhum imóvel…" no
   segmento de imóveis). Esconder o controle obrigaria a apagar a busca para chegar ao imóvel
   procurado. Nenhuma rota de API nova e nenhum parâmetro de busca no servidor.
3. **Remover em todo tipo, pelas rotas que já existem.** Guia (`DELETE /api/app/guia/:id/salvo`),
   pergunta (`DELETE /api/app/perguntas/:id/salvo`) e publicação
   (`PUT /api/app/grupos/publicacoes/:id/acoes`, `acao=salvar`, `valor=false`) ganham o gesto na
   tela; o anúncio continua pelo marcador do cartão. A linha sai na hora e **volta** com o motivo do
   servidor se o dessalvar falhar — remoção otimista nunca some em silêncio. A volta é do item, não
   da lista: remoção e reposição são atualizações funcionais sobre a lista do momento, então duas
   remoções na mesma seção não desfazem uma à outra, e a volta de um anúncio não cai na lista do
   segmento seguinte se a pessoa trocou de segmento enquanto a chamada corria.
4. **Divergência registrada: abas por tipo e `?aba=` (item 2.3.6).** A tela web tinha cinco abas
   (Tudo/Indicações/Guia/Mercado/Imóveis) e lia `?aba=` da URL. O app organiza por **seções**, que
   é o desenho aprovado, e o lote não constrói abas nem `?aba=`: o redirect legado vai a
   `/app/salvos` puro, sem escolher aba, e a perda está declarada aqui. A indicação salva (o
   "seguir respostas" de uma pergunta) aparece na seção de perguntas do Salvos do app, que lê
   `recommendation_saves` por `/api/app/perguntas/salvas`; o que se perde é só o atalho de abrir a
   tela já filtrada num tipo. (Correção do coordenador em 17/11: a primeira redação deste item dizia
   que a indicação salva ficava sem tela, o que não é verdade.)
5. **Divergência registrada: item indisponível (item 2.3.9).** A web mostrava "Conteúdo
   indisponível" para o salvamento que a RLS já não devolvia, sem título nem destino. As seções do
   app listam o que a API devolve: quem perdeu acesso ao conteúdo — anúncio pausado, referência fora
   da fila aprovada, pedido retirado — simplesmente não o vê mais, e não há cartão fantasma. É
   coerente com a RLS ser a fronteira e com o desenho por seções: nada do que foi retirado vira
   snapshot na tela.
6. **Cobertura migra, não se perde.** `tests/e2e/recon-032-salvos.spec.ts` sai com a tela: a
   persistência real de cada tipo já é medida no app por `tests/e2e/f06-mercado-real.spec.ts`
   (anúncio salvo aparece em Salvos e dessalvar apaga a linha no banco),
   `tests/e2e/f08-guia-real.spec.ts` (referência salva aparece em Salvos) e
   `tests/e2e/f04-perguntas-real.spec.ts` (pergunta seguida aparece em Salvos; desseguida pela
   tela Salvos, a linha some do banco e não volta ao recarregar). A busca e o gesto de remover das
   quatro seções ganham `apps/app/tests/e2e/salvos.spec.ts`. Os E2E da web que usavam `/salvos`
   como página-base da casca passam a usar `/community`, que é rota viva do mesmo grupo. O
   inventário completo de `git grep` está no relatório do lote.

## Consequências

- Nenhuma mudança de banco, de rota de API, de grant ou de policy. As quatro rotas de leitura e as
  três de dessalvar ficam como estão.
- A tela do app passa a ter busca e remoção em quatro seções, e o estado de falha do dessalvar é
  visível (`role="alert"`), com a linha de volta.
- Perda declarada: o atalho para abrir o Salvos já filtrado num tipo (item 4) e o rastro do item retirado (item 5).
- As capturas visuais de `/salvos` (e as variantes `?aba=`) saem de `scripts/visual/capture.mjs`; a
  sonda de estilo das abas passa a medir só `/events`, a outra fileira `tabs--secondary` viva.
