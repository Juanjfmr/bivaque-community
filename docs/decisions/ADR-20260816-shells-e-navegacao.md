---
id: ADR-20260816-shells-e-navegacao
status: proposed
risk: R2
owner: Juan
approved_at: 2026-08-16
expires_at:
linked_plan: docs/superpowers/plans/2026-08-16-onda-e-a-vila.md
critic_verdict: PASS
critic_review: Veredito registrado em 2026-08-16 por autorizacao explicita do dono (Juan) na sessao de execucao: aprovar e executar a sequencia P0 a F. Aprovacao humana ja consta na secao Approval. A implementacao esta destravada conforme a RISK_MATRIX.md.
---

# Papéis são shells; navegação é container; destino novo aterrissa dentro

## Problem

A navegação foi decidida por adição, e a adição acabou. São cinco vagas no bottom nav, as cinco
estão ocupadas, e o roadmap ainda deve trazer a camada da cidade (onda E), a vitrine, a busca de
prestador e o dashboard de prestador (onda G), e três painéis de operação (onda H).

A pergunta que se fazia — *qual destino ganha a quinta vaga?* — não tem resposta que dure. Com
treze destinos, ela se repete a cada onda e é decidida sob pressão de prazo, que é como a
divergência abaixo apareceu.

**Três sintomas já visíveis no código:**

1. **Spec e código já divergem, e nada testa isso.** `docs/agents/VISUAL_GUIDE.md:46-49`
   especifica bottom nav com **4 itens** (Minha comunidade, Grupos, Eventos, Perfil), com
   Indicações via ícone no cabeçalho, e sidebar desktop com 5 incluindo Perfil.
   `apps/web/app/components/bivaque/bottom-nav.tsx:107` faz outra coisa: **remove** Perfil e
   entrega 5 itens, com Mensagens e Indicações dentro.
2. **A camada da cidade é inalcançável para quem mais precisa dela.**
   `apps/web/app/(shell)/community/page.tsx:203-210` só renderiza o link do Guia de chegada
   quando `!primaryCommunityName` — quem entrou numa vila perde o acesso. `NAV_ITEMS`
   (`bottom-nav.tsx:32-77`) não tem entrada nem para `/guide` nem para `/communities`.
3. **A administração já se fragmentou.** `apps/web/app/(admin)/` tem três páginas soltas —
   `admissions`, `reports`, `guide-queue` — sem console em volta, e a moderação do dono de
   comunidade está dentro de `communities/[id]/page.tsx`, misturada com o feed.

## Decision

**Duas regras, e a segunda só faz sentido depois da primeira.**

### 1. Papéis são shells diferentes, não abas a mais

A §1.3 do `BIVAQUE.md` já define papéis distintos, e eles não compartilham navegação:

| Shell | Quem | O que alcança |
|---|---|---|
| Membro | membro, dependente | os containers da regra 2 |
| **Console do fundador** | operador | tudo: moderação, aprovação, pendências, denúncias, financeiro, criação e delegação de administração |
| **Console do dono** | dono de comunidade, moderador | moderação e aprovação **da própria comunidade** |
| Prestador | prestador civil | apenas a própria ficha (D37) |

Isso corta a lista de treze antes de começar: painéis de admissão, denúncias, fila do guia e
dashboard de prestador **não disputam vaga nenhuma** — estão em outro shell. A D37 é explícita:
o prestador não lê feed, perfil nem grupo, e não tem membership.

**Os dois consoles nascem com caminhos de autorização separados, não com um componente
parametrizado.** `is_current_user_operator()` é global; a autorização do dono é por comunidade. O
modo de falha clássico é um componente compartilhado onde o escopo vira `prop` — aí um bug de
renderização vira escalada de privilégio.

**Os dois shells são definidos na onda D2**, com a primeira seção de cada um; E, F, G e H
penduram as suas dentro da estrutura já posta. O console do fundador atravessa cinco ondas —
aprovação e pendências em D2, delegação em E, ciclo de grupo em F, **financeiro em G, bloqueado
por CNPJ**, denúncias e suspensão em H —, então ele é um shell que cada onda preenche, nunca uma
task.

