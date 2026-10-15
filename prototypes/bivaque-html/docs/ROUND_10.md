# Bivaque — Rodada 10: componentes Material visíveis

Data: 14/10/2026. Contrato: `docs/agents/tasks/HTML-010.task.yml` (R2). Base: `a5f2399e`.

**Veredito: PASS.** Os componentes foram adotados onde se encaixam, com aprovação visual do usuário, decisões de produto aplicadas e regressão completa verde, sem falhas.

**Aprovação visual do usuário (14/10/2026): as 5 telas comparadas** (catálogo, página
do negócio, conversa, busca, Cidade e momento). As capturas de antes e depois estão em
`.visual/bivaque-html-round10/comparar/`.

## O que mudou

| Tela | Antes | Depois |
| --- | --- | --- |
| Catálogo | "Preço mínimo" e "Preço máximo" em dois campos | **Slider de faixa** (`md-slider range`) com o texto da faixa ("Qualquer preço" ou "R$ 200 a R$ 900") |
| Página do negócio | Bairros separados por vírgula; serviços, um por linha | **Chips de entrada** (`md-input-chip`): Enter ou vírgula adiciona, X remove, repetidos ignorados, lista colada separada, texto pendente entra ao publicar |
| Conversa | — | **Respostas rápidas** (`md-suggestion-chip`) que preenchem o rascunho, **sem enviar** e sem apagar o que já estava digitado; somem quando o perfil não pode enviar |
| Busca | Sugestões sumiam após a primeira busca e, sem histórico, apareciam rotuladas como "recentes" | **"Buscas recentes"** (só histórico real) e **"Sugestões"** (sempre, sem repetir) |
| Cidade e momento / Cadastro | Pediam datas e destino para quem mora na cidade | **Por momento:** "Moro" sem campos; "Chegando" só a chegada; "Saindo" saída e destino. No cadastro, chegada e saída ficam separadas no rascunho |

Os dois últimos itens vieram de **testes do usuário no celular**. A busca não era
regressão de código: a regra estava no HTML original.

## Não adotado, com motivo

- **FAB oficial (`md-fab`):** o "Criar" já é um FAB Material completo (recolhe ao rolar,
  se transforma ao abrir o menu, muda de posição no desktop, tem tema escuro). Trocar
  exigiria refazer o esqueleto do app, com risco alto e ganho visual quase nulo.
- **Botão de salvar tonal:** o círculo escuro atual tem mais contraste sobre fotos claras.
- **Listas oficiais e abas secundárias:** as linhas das conversas têm gestos de arrastar
  próprios, e não há lugar natural para abas secundárias.

## Revisões independentes

Nenhum achado CRITICAL ou HIGH em duas revisões.

- **MEDIUM corrigido:** remover um chip não contava como alteração, e o editor fechava
  sem perguntar.
- **MEDIUM corrigido:** no cadastro, chegada e saída usavam a mesma data.
- **MEDIUM corrigido:** o foco se perdia ao redesenhar a etapa do cadastro. A etapa
  **não é mais redesenhada**: os campos de data e destino só aparecem ou somem, então o
  seletor em uso não é destruído e o foco permanece.
- **Falha intermitente da prova (1 em 72):** a primeira hipótese (o foco devolvido após
  redesenhar) estava errada; a correção baseada nela piorou o resultado (2 em 72). A
  causa real é que o menu do `md-select` ignora um toque enquanto anima o fechamento
  anterior. O auxiliar `choose` do harness passou a esperar o fechamento e tocar de novo
  se o menu não abrir. Nenhuma asserção foi afrouxada; 54/54 em 3 repetições e 72/72 na
  bateria final.
- **LOW corrigidos:** filtro de preço obsoleto ao trocar de categoria; lista colada; texto
  apagado pela resposta rápida; leitor de tela anunciando cada passo do slider.
- **Ruído de fim de linha:** os fontes do protótipo usam CRLF no repositório, e a
  convenção de cada arquivo foi preservada.

## Prova

| Prova | Resultado |
| --- | --- |
| Rodada 10, matriz completa | PASS, 72/72, 0 erros JS, 0 requisições externas |
| Regressão das Rodadas 09 a 03 (bateria completa) | PASS: 24/24, 42/42, 48/48, 36/36, 72/72, 78/78, 108/108 |
| Rodada 02 | PASS, 72/72 |
| Rodadas 01 e 00.1, visual | PASS |
| Gate completo | PASS (lint, typecheck, build, test, secrets) |

Candidato: `390ab72cc70d28cef8357118c0f1acbc4b80d630b3cfc417fb57941dea0aed3b`.

As provas das Rodadas 01, 03 e 06 foram atualizadas para a nova interação: slider pelo
teclado, chips por Enter, e campos de texto entrando na assinatura da varredura.
