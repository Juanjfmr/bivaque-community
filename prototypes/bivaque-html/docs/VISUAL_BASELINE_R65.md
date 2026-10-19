# Bivaque — base visual congelada no fechamento do Lote Funcional (Rodadas 57 a 65)

Data: 19/10/2026. Aprovada pelo usuário ("Congelar e publicar"), depois de três revisões
independentes (agente revisor de código, Codex/GPT e OpenCode/DeepSeek V4.1 Flash), das duas rodadas de
correção (R64 e R65) e da bateria completa.

- **Arquivo:** `.visual/bivaque-html-round65/baseline/round65.html`.
- **SHA-256:** `0dce1b06dfdca692c22489e1173980a4c1686ad2accde1c79666ed6209144f9d`.
- **Código:** o mesmo do commit que adiciona este registro. Sem o arquivo local, a base é
  remontada a partir dele (`scripts/bivaque-html/round13-baseline.mjs`).
- **Substitui** a base da Rodada 56 (`19df283b…`) nas comparações estritas.

## O que mudou em relação à base da Rodada 56

Nas telas da comparação estrita, nada visível: diferenças de até 162 pixels com no máximo 5 de 255 num
canal (decodificação das fotos e zona instável do renderizador), geometria e estilos iguais. Você muda a
marcação (linha Ajuda), fora da área capturada. O lote fecha os caminhos quebrados e as jornadas que
faltavam ([AUDITORIA_FUNCIONAL_2026-10-18](AUDITORIA_FUNCIONAL_2026-10-18.md)):

- caminhos quebrados simples (R57); privacidade e conduta, pedido depois da escolha, ocultar pessoal (R58);
- editar e excluir o que publicou (R59); bloquear, denunciar e consequência no Painel (R60);
- encerrar grupo, pausar e excluir página de negócio (R61); apagar a conta e Ajuda (R62);
- promessas da tela cumpridas ou retiradas (R63); correções das revisões (R64 e R65).

Elas são cobertas pelas provas das Rodadas 57 a 65.

## Bateria do fechamento

- Rodadas 001 a 65: PASS. A R06 pegou a ativação de plano sem "nenhum pagamento" (texto reescrito na
  R63), corrigida; a R64 tinha uma leitura do armazenamento antes da gravação, tornada estável. A R59 e a
  R61 tiveram uma falha intermitente cada durante o lote e passaram em todas as execuções seguintes.
- A prova de execução falha só no defeito já registrado do HTML original congelado.
- Pendência comercial: a tela de planos não bate com o ADR-20260820-alcance-pago; decisão do dono (R3).
