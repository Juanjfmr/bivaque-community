# Bivaque — Rodada 43: avisos explicados antes e instalar como app

Data: 17/10/2026. Contrato: `docs/agents/tasks/HTML-043.task.yml` (R1). Base: `845f9e58`.
Lote mobile 2. Referências: Luma, Bumble e Claude, no Mobbin.

**Veredito: PASS.**

## O que mudou

- **Avisos no celular pedidos com explicação antes:**
  - depois da primeira ação que gera aviso (alerta de busca, pergunta publicada, pedido enviado),
    uma folha mostra três exemplos de aviso, o primeiro ligado ao que a pessoa acabou de fazer, e
    diz do que avisamos;
  - "Agora não" só pergunta de novo depois de 7 dias; em cidade de consulta, nunca;
  - em Você → Avisos, a linha "Avisos no celular" mostra o estado e permite ativar ou desativar;
  - no protótipo a ativação é simulada e nenhum pedido real do navegador é feito, porque não há
    avisos para enviar; no app, o pedido do sistema entra no lugar do "Ativar avisos".
- **Instalar como app:**
  - o HTML aponta para `manifest.webmanifest` e para o ícone, e tem as metas de app do iPhone;
  - os ícones (192, 512 e maskable) são gerados a partir da marca por
    `scripts/bivaque-html/pwa-icons.mjs` e ficam em `prototypes/bivaque-html/pwa/`;
  - o deploy passa a publicá-los ao lado do HTML;
  - em Você, "Instalar o Bivaque no celular" aparece só onde há suporte: no Android usa o pedido
    de instalação do navegador; no iPhone mostra o passo a passo, com o ícone de Compartilhar do
    Safari; já instalado, a linha some.
- **Não fiz:** service worker e uso sem internet. A instalação no Android depende das regras de
  cada navegador. Foi verificada por simulação do evento de instalação e só será confirmada em
  aparelho depois da publicação.

## Prova

| Prova | Resultado |
| --- | --- |
| Rodada 43 (6 verificações; 375 e 1440, claro) | PASS, 12/12 |
| Gate completo | PASS |

Capturas: `.visual/bivaque-html-round43/telas/`.
