# Bivaque — Rodada 34: celebração ao indicar um negócio

Data: 16/10/2026. Contrato: `docs/agents/tasks/HTML-034.task.yml` (R1). Base: `f81d392c`.

**Veredito: PASS.**

## O que mudou

- **Ao indicar um negócio:**
  - o número de indicações cresce e volta (420 ms);
  - oito pontos saem do número e somem em menos de um segundo;
  - o avatar de quem indicou entra na pilha logo depois.
- **Movimento reduzido:** nada anima e nenhum ponto aparece. O aviso e a contagem são os mesmos.
- **Leitor de tela:** os pontos ficam fora da leitura (`aria-hidden`); o aviso continua sendo o
  que anuncia a indicação.
- **Código:** `shell/celebrate.js` (Web Animations, sem biblioteca); estilo `.burst` em
  `styles/empty-states.css`.

## Prova

| Prova | Resultado |
| --- | --- |
| Rodada 34 (3 verificações; 375 e 1440, claro) | PASS, 6/6 |
| Gate completo | PASS |

Captura: `.visual/bivaque-html-round34/telas/indicar-1440.png` (animação pausada em 250 ms).

## Fechamento do lote C (rodadas 29 a 34)

Uma revisão para o lote todo e a bateria completa (375 claro, 768 claro e 1440 escuro).

### Correções da revisão

| Severidade | Rodada | Problema | Correção |
| --- | --- | --- | --- |
| Alta | 29 | Foto em retrato invadia a faixa do texto do cartão | A foto fica recortada na faixa de cima |
| Média | 29 | Abrir um segundo cartão e baixar logo podia salvar o arquivo do primeiro | O cartão anterior sai antes da prévia nova; um preparo atrasado é descartado |
| Média | 29 | O texto prometia um link que só abre neste aparelho | Texto e mensagem dizem que o link é da demonstração local |
| Média | 33 | O "Desfazer" do aviso mais novo escondia a confirmação e deixava um desfazer velho na pilha | O aviso fecha antes de o desfazer rodar |
| Média | 33 | Um desfazer antigo sobrevivia ao "Recomeçar do zero" e ressuscitava dados | O recomeço limpa a pilha |
| Média | 32 | Encontro criado pela pessoa sumia dos filtros de público | Sem público escolhido, vale para todos |
| Média | 30 | Tirar dos salvos dentro da comparação perdia o foco | O foco volta para a comparação |
| Média | 31 | Salvar na folha do bairro remontava o mapa e deixava o botão da folha errado | Mesmos bairros, mesmo mapa; o botão acompanha |
| Baixa | 29 e 31 | Falha da imagem sem mensagem; arquivos repetidos sem internet; aviso do mapa bloqueava marcadores | Corrigidos |

### Regressões pegas pela bateria

- **Aviso pausado tapando botões (Rodada 33):**
  - um aviso simples parado sob o mouse pausava e não sumia mais, cobrindo o enviar das Conversas
    e botões das rodadas 05, 10, 19 e 27;
  - agora só o aviso com "Desfazer" pausa.
- **Teste de botões sem efeito (Rodada 06):** o botão "Mapa" carrega MapLibre e o mapa-base,
  dependências aprovadas na Rodada 31. A prova passa a permitir esses dois endereços.

### Resultado

| Prova | Resultado |
| --- | --- |
| Bateria das rodadas 001 a 34 | PASS, depois das correções |
| Runtime da referência congelada | FAIL esperado (defeito conhecido do original, ROUND_00) |
| Gate completo | PASS |
