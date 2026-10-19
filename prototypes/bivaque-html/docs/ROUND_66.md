# Bivaque — Rodada 66: bairro em qualquer cidade

Data: 19/10/2026. Contrato: `docs/agents/tasks/HTML-066.task.yml` (R2, dados pessoais). Lote Bairros
(Rodadas 66 e 67), a partir do pedido do usuário ("Não pense só em Manaus") e da maquete aprovada
(`.visual/bivaque-html-bairros/maquete.html`). Base: HEAD `1e822970` (base visual R65, `0dce1b06…`).
Candidato: build `35be65be…`.

**Veredito: PASS** no protótipo.

## O que mudou

### Base de bairros por cidade (`data/demo/bairros.js`)

- Manaus (11), Brasília (9), Natal (11) e Rio de Janeiro (12): nome, zona e o centro aproximado do bairro
  (longitude e latitude, dado público). O centro serve para a localização agora e para a distância e o mapa
  na Rodada 67.
- CEPs de teste (14), porque o protótipo não usa rede. No app real o CEP vai a uma base de CEP (ViaCEP ou
  BrasilAPI), devolve bairro e cidade e é descartado. A lista nacional de bairros vem da base de CEP, do IBGE
  e do OpenStreetMap, e cresce com o que a comunidade digita (a moderação junta as variações).

### Campo de bairro com busca (`shell/hood-picker.js`)

No lugar da lista fixa de Manaus (e do texto livre opcional das outras cidades), um campo de busca em
pedido, anúncio, imóvel (passo 1 do assistente), indicação e Configurações:

- **Ao tocar:** "Mais escolhidos em <cidade>", os bairros que mais aparecem em anúncios, pedidos e negócios
  da cidade, completados pela ordem da base. Nunca bairros de outra cidade.
- **Pelo nome:** sem acento e sem diferença de maiúsculas ("candelaria" acha Candelária), com o trecho
  destacado e a zona. O que começa com o texto vem primeiro. Seta para baixo e Enter escolhem, e Esc fecha
  as sugestões antes da janela.
- **Pelo CEP:** com 8 números, o CEP de teste da cidade sugere o bairro ("Natal · pelo CEP"). Um CEP de
  outra cidade ou um desconhecido explica o que fazer. Sempre aparece "O CEP só serve para achar o bairro e
  não fica salvo." Um CEP digitado sem escolher o bairro deixa o campo inválido: o formulário não sai e
  nada é gravado.
- **Pela localização:** "Usar minha localização" pede a posição ao aparelho (sem cache) e escolhe o bairro
  mais próximo da cidade, até 30 km. As coordenadas ficam só na função e são descartadas. Longe da cidade,
  não escolhe nada e explica.
- **Fora da base:** "Usar “Vila Isabel” como está". Ao sair do campo, um nome da base escrito de outro jeito
  vira o nome certo ("  copacabana " → Copacabana).
- **Depois de escolher**, o texto de apoio mostra "Natal · Zona Sul" (ou "· pelo CEP", "· pela localização",
  "· bairro digitado").
- **Obrigatório** onde a cidade tem base (as quatro). Em Configurações, "Seu bairro (opcional)" agora existe
  em qualquer cidade, e apagar o campo tira o bairro do perfil.

### Pedidos (`features/requests/model.js`)

Um pedido com bairro fora da base chega a todas as empresas do ramo na cidade, como "Outro bairro" já
chegava. Os pedidos antigos com "Outro bairro" continuam iguais.

### Fica para a Rodada 67

Filtro "Distância de mim" e bairros por busca, e o mapa em qualquer cidade. Por isso `cityHasHoods` e
`HOODS` continuam como estavam: o filtro e o mapa ainda só aparecem em Manaus.

## Provas

- `round66-proof.mjs`, 5 checkpoints em 375-light e 1440-light: **10/10 PASS**, 0 erros de JS, 0 pedidos
  externos.
  - Contra a base R65 (375-light): **0/5**.
  - Os checkpoints conferem no armazenamento cru que o CEP ("59075", "20510") e as coordenadas nunca
    aparecem.
- **Provas antigas ajustadas, porque o comportamento mudou de propósito:**
  - `proof-harness.mjs`: `choose()` reconhece o campo de bairro. Sem valor, toca na primeira sugestão; com
    valor, digita e toca na sugestão com aquele nome (ou em "Usar … como está", caso de "Outro bairro").
    Assim as provas antigas que escolhiam bairro numa lista continuam valendo.
  - `round64-proof.mjs`, checkpoint `forms-offer-no-manaus-hoods-in-other-cities`: deixa de exigir lista em
    Manaus e texto livre fora. Agora confere que as sugestões são da cidade da pessoa e que o anúncio de
    Brasília sai com um bairro de Brasília. Passa 2/2.
- `round11-proof.mjs` (pedidos, usa o `choose()` novo com "Centro" e "Outro bairro"): 13/13 em 375-light.
- `npx pnpm@11.18.0 gate`: **verde** (lint, testes, segredos). O build web pulou, como sempre na worktree
  (falta `apps/web/.env.local`). A primeira passada pegou só formatação dos três scripts de prova.
