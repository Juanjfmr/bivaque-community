# Bivaque — base visual congelada no fechamento do lote de volume (Rodadas 45 a 48)

Data: 17/10/2026. Aprovada pelo usuário ("Congelar e publicar"), depois da revisão do lote, das
correções e da bateria completa.

- **Arquivo:** `.visual/bivaque-html-round48/baseline/round48.html`.
- **SHA-256:** `1de94489a996bbc0002dc974fbe3ed59dc23ee783e0ec94113de25d188b92370`.
- **Código:** o mesmo do commit que adiciona este registro. Sem o arquivo local, a base é
  remontada a partir dele (`scripts/bivaque-html/round13-baseline.mjs`).
- **Substitui** a base da Rodada 44 (`eb4969db…`) nas comparações estritas.

## O que mudou em relação à base da Rodada 44

Nas telas da comparação estrita, nada visível: geometria e estilos iguais; mudou só a marcação das
listas (atributos dos blocos e a região para leitor de tela), e os pixels diferem no máximo 4 de 255
num canal, dentro do ruído de renderização. As mudanças do lote aparecem só com volume:

- listas longas em blocos de 24, com carregamento ao rolar e "Mostrar mais" (R45);
- blocos também em Comunidade, busca, grupos, Conversas, Salvos e Meus anúncios (R46);
- salvar e "Útil" sem redesenhar a lista (R47);
- folha do bairro com muitos anúncios terminando em "Ver todos" (R48).

Elas são cobertas pelas provas das Rodadas 45 a 48 e pela sonda de volume
(`.visual/bivaque-html-volume/probe.mjs`).

## Bateria do fechamento

- Rodadas 001 a 48: PASS. A R12 e a R19 falharam uma vez por disputa de processador e passaram
  sozinhas; a R21 tinha uma corrida da própria prova (o "voltar" do diálogo de cidade desfazia a
  troca de endereço), corrigida no `go()` do harness.
- A prova de execução falha só no defeito já registrado do HTML original congelado.
