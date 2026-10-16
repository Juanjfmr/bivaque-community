# Bivaque — Rodada 24: fotos carregando e estados vazios ilustrados

Data: 16/10/2026. Contrato: `docs/agents/tasks/HTML-024.task.yml` (R1). Base: `bdf77a5a`.
Último item da ordem aprovada. Referências: Skeleton e Empty State, do 21st.dev.

**Veredito: PASS.**

## Decisão

O protótipo não busca dados na rede, e as telas aparecem na hora. Um esqueleto em tela inteira
exigiria um atraso artificial, então ele foi usado só onde existe espera de verdade: as fotos.
Elas são grandes, decodificam depois de a tela aparecer e chegam ao rolar a página.

## O que mudou

- **Fotos:**
  - a moldura dos cartões, do destaque do anúncio e das miniaturas pisca suavemente até a foto
    carregar, e a foto entra com um esmaecer;
  - foto que falha não deixa a moldura carregando para sempre;
  - a etiqueta do cartão continua visível;
  - com movimento reduzido, a moldura fica parada.
- **Estados vazios:**
  - os 23 estados vazios do app ganharam uma ilustração leve: mancha tonal, anel tracejado,
    ícone num círculo elevado e três pontos;
  - a ilustração é feita em SVG e CSS, sem imagem nova e sem peso;
  - o ícone flutua de leve, e os pontos piscam; com movimento reduzido, tudo fica parado;
  - a ilustração é oculta do leitor de tela; título, texto e ação continuam iguais.

## Prova

| Prova | Resultado |
| --- | --- |
| Rodada 24 (6 verificações; 375 e 1440, claro) | PASS, 12/12 |
| Rodada 23 | PASS |
| Gate completo | PASS |

Fecha o lote. A revisão independente única, a bateria completa, o novo congelamento visual com
aprovação e o deploy vêm em seguida.

## Revisão independente do lote (Rodadas 21 a 24)

Sem CRITICAL.

- **HIGH corrigido:** "Recomeçar" e "Trocar cenário" não passavam pela migração dos anúncios.
  Os exemplos voltavam sem atributos, e os novos sumiam até recarregar a página.
- **MEDIUM corrigido:** as fotos piscavam a cada redesenho e no fim do voo do cartão para o
  anúncio. Agora só a foto que ainda não está pronta ao entrar faz a moldura esperar.
- **MEDIUM corrigido:** digitar a data à mão quebrava, porque o painel era redesenhado a cada
  dígito. Agora os chips são atualizados no lugar, e datas passadas são ignoradas.
- **MEDIUM corrigido:** no desktop, o painel suspenso podia sair da janela. Agora abre acima da
  pílula ou encosta na base.
- **MEDIUM corrigido (acessibilidade):**
  - a contagem ao vivo é anunciada;
  - saíram os papéis `toolbar` e `radiogroup`, que prometiam navegação por setas sem
    implementá-la;
  - a pílula mostra "2+ vagas" quando só as vagas estão ativas;
  - os toques não redesenham o painel.
- **MEDIUM corrigido:** entrar pela Início, pelo plano ou trocar de cidade agora começa sem os
  filtros anteriores.
- **LOW corrigidos:**
  - clique fora fecha só quando começa no fundo (arrastar o slider não fecha);
  - cruzar 1024 px redesenha com o foco na pílula;
  - "Foto ilustrativa" só aparece quando há foto;
  - "0 quartos" deixou de virar "—";
  - números escapados;
  - altura da folha em `dvh`.
- **Pendentes para a bateria completa:**
  - a verificação do slider de preço da Rodada 10;
  - código morto do catálogo antigo (`catalog-filter`).

| Prova (375 e 1440, claro) | Resultado |
| --- | --- |
| Rodada 24, com redesenho sem piscar | PASS, 14/14 |
| Rodada 23, com data digitada, painel na janela e entrada pela Início | PASS, 28/28 |
| Rodada 22, com Recomeçar | PASS, 12/12 |
| Rodada 21 | PASS, 10/10 |
| Gate completo | PASS |