### 2. Dentro do shell do membro, a navegação espelha o modelo do produto

Não a lista de features. Os containers derivam da §3.1 (três níveis de pertencimento) e da §6.3
(os dois ciclos), e por isso são estáveis: eles não mudam quando uma feature nasce.

**Todo destino novo aterrissa DENTRO de um container, nunca como aba nova.** Vitrine e busca de
prestador caem na camada da cidade; convite de membro cai em "eu"; o seletor de localidade da
transferência ([`ADR-20260816-transferencia-e-pertencimento`](ADR-20260816-transferencia-e-pertencimento.md))
cai onde o nível de pertencimento é escolhido.

**A regra é falsificável, e é isso que a faz durar:** se um destino novo não couber em nenhum
container, o destino está confuso — não falta vaga. Nesse caso, pare e reporte.

Aplicando a régua ao estado atual, o item fora do lugar **não é Mensagens** — é **Eventos**, que
flutua solto como aba própria enquanto a §6.2 lista "eventos da cidade" como uma das quatro
coisas que o nível municipal é, e eventos de vila pertencem à vila. A arquitetura de informação
concreta é trabalho da onda E, e o `VISUAL_GUIDE.md` é reconciliado na mesma task.

### O que este ADR não decide

O desenho final dos containers e seus rótulos — é trabalho de IA na onda E, sob esta regra. E não
decide remover a superfície de DM: a D36 manda mantê-la porque a onda G a reaproveita para
conversa membro↔prestador.

## Alternatives considered

### A. Containers derivados do modelo do produto

**Escolhida.** A navegação passa a ter a forma da §3.1 e da §6.3, e o crescimento acontece dentro
dos containers. Custo: é trabalho de arquitetura de informação, vira task própria da onda E, e
obriga a reconciliar o `VISUAL_GUIDE.md`, que já diverge do código.

### B. Poucos itens fixos mais busca como escape

A forma do baseline: quatro destinos e uma busca que alcança o resto. Escala por definição — o
décimo terceiro destino é achado, não navegado. Rejeitada **para agora**: a busca não existe e é
trabalho real; a D43 proíbe busca de pessoas, então ela cobriria conteúdo, grupos e prestador; e
busca vazia numa cidade recém-aberta é pior que navegação vazia. Continua sendo o complemento
natural quando houver densidade — o baseline usa as duas coisas juntas.

### C. Resolver a vaga imediata e adiar a estrutura

Trocar Mensagens pela camada da cidade na onda E e reabrir a discussão com oito destinos.
Rejeitada: é exatamente a decisão incremental que produziu a divergência entre spec e código
descrita no Problema. Ninguém reabre estrutura sob pressão de prazo.

### D. Aumentar o teto para seis itens

Rejeitada: quebra o teto que o próprio código declara em `bottom-nav.tsx:104-107` — cinco é o
limite do iOS HIG e do Material —, e em 375px seis ícones com rótulo ficam abaixo do alvo de
toque de 44px, que já é o backlog de 106 achados `high` da auditoria visual.

## Market or reference baseline

O baseline do projeto está no próprio repositório. `docs/agents/nextdoor-refs/ANALYSIS.md:60,175`
registra o Nextdoor com **4 itens de navegação mais um FAB**: Home, Search, For Sale, Faves.

O dado que importa é o que **não** está lá: o Nextdoor tem grupos, eventos, vizinhos, mensagens,
notificações e páginas de negócio, e nenhum deles ocupa vaga. Um produto com muito mais
superfície que o Bivaque resolve com quatro containers e uma busca. **A navegação não cresce com
o número de features.**

## Proposed divergence from baseline

**Divergência parcial e deliberada.** O baseline usa busca como escape para a cauda de destinos;
esta decisão adota apenas os containers por enquanto, porque a busca não existe e porque a D43
restringe o que ela poderia cobrir. A divergência é temporária: a alternativa B é o complemento
previsto quando houver densidade para sustentá-la.

## Evidence and sources

