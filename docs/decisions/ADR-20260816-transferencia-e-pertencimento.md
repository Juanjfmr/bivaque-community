---
id: ADR-20260816-transferencia-e-pertencimento
status: proposed
risk: R3
owner: Juan
approved_at: 2026-08-16
expires_at:
linked_plan: docs/superpowers/plans/2026-08-16-p0-localidades-nacionais.md
critic_verdict: pending
critic_review:
---

# A transferência é um estado de primeira classe, e o pertencimento deixa de ser exclusivo

## Problem

O caso central do produto não é atendido, e ele é exatamente o caso da janela de dezembro.

O sargento serve no Rio de Janeiro e é transferido para Manaus. Nesse intervalo ele precisa das
**duas** cidades ao mesmo tempo, por motivos opostos: no Rio, vender o que não vai levar e passar
contatos; em Manaus, achar escola que aceite dependente no meio do ano, alugar casa, encontrar
despachante, comprar o que vai faltar.

O `BIVAQUE.md` §10 descreve essa bilateralidade como a razão de dezembro existir — *"chega gente
que precisa de moradia, escola e serviço, e sai gente que precisa vender móvel e passar
contato"* — e o schema torna isso impossível:

```sql
create table public.locality_memberships (
  user_id uuid primary key references auth.users (id) on delete cascade,
  locality_id uuid not null references public.localities (id) on delete restrict,
  joined_at timestamptz not null default now(),
  unique (user_id, locality_id)
);
```

`user_id` como chave primária concede **uma** localidade por pessoa. O
[`ADR-20260816-national-localities`](ADR-20260816-national-localities.md) registrou essa
propriedade e colocou multi-localidade simultânea explicitamente fora de escopo. Este ADR
reabre esse ponto, e só ele.

### O que a investigação do schema encontrou, e muda o custo da decisão

O modelo está muito mais perto de suportar isto do que o ADR anterior supôs:

- **A autorização já funciona com N localidades.** `private.is_locality_member(target_locality_id)`
  (`supabase/migrations/20260802000300_foundation_rls.sql:21-26`) é um teste de pertencimento a
  conjunto — `exists (... where user_id = auth.uid() and locality_id = target_locality_id)` —,
  não uma consulta de "qual é a minha cidade". Com duas linhas, ela devolve verdadeiro para as
  duas, sem alteração.
- **As leituras já assumem o par.** `public.feed_posts`
  (`20260805215020_community_feeds.sql`) junta `left join public.profiles pr on pr.user_id =
  p.user_id and pr.locality_id = p.locality_id` — por (usuário, localidade), não por usuário.
- **A porta foi deixada encostada.** O `unique (user_id, locality_id)` ao lado da chave primária
  **não faz nada** enquanto `user_id` for PK. É exatamente a chave que um modelo
  multi-membership usaria.

O que bloqueia são duas chaves primárias: `locality_memberships.user_id` e `profiles.user_id`.

## Decision

**A transferência é um estado declarado, com origem, destino e prazo. O pertencimento deixa de
ser exclusivo, mas não vira acúmulo livre.**

1. `locality_memberships` passa a aceitar mais de uma linha por usuário. A chave primária vira
   `(user_id, locality_id)` — a chave que o `unique` já antecipava.
2. **Uma pessoa tem uma localidade corrente e, no máximo, um vínculo de saída ativo.** Não é
   multi-membership livre: são dois papéis distintos, e o segundo tem prazo.
3. **Quem tem prazo é a origem, não o destino.** Ao declarar a transferência, a cidade de destino
   passa a ser a localidade corrente imediatamente — é justamente aí que a pessoa precisa entrar
   cedo — e a cidade de origem vira o vínculo que se encerra. Ela está saindo de lá, não chegando.
4. **O fim do vínculo de origem degrada, não quebra.** A pessoa declara quando sai; perto do
   prazo recebe lembrete pelo `outbox`; se não responder, a origem vira **somente-leitura** — ela
   continua vendo, para de publicar — e só sai de vez por ato dela. Transferência militar é
   cancelada e adiada com frequência, e o §11 do `BIVAQUE.md` lista irreversibilidade como risco
   aceito. Este é o mesmo princípio de "degradar em vez de quebrar" que o §7.8 já adota para o
   canal de WhatsApp.
5. **Um perfil por pessoa.** `profiles` deixa de carregar `locality_id`; a localidade vive apenas
   na membership. "Quem pode ver meu perfil" passa a ser "quem divide alguma localidade comigo",
   calculado pelas memberships.
6. **A vila continua sendo concedida pelo dono da comunidade, sem exceção.** A transferência
   concede acesso ao nível **municipal** do destino — guia de chegada, eventos da cidade,
   vitrine, e a possibilidade de perguntar no nível da cidade. Ela **não** concede vila nenhuma.
   A D14 e a §5.2 permanecem intactas nessa parte.
