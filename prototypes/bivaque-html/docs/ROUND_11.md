# Bivaque — Rodada 11: contratar serviço (pedido aberto e propostas)

Data: 15/10/2026. Contrato: `docs/agents/tasks/HTML-011.task.yml` (R3). Base: `d53db07f`.
Decisão: [ADR-20261015](../../../docs/decisions/ADR-20261015-pedido-aberto-e-propostas.md),
aprovado pelo usuário **só para o protótipo**: 5 propostas por pedido, valor fixo, faixa ou
"a combinar após visita", e nenhuma cobrança do prestador.

**Veredito: PASS.** O fluxo funciona, os dois lados (quem pede e quem propõe) têm prova nos 6
contextos, a revisão independente não deixou achado aberto e a regressão completa está verde.

**Aprovação visual do usuário (15/10/2026):** telas da rodada aprovadas.

## O fluxo

1. **Quem precisa** abre "Criar → Contratar serviço" ou "Precisa contratar?" em Negócios
   locais. Informa o tipo de serviço, o bairro (nunca o endereço), a descrição (20 a 1000
   caracteres), quando precisa (o quanto antes, até uma data ou numa data) e até 4 fotos.
2. O pedido vai para as **empresas do ramo** da cidade que atendem o bairro. Ele recebe até
   **5 propostas** em **7 dias** e depois expira. Cada pessoa pode ter até 3 pedidos abertos.
3. **Cada empresa** envia uma proposta com valor (fixo, faixa ou a combinar após visita),
   data disponível, validade, prazo de execução e mensagem. A empresa pode editar ou retirar
   a proposta enquanto o pedido está aberto e não vê as propostas das outras.
4. **Quem pediu** compara as propostas e escolhe uma. As outras são recusadas, e a conversa
   com a empresa abre com um rascunho pronto. Quem pediu também pode cancelar o pedido.
5. O aviso "O Bivaque não intermedeia pagamento nem garante o serviço" aparece no
   formulário, no pedido e na confirmação da escolha.

Para testar sozinho, use os **Controles do protótipo**:

- **Simular propostas de prestadores:** as empresas de exemplo respondem aos seus pedidos.
- **Você → Pedidos de serviço:** com "Meu negócio" criado, mostra pedidos fictícios do seu
  ramo, para testar o lado do prestador.

**Opção C (decisão do usuário):** "Perguntar à comunidade" não prepara mais rascunhos de
orçamento. Orçamento com uma empresa específica continua na página do negócio.

## Revisão independente

- **HIGH corrigido:** depois que o pedido fechava, a empresa recusada ainda via descrição,
  fotos e nome de quem pediu. Agora, depois do fechamento, só a empresa escolhida vê os
  detalhes. As outras veem "Este pedido foi encerrado".
- **MEDIUM corrigido:** a lista do prestador ignorava os bairros que a empresa atende.
- **MEDIUM corrigido:** uma proposta retirada ainda podia ser escolhida a partir de uma tela
  desatualizada.
- **MEDIUM corrigido:** as ações confiavam na tela. Agora enviar, escolher, cancelar e
  retirar conferem de novo o dono, a situação e a elegibilidade no momento da ação.
- **MEDIUM corrigido:** algumas recusas eram silenciosas. Agora cada recusa mostra uma
  mensagem.
- **Ícone ausente:** `handyman` não existe na fonte embutida e aparecia como texto. Foi
  trocado por `build`, e uma prova agora confere todos os ícones da rodada.
- **Conferência contra o ADR (P7):** faltava a denúncia de pedido e de proposta. Ela foi
  acrescentada no padrão das outras denúncias do protótipo, com o aviso de que o tratamento
  depende da rodada de moderação e sem registrar nada.

### Fechamento: segunda revisão e regressão

- **Provas antigas que conheciam o menu de 6 itens.** A Rodada 01 contava 6 itens no menu
  Criar. Agora conta 7 e exige "Contratar serviço".
- **Prova visual estrita.** A base congelada da Rodada 00.1 continua intacta. Só no
  candidato, o item novo sai do menu e o menu é reposicionado (correção da revisão:
  sem isso, o menu ficava deslocado e a falha dependia do tempo). Todo o resto do menu
  segue comparado pixel a pixel.
- **Cobertura do item novo.** Uma prova nova confere que ele cabe no botão, no menu e na
  tela nas 3 larguras. Essa prova pegou o subtítulo saindo cerca de 4 px da coluna de
  262 px do menu. O texto mudou de "Receba propostas de empresas do ramo" para
  **"Propostas de empresas do ramo"**, com tamanho dentro dos subtítulos já existentes.
- **Varredura de botões mortos** (Rodada 06) passou a incluir a tela "Pedidos de serviço".
- **Teste instável da Rodada 08** ("a foto volta ao cartão"): falhava também na versão
  anterior (HEAD), em 3 de 18 contextos. A versão nova falhou em 3 de 18 nas mesmas
  condições. Por isso não era efeito da Rodada 11. O teste media 470 ms a partir do clique,
  mas o voo só começa depois de a lista redesenhar, e esse atraso varia com a carga da
  máquina. Agora a medida é feita aos 470 ms do relógio da própria animação. A tolerância
  de 8 px não mudou. Resultado: 18 de 18 nas duas versões, em 3 repetições cada.

## Fora do escopo (pelo ADR)

Backend, tabelas e políticas; cobrança do prestador, ranking pago, pagamento ou garantia;
avaliação de prestador. O aviso para quem teve a proposta recusada só chega à página do
próprio usuário, porque no protótipo as empresas de exemplo não têm caixa de avisos.

## Prova

| Prova | Resultado |
| --- | --- |
| Rodada 11, matriz completa (13 verificações) | PASS, 78/78, 0 erros JS, 0 requisições externas |
| Rodada 08, com o teste do voo corrigido | PASS, 42/42; voo isolado 18/18 em 3 repetições (versão nova e HEAD) |
| Rodada 06 (varredura com "Pedidos de serviço") | PASS, 36/36 |
| Rodada 01 e visual estrito | PASS (visual: só a tela "Você" muda, pela linha nova) |
| Gate completo | PASS (lint, typecheck, build, test, secrets) |
| Rodadas 10, 09, 07, 05, 04, 03, 02 e 00.1 | PASS: 72/72, 24/24, 48/48, 72/72, 78/78, 108/108, 72/72 e PASS |

As Rodadas da última linha rodaram no candidato `b22ee62f`. Depois dele, só mudaram os
botões de denúncia nas telas de pedido e o subtítulo do menu, e nenhuma dessas rodadas
toca nesses pontos. As linhas acima delas rodaram no candidato final.

Candidato: `945ff539be779b4201d5d42f77dd61844407e8dba4fed7c77a6244d978b0d1bd` (2.895.955 bytes).
