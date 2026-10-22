# Bivaque — Rodada 35: Início do celular e barra de navegação

Data: 17/10/2026. Contrato: `docs/agents/tasks/HTML-035.task.yml` (R2). Base: `ab70368c`.
Primeira rodada do lote mobile.

**Veredito: PASS.**

## Como chegamos aqui

- **Auditoria das telas em 390 px.** Tudo funcionava, mas o celular parecia o site encolhido.
  A Início não tinha passado pela reorganização que o desktop ganhou na Rodada 13.
- **Maquetes com as peças reais do protótipo**, versões 1 a 6. O usuário escolheu:
  - carrossel em vez de grade;
  - sem o aviso pessoal, porque os avisos já ficam no sino (no desktop ele continua);
  - a cidade no título;
  - a barra C, com o "Criar" num círculo no centro;
  - ícones em SVG;
  - a luz sobre a aba ativa.
- **Referências:**
  - Mobbin: Depop, Vestiaire e Canva (Criar no centro); Posh, TheFork e Swiggy (cidade no
    título);
  - 21st.dev: Limelight Nav e Tubelight Navbar (luz na aba ativa); Placeholders and Vanish
    Input (exemplo na busca).

## O que mudou

### Início abaixo de 1024 px (celular e tablet)

- **Título:** "O que você precisa em **Manaus ⌄**". Tocar na cidade abre a troca de cidade.
  Na cidade de consulta, o título é "Conheça {cidade}". Quem está chegando ou saindo vê a
  contagem de dias.
- **Busca:** mostra um exemplo, como Busque "diarista no Planalto". O exemplo gira a cada 3,2 s;
  com movimento reduzido, fica fixo.
- **Ordem:**
  1. busca e atalhos (mais compactos);
  2. "Precisa contratar?";
  3. Serviços recomendados;
  4. Oportunidades;
  5. Nos seus grupos;
  6. Próximo encontro;
  7. chegada pelo momento;
  8. A comunidade procura;
  9. Guia;
  10. "Tem um negócio?", como linha discreta no fim.
- **Serviços e oportunidades:** carrossel com dois cartões e meio à vista. O patrocinado fica
  no 2º cartão, com rótulo; o bloco "Destaque na cidade" saiu.
- **Mesmos blocos do desktop:** `homeDeskServices` ganhou a posição do patrocinado como
  parâmetro e `homeDeskItems`, o título. A Início antiga do celular e `homeGroupsBlock`, que só
  servia a ela, saíram.
- **Tamanho:** a página caiu de 4,4 para 3,2 telas em 390 px.

### Barra de navegação

- **Ícones em SVG próprio,** desenho baseado no Lucide (licença ISC):
  - Comunidade com duas pessoas e Conversas com um balão, que deixam de se confundir;
  - Você mostra as iniciais;
  - vale para o celular e para a barra lateral.
- **No celular:**
  - fundo da página com sombra leve, sem a faixa cinza;
  - "Criar" num círculo elevado no centro. É o próprio `#fab`, com o mesmo id, menu e bloqueio,
    e o menu abre centralizado;
  - luz sobre a aba ativa no lugar da pílula.
- **Cidade:** sai da barra superior abaixo de 1024 px e continua no Início, no Você e nos links
  com `?cidade=`. No desktop, nada muda.

## Prova

| Prova | Resultado |
| --- | --- |
| Rodada 35 (7 verificações; 375 e 1440, claro) | PASS, 14/14 |
| Gate completo | PASS |

Capturas: `.visual/bivaque-html-round35/telas/` (`scripts/bivaque-html/round35-shots.mjs`).
Maquete: `.visual/bivaque-html-home-mobile/`.

> **Substituído em 21/10/2026 (Rodada 70, ADR-20261020).** A "luz sobre a aba ativa" deu
> lugar ao pill de 10 px da maquete do brandbook, nos temas claro e escuro. O checkpoint
> `bar-icons-are-svg-with-light-on-active` da `round35-proof.mjs` mantém o id e passou a
> afirmar o pill. O resto da rodada continua valendo.

## Fica para o fechamento do lote

- **Provas antigas que verificam a Início ou a barra do celular** devem mudar, e a mudança é
  intencional: Rodadas 01, 07, 13 e a visual estrita.
- **Nova base visual,** com a aprovação do usuário.