7. **A declaração de transferência não é verificável, e isso é coerente.** O Portal atesta que a
   pessoa é militar, não onde ela serve. A localidade **sempre** foi autodeclarada — a §4.1 diz
   que o Estado nunca vai saber que alguém é de Ajuricaba. Transferência declarada não é mais
   fraca que localidade declarada, e a aprovação do dono continua sendo a checagem que importa.

### O que este ADR não decide

- Acúmulo livre de localidades (três, cinco, dez cidades ativas). Foi considerado e recusado.
- Histórico de mudanças de localidade como superfície de produto.
- Multi-tenancy ou organizações — dimensão separada de geografia, como o ADR anterior já
  registrou.

### Sequenciamento

**A P0 leva a base; a transferência vira onda própria logo depois.** A P0 muda o que é
irreversível — as duas chaves primárias — e entrega uma cidade por pessoa. A onda de
transferência põe o prazo, o lembrete, a degradação e o seletor de localidade.

O motivo é o custo assimétrico: mudar chave primária depois de existir usuário real em produção,
num projeto sem staging (D42), é a migração que mais dói. O resto é aditivo.

## Alternatives considered

### A. Membership de transferência com origem, destino e prazo

**Escolhida.** Modela o comportamento real em vez de acumular cidades. Dá ao produto um sinal
que nenhum concorrente do §2 tem — quem está chegando onde e quando —, que alimenta a fila de
aprovação do dono da vila e a curadoria do guia (D49). Transforma a mecânica de dezembro em
recurso de primeira classe.

### B. Referência é nacional, conversa é local

Sem segunda membership: guia de chegada e vitrine de qualquer cidade passam a ser legíveis por
qualquer membro verificado, porque a D48 já afirma que o nível municipal é **referência, não
sala**. O sargento leria o guia e a vitrine de Manaus hoje, venderia no Rio, e pediria entrada na
vila ao saber o endereço.

Rejeitada por uma lacuna que é justamente o caso: **ele não conseguiria perguntar nada em
Manaus antes de chegar.** Era a alternativa de menor mudança — não toca chave primária alguma —
e continua sendo o caminho de recuo se a onda de transferência escorregar.

### C. Multi-membership plena, sem prazo

O usuário acumula N localidades, ponto. Conceitualmente mais simples e a mais rápida de
implementar. Rejeitada: some o incentivo a pertencer de verdade a um lugar, e o feed volta a ser
a sala indiferenciada da §1.1 — o defeito que o produto existe para corrigir. A §3.4 sustenta que
o valor vem da densidade local.

### D. Manter uma localidade e exigir que a pessoa "mude" de cidade

O comportamento de hoje, com uma tela de troca. Rejeitada: mudar significa perder o Rio no dia em
que ele mais precisa dele — vender é a razão de continuar lá.

## Market or reference baseline

