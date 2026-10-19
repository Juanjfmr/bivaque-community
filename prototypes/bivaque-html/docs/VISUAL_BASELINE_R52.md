# Bivaque — base visual congelada no fechamento do lote do Painel do Bivaque (Rodadas 49 a 52)

Data: 18/10/2026. Aprovada pelo usuário ("Congelar e publicar"), depois de duas revisões (a própria
e a independente do GPT, via Codex), das correções e da bateria completa.

- **Arquivo:** `.visual/bivaque-html-round52/baseline/round52.html`.
- **SHA-256:** `c83703ea80755fd5688983bc4a6c1c93270a7cf3984de33fa8469f94d0ee1b92`.
- **Código:** o mesmo do commit que adiciona este registro. Sem o arquivo local, a base é
  remontada a partir dele (`scripts/bivaque-html/round13-baseline.mjs`).
- **Substitui** a base da Rodada 48 (`1de94489…`) nas comparações estritas.

## O que mudou em relação à base da Rodada 48

Nas telas da comparação estrita, nada visível: Salvos difere em 58 pixels com no máximo 5 de 255
num canal (decodificação das fotos), e a Início difere só dentro da zona instável do renderizador.
As mudanças do lote ficam no console do dono (`#dono`), fora dessas telas:

- visão geral com chegadas atendidas, métricas, O que mudou e a fila (R49);
- Filas com abertas e decididas, assumir e desfazer (R50);
- Cidades com saúde, embaixadores e convite (R51);
- Negócios e planos, Pessoas e equipe (R52);
- denúncia feita no app registrada e levada à fila; conteúdo removido some de todo o app.

Elas são cobertas pelas provas das Rodadas 49 a 52.

## Bateria do fechamento

- Rodadas 001 a 52: PASS. A R03 saiu sem resultado na bateria (coincidiu com a geração de uma
  maquete) e passou sozinha; a R50 usava o limite de 720 px onde o console troca a navegação em
  1024 px, corrigido na prova.
- A prova de execução falha só no defeito já registrado do HTML original congelado.
