# Bivaque — Rodada 18: fotos com arrastar e soltar e galeria em tela cheia

Data: 15/10/2026. Contrato: `docs/agents/tasks/HTML-018.task.yml` (R2). Base: `cb39b117`.
Quinto item da ordem aprovada. Referências: Image Preview Dropzone e File Upload with
Preview, do 21st.dev.

**Veredito: PASS.**

## O que mudou

- **Fotos nos editores** (anúncio, pedido e página do negócio):
  - arrastar as fotos para a área destaca "Solte as fotos aqui";
  - arquivos que não são JPG, PNG, WebP ou AVIF são recusados com aviso; arquivo sem tipo é
    aceito pela extensão;
  - o processamento (limite, 12 MB, 1400 px, JPEG) é o mesmo do botão;
  - a primeira foto mostra "Capa"; as outras têm "Tornar capa", que anuncia a mudança e leva
    o foco à nova capa.
- **Galeria em tela cheia:**
  - abre pelo botão "Ver fotos (N)" no anúncio, ou "Ver foto" no negócio;
  - tem setas, contador "2 de 3", miniaturas, teclado (← → Esc) e deslizar no celular;
  - o foco fica preso na galeria e o fundo, inerte;
  - com uma foto só, setas e miniaturas somem;
  - o Voltar do navegador fecha só a galeria, sem sair da página.

## Revisão independente

Sem CRITICAL nem HIGH.

- **MEDIUM corrigido:** soltar uma segunda remessa durante o preparo estourava o limite de
  fotos. Agora entra uma remessa por vez, e o limite é conferido antes de cada foto.
- **MEDIUM corrigido:** soltar fora da área fazia o navegador abrir o arquivo, e o rascunho se
  perdia. Agora o soltar fora é ignorado.
- **MEDIUM corrigido:** depois de clicar na foto, Esc e setas paravam de funcionar. Agora a
  galeria recebe o foco de volta e trata o teclado no documento inteiro.
- **MEDIUM corrigido:** os atalhos C, Ctrl+K e "/" abriam menus por baixo da galeria. Agora não
  disparam com ela aberta.
- **MEDIUM corrigido:** o Voltar do navegador saía do anúncio. A galeria agora tem entrada
  própria no histórico, como o diálogo e o menu Criar.
- **LOW corrigidos:**
  - tipo de arquivo vazio aceito pela extensão;
  - foco e anúncio da nova capa;
  - alvo de toque maior em "Tornar capa";
  - endereço das miniaturas escapado;
  - deslizar só com toque, no eixo horizontal e com cancelamento.

## Prova

| Prova | Resultado |
| --- | --- |
| Rodada 18 (10 verificações; 375, 768, 1024 e 1440, claro e escuro) | PASS, 60/60 |
| Rodadas 03, 09 e 11 (envio de fotos), antes da revisão | PASS: 108/108, 24/24, 78/78 |
| Rodadas 14, 13 e 01, depois das correções | PASS |
| Gate completo | PASS |

Candidato: `e8d21dd4…`. A bateria completa e o novo congelamento visual acontecem no fechamento
do lote.
