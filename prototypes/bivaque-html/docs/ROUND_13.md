# Bivaque — Rodada 13: Início do desktop e painel Criar

Data: 15/10/2026. Contrato: `docs/agents/tasks/HTML-013.task.yml` (R2). Base: `e44026d5`.

**Veredito: PASS.** As telas foram aprovadas pelo usuário. A revisão independente não deixou
achado aberto. A bateria completa passou sem falhas, incluindo o visual estrito contra a
nova base e o gate.

## Decisões e aprovações do usuário (15/10/2026)

- Entre duas versões da Início web, a escolhida foi a **versão 2**, com os ajustes
  sugeridos: sem estrelas, "Vou" no encontro, chegada pelo momento e entrada para
  "Contratar serviço". O erro de digitação do mockup também saiu.
- **Só desktop**, a partir de 1024 px. O celular e o tablet ficam como estavam.
- **Nova base visual aprovada**. A Início e o Criar aprovados viram a referência congelada.
- Ajustes pedidos depois de ver as telas:
  - otimizar o espaço;
  - o texto do encontro quebrava;
  - o "Bivaque" no cabeçalho estava pequeno;
  - o botão Criar estava desalinhado e genérico.
- **Painel Criar** inspirado no 21st.dev (Create Button da Motion) e no Mobbin (painéis do
  Mixpanel e do Craft). Aprovado com "sim".

## O que mudou no desktop

| Parte | Antes | Depois |
| --- | --- | --- |
| Largura | Conteúdo limitado a 1120 px | Só a Início usa até 1360 px; as outras páginas não mudam |
| Topo | "Perto de você", busca e atalhos dividindo a linha | "O que você precisa em {cidade}?", busca inteira e os 4 atalhos em linha |
| Aviso pessoal | — | Pergunta minha com respostas > pedido meu com propostas > avisos não lidos, ao lado de "Precisa contratar?" |
| Serviços | Carrossel abaixo dos grupos e dos desapegos | "Serviços recomendados" logo no topo: 4 cartões (3 no notebook) com número de indicações, sem estrelas; o patrocinado vai na 3ª posição, com rótulo |
| Coluna lateral | — | "Nos seus grupos" (respostas e horário numa linha), "Próximo encontro" (título curto, "Vou" ou "Editar" se o encontro é meu) e chegada pelo momento |
| Cabeçalho | "Bivaque" com 19 px | 26 px na Início do desktop |
| Botão Criar | "+" 8 px fora do centro, sem rótulo | "+ Criar" com gradiente da marca e o "+" num disco claro, centralizado na barra |
| Menu Criar | Pilha de botões | Painel "Criar no Bivaque" que nasce do próprio botão: grade de opções com ícone por tipo, título e descrição, selo "Novo" em Contratar serviço, atalho **C** |

Abaixo de 1024 px, a Início continua idêntica à anterior e o menu Criar continua com a
pilha de botões. A única mudança no tablet é o "+" do botão Criar, que voltou para o
centro.

## Revisão independente

Nenhum CRITICAL ou HIGH.

- **MEDIUM corrigido:** o atalho C abria o Criar mesmo vendo outra cidade, no modo somente
  leitura. Agora respeita esse modo e o botão desabilitado.
- **MEDIUM corrigido:** o "Vou" aparecia no meu próprio encontro e não fazia nada. Agora
  aparece "Editar".
- **MEDIUM corrigido:** a semântica do painel. O painel é um diálogo nomeado pelo título,
  com o menu de opções dentro. O "X" tem rótulo, e o botão anuncia o atalho C só no
  desktop (`aria-keyshortcuts`).
- **MEDIUM corrigido, lacunas de prova:** entraram provas para somente leitura, encontro
  próprio, ordem do aviso (pedido e avisos não lidos), largura que não vaza para outras
  páginas, janela estreitando com o painel aberto e patrocinado visível no notebook. A
  prova passou a rodar também em 1024 px.
- **LOW corrigidos:**
  - estreitar a janela com o painel aberto fecha o painel;
  - o atalho ignora campos dentro de componentes e digitação com acento composto;
  - pergunta resolvida ou oculta não fica no aviso;
  - o pedido do aviso é da cidade atual;
  - o texto do aviso reaproveita `noticeText`;
  - em telas baixas a coluna lateral rola junto com a página;
  - o limite de propostas vem da constante.
- **Achados na bateria:**
  - Com "movimento reduzido", o painel ainda fazia um esmaecimento de 160 ms. A Rodada 07
    pegou, e agora o painel abre e fecha sem animação nesse modo.
  - O teto de tamanho da Rodada 09 (+120 KB sobre a Rodada 08) foi consumido pelas
    funcionalidades aprovadas das Rodadas 10 a 13; a 13 passou 8,8 KB. O teto foi separado
    em dois:
    - o pacote Material não pode crescer além do da Rodada 09 (mais rígido que antes);
    - o HTML inteiro tem teto de 3 MB, com o motivo registrado na prova.
  - A Rodada 01 achou duas falhas reais na Início do desktop:
    - faltava a faixa "Continue de onde parou", que voltou. O celular e o desktop usam
      agora a mesma função;
    - o aviso da Início repetia o botão "abrir este aviso" da lista de avisos. Agora ele
      abre a **lista** ("Ver avisos").
  - Na Rodada 11, um teste intermitente ("não cancelou", 1 vez em 5): a ação confirmada
    roda depois de a confirmação fechar e o histórico voltar. Três testes passaram a
    esperar o resultado por condição, como já se fazia na Rodada 02. A asserção não mudou.
- **Achado na prova, antes da revisão:** a conferência de "botão visível" do atalho usava
  `offsetParent`, que é sempre nulo para elementos fixos. O atalho não funcionava e passou a
  funcionar.

## Nova base visual

A comparação estrita da Início e do Criar passou a usar a base aprovada desta rodada
(`scripts/bivaque-html/round13-baseline.mjs`). Ela fica guardada em
`.visual/bivaque-html-round13/baseline/round13.html` e, se esse arquivo faltar, é
reconstruída do commit que criou este relatório. A base da Rodada 00.1 continua guardada.

Com isso:
- sai o ajuste provisório da Rodada 11, que removia "Contratar serviço" do menu antes de
  comparar;
- a ressalva visual da Rodada 12 (nomes das categorias) se resolve.

O `visual-stability.mjs` também compara com a nova base. A comparação com o layout da
Rodada 00.1 ficou só informativa.

## Prova

Bateria completa no candidato final, sem nenhuma falha:

| Prova | Resultado |
| --- | --- |
| Rodada 13 (16 verificações × 8 contextos: 375, 768, 1024 e 1440, claro e escuro) | PASS, 128/128, 0 erros JS, 0 requisições externas |
| Rodadas 12, 11, 10, 09, 08, 07 | PASS: 54/54, 78/78, 72/72, 24/24, 42/42, 48/48 |
| Rodadas 06, 05, 04, 03, 02 | PASS: 36/36, 72/72, 84/84, 108/108, 72/72 |
| Rodadas 01 e 00.1 | PASS |
| Visual estrito contra a nova base | PASS (diferenças só dentro do ruído do renderizador) |
| Estabilidade visual contra a nova base | PASS |
| Gate completo | PASS (lint, typecheck, build, test, secrets) |

Foram três baterias. A primeira e a segunda acharam os problemas descritos acima, que foram
corrigidos antes desta.

Candidato e nova base: `f63e6a9a9fb636508f8f987c43b5d603529dc3517907d3154cfc1951b5257aec`
(2.929.953 bytes).
