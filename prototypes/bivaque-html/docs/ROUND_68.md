# Bivaque — Rodada 68: correções das revisões do Lote Bairros

Data: 19/10/2026. Contrato: `docs/agents/tasks/HTML-068.task.yml` (R2). Lote Bairros (Rodadas 66 a 68).
Base: a Rodada 67 (`87f3c853`, build `2920155a…`). Candidato: build `3d427b0d…` (a primeira passada, sem os achados LOW do OpenCode, foi `0d1de785…`).

**Veredito: PASS** no protótipo.

## Revisões

Três revisões independentes, só de leitura, sobre o diff `1e822970..87f3c853`:

- o agente revisor de código: 1 HIGH, 2 MEDIUM e 3 LOW;
- o Codex: 2 HIGH, 2 MEDIUM e 1 LOW;
- o OpenCode (DeepSeek V4.1 Flash): 1 CRITICAL, 1 HIGH, 2 MEDIUM e 6 LOW.

As duas primeiras coincidiram no defeito principal: o CEP escapava para o armazenamento por caminhos que a
R66 não cobria.

## O que mudou

### CEP nunca é gravado (HIGH)

- **Rascunho de anúncio** (`listings/editor.js`, via `shell/hood-picker.js`). Antes, "Salvar rascunho"
  gravava o CEP digitado no bairro, porque o rascunho não passa pela validação do envio. Agora
  `hoodValue()` nunca devolve CEP. Com CEP no campo, devolve vazio, e isso vale para enviar e para salvar
  o rascunho.
- **CEP junto de texto.** Antes, "CEP 59075-000" ou "Rua das Flores, 59075-000" virava bairro livre pelo
  "Usar … como está". Agora `hoodCep()` acha qualquer trecho com pelo menos 5 números:
  - o campo trata esse texto como CEP: sugere o bairro e não oferece usar como está;
  - o formulário não sai com ele.
  - Nomes com número curto continuam valendo: "Parque 10", "Vila 2".
- **Bairros em que o negócio atende** (`businesses/editor.js`). Um chip com CEP é recusado com aviso, e a
  página não é publicada. Os nomes da base escritos de outro jeito viram o nome certo.
- **Configurações** confere o CEP no texto digitado, não no valor já limpo. Assim continua avisando em vez
  de apagar o bairro do perfil sem dizer nada.

### Pedido chega à empresa que escreveu o bairro de outro jeito (MEDIUM)

`requests/model.js`: a comparação entre o bairro do pedido e os bairros da empresa ignora acento e caixa.
Uma empresa que atende "candelaria" recebe o pedido de "Candelária".

### Alerta e distância (MEDIUM)

`listings/alerts.js`:

- **Ao criar.** O alerta só guarda a distância quando ela vale, isto é, com bairro no perfil e na cidade onde
  a pessoa mora. Antes, guardava e anunciava "até 3 km do seu bairro" sem aplicar.
- **Depois de criado.** Se o bairro do perfil sumir, um alerta com distância para de casar. Antes, passava a
  valer para a cidade inteira com o mesmo rótulo.
- **Na comparação** com os filtros da tela, a distância só conta quando vale.

### Campo de bairro (LOW)

- Esc com o foco numa sugestão fecha de vez; antes, as sugestões reabriam.
- Editar depois de escolher volta o texto de apoio ao padrão. Antes, ficava "Zona Sul · pela localização" de
  um bairro que não era mais o escolhido.
- O leitor de tela ouve só a contagem ("3 sugestões. Use as setas para escolher."), não a lista inteira a cada
  letra.

### Achados só do OpenCode (LOW)

- **Localização que chega depois de fechar a janela** não mexe mais em nada. Antes, marcava o próximo
  formulário como alterado, e fechar pedia "Descartar alterações?" sem motivo.
- **"Usar minha localização"** tem 44 px de altura, o mínimo de toque do projeto. Antes tinha 40.
- **Bairro digitado à mão no perfil** ("Vila da Prata"). O filtro agora explica que a distância usa os
  bairros da lista e pede para escolher o seu na lista. Antes, dizia "Informe seu bairro", como se não houvesse
  nenhum.
- **A chave do mapa já montado** inclui a cidade, para que um mapa nunca seja reaproveitado em outra cidade.

### Pendências registradas

- **Padrão combobox completo no campo de bairro** (`role="combobox"`, `aria-expanded`). O
  `md-outlined-text-field` não repassa esses atributos ao campo interno. Fica para quando o campo for
  reescrito no app real.
- **Endereço sem CEP** ("Rua das Flores 12") ainda pode entrar como bairro livre. O texto de apoio orienta
  ("Só o bairro aparece…"). No app real, a moderação junta e corrige os bairros digitados.

## Provas

- `round68-proof.mjs`, 6 checkpoints em 375-light, 768-light e 1440-dark: **18/18 PASS**.
  - A primeira passada tinha 5 checkpoints, sem os achados LOW do OpenCode, e deu 10/10 em 375-light e
    1440-light.
  - O checkpoint do bairro digitado entrou junto com esses achados.
  - Contra o build da R67 (375-light): **1/5**.
  - O checkpoint de alerta já passava antes e fica como guarda.
- `round66-proof.mjs`: 15/15 e `round67-proof.mjs`: 9/9, nos mesmos três contextos, com o build final.
- `npx pnpm@11.18.0 gate`: **verde**. O build web pulou, como sempre na worktree.