Redes locais tratam localidade como atributo de escopo do usuário, e a maioria permite mais de
uma. O [Nextdoor](https://about.nextdoor.com/) organiza por endereço verificado e permite
acompanhar bairros vizinhos além do próprio.

Nenhum dos concorrentes militares do §2 do `BIVAQUE.md` — RallyPoint, The Military App, weServed,
Veteranos do Brasil, VetMil — é organizado por localidade: os cinco são nacionais e recortam por
afiliação. Não há baseline de mercado para "transferência entre localidades" porque o cruzamento
local + credencial é a lacuna que o §2 identifica como desocupada.

## Proposed divergence from baseline

**Divergência deliberada.** Onde o Nextdoor permite acompanhar bairros vizinhos de forma
permanente e por proximidade geográfica, este ADR concede a segunda localidade **por evento e com
prazo**. A diferença existe porque a circunstância que justifica as duas cidades — a
transferência — é temporária por natureza, e porque a densidade local é o ativo (§3.4).

## Evidence and sources

- Caso relatado pelo dono em 2026-08-16: o sargento servindo no Rio, transferido para Manaus,
  precisando vender na origem e resolver escola, casa e serviços no destino.
- `docs/BIVAQUE.md` §10 (a janela de dezembro é bilateral), §3.1 (pertencimento aditivo), §3.4
  (densidade), §4.1 (cada fato é atestado por quem consegue atestá-lo), §5.2 e D14 (a vila é
  concedida pelo dono), §6.2 e D48 (o nível municipal é referência), §7.8 (degradar em vez de
  quebrar), §11 (irreversibilidade como risco).
- `supabase/migrations/20260802000100_locality_profile_foundation.sql:21-41` — as duas chaves
  primárias e o `unique` redundante.
- `supabase/migrations/20260802000300_foundation_rls.sql:14-27` — `is_locality_member` como teste
  de conjunto.
- `supabase/migrations/20260805215020_community_feeds.sql` — a junção de `profiles` pelo par.
- [`ADR-20260816-national-localities`](ADR-20260816-national-localities.md) — este ADR reabre a
  linha "múltiplas localidades simultâneas para o mesmo usuário" que aquele colocou fora de
  escopo.

## Benefits

- Atende o caso que o próprio canon usa para justificar a janela de dezembro, e que hoje não é
  atendido.
- Converte a transferência — o evento mais previsível e mais doloroso da vida militar — em
  momento de uso, em vez de momento de abandono do produto.
- Produz o sinal de "quem está chegando onde e quando", que alimenta a aprovação da vila e a
  curadoria do guia.
- Faz o schema alcançar o que a autorização já suportava: `is_locality_member` não muda uma linha.
- Um perfil por pessoa resolve, na raiz, o problema das três representações do mesmo usuário que
  a onda E teria de corrigir de qualquer forma.

## Risks

- **Transferência declarada é autodeclarada.** Alguém pode declarar transferência para uma cidade
  onde não vai, e obter acesso municipal ali. Mitigação: um vínculo de saída ativo por vez,
  atribuível, com prazo; a vila continua exigindo aprovação do dono.
- **Diluição da densidade** se o vínculo de origem nunca terminar. Mitigação: prazo declarado,
  lembrete, degradação para somente-leitura.
- **A mudança em `profiles` mexe em superfície testada.** Caem a FK composta, o índice
  `profiles_locality_visibility_idx` e a junção do `feed_posts`; os seis asserts de
  `supabase/tests/locality-profile-access.sql` mudam junto. **Esses seis são os mesmos que o
  perfil fantasma "Visual Capture" quebra** (`AGENTS.md` §Known traps) — durante esta migração vai
  ser difícil distinguir regressão real de armadilha conhecida. Mitigação: `db:reset` limpo, sem
  dev server e sem captura, antes de qualquer atribuição de falha.
- **Sem staging** (D42): a mudança de chave primária chega direto à produção. Mitigação: fazê-la
  na P0, antes de existir usuário real.
- **Superfície nova de navegação:** com duas cidades aparece um seletor de localidade que não
  existia em plano nenhum. Mitigação: ele cai dentro dos containers do
  [`ADR-20260816-shells-e-navegacao`](ADR-20260816-shells-e-navegacao.md).
- **Suporte:** "por que eu não consigo mais publicar no Rio?" vira pergunta recorrente se a
  degradação não for comunicada antes de acontecer.

## Reversal cost

**Baixo antes de existir usuário real; alto depois.** Reverter para uma localidade por pessoa
exigiria escolher qual membership sobrevive para cada usuário com duas — decisão que o produto
não pode tomar sozinho — e comunicar perda de acesso. É por isso que a mudança de chave primária
entra na P0, e não depois: o custo de reversão cresce com o primeiro usuário real, não com o
tempo.

A alternativa B continua disponível como recuo se a onda de transferência escorregar: a base de
schema da P0 a suporta sem trabalho adicional.

## Success metric

A decisão é considerada implementada quando:

1. um membro declara transferência e passa a ler o guia, os eventos e a vitrine do destino, sem
   perder a publicação na origem;
2. ele consegue perguntar no nível municipal do destino antes de morar lá;
3. ele **não** obtém acesso a vila nenhuma do destino sem aprovação do dono — provado por teste
   negativo;
4. no fim do prazo, a origem degrada para somente-leitura e nenhum acesso é removido sem ato do
   titular;
5. o perfil dele é um só, com um nome e uma foto, nas duas cidades.

## Reopen condition

Reabrir se a transferência declarada for usada para obter acesso municipal sem transferência
real em volume mensurável, ou se a segunda localidade produzir diluição observável do feed da
primeira — o sinal seria queda de participação semanal na cidade de origem entre quem declarou
saída, comparada a quem não declarou.

## Approval

Aprovação humana explícita por Juan em **2026-08-16**, na sessão de decisões que originou este
ADR. O caso foi levantado por ele como *"um dos cores do Bivaque e não é atendido hoje"*, e as
quatro decisões subsequentes — modelo de transferência, perfil único, degradação para
somente-leitura, e sequenciamento com a base na P0 — foram escolhidas por ele entre alternativas
apresentadas.

Pela `RISK_MATRIX.md`, isto é **R3**: muda `locality_memberships` e `profiles`, altera o alcance
de RLS de perfil e envolve migração de chave primária. A implementação permanece bloqueada até
`critic_verdict: PASS`.
