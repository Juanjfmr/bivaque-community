# Bivaque — Rodada 33: avisos empilhados com desfazer

Data: 16/10/2026. Contrato: `docs/agents/tasks/HTML-033.task.yml` (R2). Base: `df318a47`.
Referências: Sonner e a confirmação curta da Insight Timer no Mobbin.

**Veredito: PASS.**

## O que mudou

- **O aviso mais novo** continua em `#snackbar`, com a mesma região viva e o mesmo "Desfazer".
  As provas antigas e os leitores de tela seguem iguais.
- **Pilha:**
  - antes, um aviso novo apagava o anterior, e o desfazer dele se perdia;
  - agora o anterior sobe para a pilha com o próprio "Desfazer" e o tempo que ainda falta,
    no máximo dois;
  - aviso sem desfazer é só substituído, como antes.
- **Barra de tempo:**
  - barra fina na base de cada aviso;
  - pausa com o mouse ou o foco em cima e retoma ao sair;
  - some com movimento reduzido.
- **Leitor de tela:**
  - o "Desfazer" diz qual ação desfaz ("Desfazer: Alerta criado…");
  - a pilha não é anunciada de novo.
- **Carregamento:** `notify()` saiu de `shell/primitives.js` para `shell/toasts.js`, com
  variáveis à prova de uso durante o carregamento.

## Prova

| Prova | Resultado |
| --- | --- |
| Rodada 33 (5 verificações; 375 e 1440, claro) | PASS, 10/10 |
| Rodadas 02, 11 e 25, que dependem dos avisos | PASS: 24/24, 26/26, 16/16 |
| Gate completo | PASS |
