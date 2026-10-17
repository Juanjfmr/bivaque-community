# Bivaque — Rodada 08: movimento arrojado (versão de teste)

Data: 14/10/2026. Contrato: `docs/agents/tasks/HTML-008.task.yml` (R2). Base: `dab7f167`.

**Veredito: PASS.** Versão arrojada pedida pelo usuário ("se ficar demais, reduziremos").
Prova de movimento 42/42 em 375/768/1440 × claro/escuro, Rodada 07 48/48, gate verde.
Vídeo enviado ao usuário para avaliação.

## O que mudou

- **A foto do cartão voa até o topo do detalhe** (anúncios, imóveis, negócios) e, ao
  voltar, voa de volta ao cartão de origem.
- **O detalhe sobe em cascata**, e as **listas entram em cascata** ao trocar de tela.
- **Cartões e linhas afundam levemente ao toque** (`scale .97`).
- Com **"reduzir movimento"** ligado no sistema, nada disso roda; a troca de tela fica
  instantânea, como antes.

Tudo está isolado em `src/motion/bold-transitions.js` e `src/styles/motion-bold.css`, com
dois ganchos em `render()` de `shell/navigation.js`. **Para suavizar**, basta ajustar a
constante `BOLD`, por exemplo `flight: 360`, `listRise: 12`, `stagger: 25`. Para
desligar, basta remover os dois arquivos do manifesto.

## Revisão independente

- **HIGH** (a foto pousaria cerca de 50 px fora do cartão na volta, porque media durante
  a animação antiga da página): **não reproduzido no Chromium**, mesmo com uma prova
  estrita que exige pouso a até 8 px (`back-flight-lands-on-card`, que passa antes e
  depois). Correção aplicada de forma defensiva, igual à que a ida já fazia (cancelar a
  animação da página antes de medir), porque navegadores ou aparelhos lentos podem se
  comportar diferente.
- **MEDIUM** (o toque no cartão conflitava com o toque longo existente): corrigido; o
  feedback usa a propriedade `scale` e não mexe mais na transição original.
- **LOW** (voo partindo de fora da tela; dois voos simultâneos): corrigido; checagem
  nos dois eixos e um voo por vez.

## Prova (`scripts/bivaque-html/round08-proof.mjs`)

Cada checkpoint liga o movimento, exceto o último:

- foto voa do cartão ao detalhe e termina limpa (sem cópia sobrando nem foto
  invisível);
- volta pousa sobre o cartão e o foco retorna a ele;
- negócio;
- cliques rápidos sem resíduo;
- cascata termina com todos os cartões visíveis;
- com movimento reduzido, nada anima.

O `MODULE_MAP` e o invariante do builder passaram a cobrir **50 fragmentos**.