- `docs/agents/nextdoor-refs/ANALYSIS.md:60,175` — o baseline, 4 itens mais FAB.
- `docs/agents/VISUAL_GUIDE.md:46-49` — a spec de navegação que o código não implementa.
- `apps/web/app/components/bivaque/bottom-nav.tsx:32-77,104-107` — `NAV_ITEMS` e o teto de cinco.
- `apps/web/app/(shell)/community/page.tsx:203-210` — o guia escondido de quem tem vila.
- `apps/web/app/(admin)/` — três páginas sem console.
- `apps/web/app/(shell)/communities/[id]/page.tsx:164-196` — a moderação do dono dentro do feed.
- `docs/BIVAQUE.md` §1.3 (papéis), §3.1 (níveis), §6.2 e D48 (o que o nível municipal é), §6.3
  (os dois ciclos), §12 regra 4; D36, D37, D43.
- Provocação do dono em 2026-08-16: *"precisamos construir o mvp pensando no futuro, hoje temos 5
  amanhã talvez 13 e nem todos poderão entrar na navegação"*, e o pedido das duas telas de
  administração.

## Benefits

- A pergunta "onde este destino novo mora?" passa a ter resposta antes de a feature existir.
- Papéis separados fazem a fronteira de autorização ser estrutural, não condicional.
- A camada da cidade fica alcançável por quem tem vila — quem chega transferido em dezembro é
  exatamente quem mais precisa do guia e é o único que hoje não o alcança.
- A divergência entre `VISUAL_GUIDE.md` e o código é fechada e passa a ter teste.

## Risks

- **Reorganizar navegação muda o mapa mental de quem já usa.** Mitigação: o produto é
  pré-lançamento; o custo nunca vai ser menor.
- **Dois consoles são duas superfícies de autorização.** Risco de escalada se compartilharem
  caminho. Mitigação: caminhos separados por construção, com teste positivo e negativo em cada
  um (§12 regra 7).
- **O console do fundador atravessa cinco ondas** e pode ficar meio pronto por muito tempo. A
  seção financeira depende de CNPJ e pode nunca chegar em dezembro. Mitigação: cada seção só
  aparece quando fecha ciclo — regra 3 da §12.
- **Container mal desenhado empurra destino para o lugar errado**, e a regra falsificável vira
  desculpa para forçar encaixe. Mitigação: "não coube" é sinal de parar e reportar, não de
  improvisar.

## Reversal cost

Baixo antes do lançamento: navegação é roteamento e composição, sem migração de dados. Depois de
usuários reais, o custo é de reaprendizado, não técnico. Separar os consoles é a parte mais cara
de reverter — mas juntá-los de novo seria reintroduzir o risco de escalada, então a reversão
dessa metade não é desejável em nenhum cenário.

## Success metric

1. Cada destino novo de E, F, G e H entra dentro de um container existente sem abrir vaga.
2. Um teste de escopo garante o teto de itens da navegação — a regra que hoje só existe em
   comentário.
3. `VISUAL_GUIDE.md` e o código concordam, e um teste falha quando divergirem.
4. Operador e dono de comunidade têm caminhos de autorização distintos, cada um com teste
   positivo e negativo.
5. A camada da cidade é alcançável em um toque a partir da home, com ou sem vila.

## Reopen condition

Reabrir quando a cauda de destinos dentro de um container ficar longa a ponto de exigir
navegação de segundo nível dentro dele — o sinal de que a alternativa B, busca como escape,
passou a valer o trabalho.

## Approval

Aprovação humana explícita por Juan em **2026-08-16**. A regra dos containers foi escolhida por
ele depois de recusar a formulação original — *"qual destino ganha a quinta vaga"* — com a
observação de que o MVP precisa ser construído pensando em treze destinos. Os dois consoles e o
ritmo de construção (shells definidos na D2, cada onda pendura sua seção) também foram escolha
dele.

Pela `RISK_MATRIX.md`, isto é **R2**: muda navegação, escopo e acesso administrativo, sem tocar
RLS nem dado pessoal. A implementação permanece bloqueada até `critic_verdict: PASS`.
