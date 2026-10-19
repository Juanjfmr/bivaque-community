# Bivaque — Rodada 56: passo 3 da entrada, boas-vindas e entrada em análise no Painel

Data: 18/10/2026. Contrato: `docs/agents/tasks/HTML-056.task.yml` (R3, com o
[ADR-20260816-forma-da-admissao](../../../docs/decisions/ADR-20260816-forma-da-admissao.md)).
Base: `2299e7f1`. Última rodada do lote Entrada.

**Veredito: PASS.**

## O que mudou

- **Passo 3 da entrada** (`#entrar/cidade`), como na maquete v2: página da entrada, não mais
  diálogo.
  - Campos: cidade, momento (Chegando, Moro aqui, Saindo) e "Como você quer ser chamado", com o
    nome da conta preenchido.
  - A data aparece só para quem chega ou sai. Quem sai escolhe um destino diferente da cidade.
    Chegada e saída guardam datas separadas, e trocar o momento não tira o foco do seletor.
  - Só abre para quem tem conta com elegibilidade confirmada.
  - "Concluir minha entrada" grava a cidade, o momento e o perfil (nome, e-mail da conta,
    verificado; família quando veio por convite) e leva às boas-vindas.
- **Boas-vindas** (`#entrar/boas-vindas`): "Você chegou ao Bivaque." com o plano do momento, a
  turma de quem chega no mesmo ciclo (quando há) e "Entrar na comunidade". Só para quem já entrou.
- **O cadastro antigo em diálogo saiu.** Vínculo e Força não são mais escolhidos. O resultado da
  verificação também não: ele vem da consulta do CPF ou do convite.
  - Com o perfil de teste não verificado, publicar mostra "Perfil em análise" em vez de reabrir o
    cadastro.
- **Painel do Bivaque:** a entrada em análise neste dispositivo aparece na fila de verificações.
  - A revisão mostra o documento enviado e lembra que o CPF não fica guardado.
  - "Aprovar" libera o passo 3; "Pedir outro documento" devolve a pessoa ao envio.
  - Desfazer só vale enquanto a pessoa não seguiu na entrada.
- **Controles do protótipo:** "Ver o cadastro" virou "Ver a entrada do zero". Ele sai da conta,
  limpa a entrada em andamento e abre "Criar conta", sem apagar os dados de teste.

## Provas adaptadas

- Rodada 02: os 6 pontos do cadastro em diálogo viraram pontos do passo 3: caminho feliz,
  validação, conta de família, destino na saída, sair e retomar, e falha de gravação. Também o
  bloqueio de publicação sem verificação.
- Rodada 10: campos do momento e datas separadas, agora no passo 3.
- Rodadas 54 e 55: a elegibilidade confirmada leva ao passo 3, não mais ao diálogo.
- Prova de execução: na referência original o diálogo continua; no candidato, "Ver a entrada do
  zero" abre a conta.

## Prova

| Prova | Resultado |
| --- | --- |
| Rodada 56 (4 verificações; 375 e 1440, claro) | PASS, 8/8 |
| Rodada 02 (375 claro) | PASS, 12/12 |
| Rodada 10 (375 claro) | PASS, 12/12 |
| Rodadas 54 e 55 (375 claro) | PASS, 6/6 e 5/5 |
| Gate (lint, tipos, testes, segredos) | PASS |

Capturas: `.visual/bivaque-html-round56/` (passo 3 e boas-vindas, 375 e 1440).

## Fechamento do lote: revisões e correções

Três revisões independentes do lote (R53 a R56): revisão de código, revisão de segurança (R3) e
Codex (GPT). Nenhum achado crítico; XSS, senha e CPF guardados: nada encontrado.

Decisões do dono (18/10/2026):

- **Resultados distintos na consulta do CPF**, como exceção ao BIVAQUE.md §4.2. A revisão de
  segurança pediu resposta única para ninguém descobrir quem é militar testando CPFs. O dono decidiu
  o contrário: todo militar é agente público e o vínculo já aparece no Portal da Transparência, então
  o resultado não revela nada novo e ajuda a pessoa. Confirmado segue para a cidade; não localizado
  pede um documento; fonte fora do ar pede para tentar de novo. Cabe ao dono atualizar a §4.2.
- **Convite familiar preso ao e-mail** (§4.1). Quem convida informa o e-mail do familiar; o convite
  vale só para ele, vence em 7 dias e só é consumido quando a pessoa conclui a entrada. Quem entrou
  por convite não convida outros.
- **Perfil novo do zero.** A conta nova não herda vínculo, Força nem interesses. Em Você aparece
  "Vínculo confirmado". O conteúdo de demonstração (anúncios, conversas) continua compartilhado
  neste aparelho: limite do protótipo, separado por conta só no app real.

Correções:

- A paleta de comandos (Ctrl+K) não abre para quem saiu ou está na entrada; publicar também não.
- O próximo passo da entrada fica num só lugar: o endereço não pula o aceite do Google, a consulta
  do CPF nem a análise. "Simular aprovação" só aprova uma análise pendente.
- "Quero fazer parte" com uma entrada em andamento oferece continuar ou começar com outra conta
  (com confirmação), em vez de apagar a conta sem aviso. Entrar sempre abre o formulário: quem está
  em análise pode usar outra conta.
- Desfazer no Painel guarda de quem era a entrada: não vale se outra conta começou depois.
- Do documento fica só o tipo e o tamanho; o nome do arquivo (que pode trazer o CPF) não é guardado.
- A amostra grátis usa só exemplos aprovados para divulgação, nunca o que alguém publicou aqui.
- Voltar pelo navegador depois de concluir não troca a cidade de quem acabou de entrar.
- "Esqueci minha senha" ganhou "Usar outro e-mail". Entrar só compara a senha (a regra vale para
  criar a conta) e apaga a senha depois de uma falha.
- Enter num campo envia o passo; o campo com erro fica marcado; o foco vai ao título quando a tela
  muda sem trocar de endereço.
- A cidade do passo 3 começa em branco.

Ficaram de fora (LOW): a imagem `chegada`, sem uso desde a saída do cadastro em diálogo, continua
em `data/demo/assets.js` (extraída da referência original); trocar de cenário nos controles do
protótipo ainda descarta a entrada em andamento.

| Prova | Resultado |
| --- | --- |
| Rodada 56 (6 verificações; 375 e 1440, claro) | PASS, 12/12 |
| Rodadas 54 e 55 (375 e 1440, claro) | PASS, 12/12 e 10/10 |
| Rodadas 01, 02, 10 e 53 | PASS |
| Gate (lint, tipos, testes, segredos) | PASS |

## Congelamento

Aprovado pelo usuário em 18/10/2026 ("pode congelar o protótipo com o lote de entrada"), sem
publicar. Nova base visual em [VISUAL_BASELINE_R56](VISUAL_BASELINE_R56.md) (`19df283b…`).
