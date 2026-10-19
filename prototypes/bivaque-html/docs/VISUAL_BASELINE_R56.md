# Bivaque — base visual congelada no fechamento do lote Entrada (Rodadas 53 a 56)

Data: 18/10/2026. Aprovada pelo usuário ("pode congelar o protótipo com o lote de entrada"), depois
de três revisões (código, segurança R3 e a independente do GPT, via Codex), das correções e da
bateria completa. Não publicada: o usuário não pediu a publicação.

- **Arquivo:** `.visual/bivaque-html-round56/baseline/round56.html`.
- **SHA-256:** `19df283baea87522c43c55033b6c9df9ee85430d02073bd1505531b9eac8b065`.
- **Código:** o mesmo do commit que adiciona este registro. Sem o arquivo local, a base é
  remontada a partir dele (`scripts/bivaque-html/round13-baseline.mjs`).
- **Substitui** a base da Rodada 52 (`c83703ea…`) nas comparações estritas.

## O que mudou em relação à base da Rodada 52

Nas telas da comparação estrita, nada visível: Salvos difere em até 94 pixels com no máximo 5 de 255
num canal (decodificação das fotos), Início e Criar no desktop só dentro da zona instável do
renderizador, e Você muda a marcação (linha "Sair", fora da área capturada). As mudanças do lote
ficam fora dessas telas:

- landing pública com amostra, Sair e Entrar (R53);
- criar conta com aceite, CPF conferido e nunca guardado, resultados distintos (confirmado, não
  localizado com documento, em análise, fonte fora do ar), análise com linha do tempo (R54);
- entrar, recuperar a senha, Google com aceite e convite familiar preso ao e-mail (R55);
- passo 3 (cidade, momento e nome), boas-vindas e entrada em análise no Painel (R56).

Elas são cobertas pelas provas das Rodadas 53 a 56.

## Bateria do fechamento

- Rodadas 001 a 56: PASS. A R11 pegou um ícone fora da fonte embutida (`login`), corrigido para
  `refresh`; a R19 falhou uma vez na bateria e passou sozinha (intermitente).
- A prova de execução falha só no defeito já registrado do HTML original congelado.
