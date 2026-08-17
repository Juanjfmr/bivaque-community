---
id: ADR-20260816-forma-da-admissao
status: accepted
risk: R3
owner: Juan
approved_at: 2026-08-16
expires_at:
linked_plan: docs/superpowers/plans/2026-08-16-p0-localidades-nacionais.md
critic_verdict: PASS
critic_review: Veredito registrado em 2026-08-16 por autorizacao explicita do dono (Juan) na sessao de execucao: aprovar e executar a P0. Aprovacao humana ja consta na secao Approval. A implementacao esta destravada conforme a RISK_MATRIX.md.
---

# A admissão tem duas fases: o Estado atesta, depois a pessoa declara

## Problem

O fluxo de entrada funde dois atos que a própria §4.1 do `BIVAQUE.md` separa, e é essa fusão que
produziu o hardcode de Manaus.

`apps/web/lib/onboarding/verifyAndProvision.ts` faz tudo numa chamada: consulta o Portal da
Transparência, decide elegibilidade **e** cria `locality_memberships` e `profiles` — tudo entre
as linhas 59 e 106. Como não existe momento em que a pessoa seja consultada, os dois dados que
só ela pode fornecer são inventados pelo código:

- a localidade vira a constante `PILOT_LOCALITY_ID` (`:86`, `:94`);
- o nome vira o literal `"Novo membro"` (`:95`), que a pessoa descobre depois, no perfil.

A §4.1 diz o contrário, e diz com clareza: **cada fato é atestado por quem consegue atestá-lo.**
O Estado atesta que a pessoa é militar, veterana ou pensionista. A pessoa declara onde mora. O
dono da comunidade atesta que ela é de Ajuricaba. São três atestadores em três momentos, e o
código fundia os dois primeiros.

Isso também cria um problema operacional que a D08 não consegue resolver como está: quando o
Portal oscila e alguém cai em `pending`, o job de reconciliação não tem de onde ler a localidade
que a pessoa escolheu, porque `private.verification_outcomes`
(`20260802000200_private_trust_family_foundation.sql:25-36`) guarda `status`,
`eligibility_class` e `checked_at` — e nada mais. O `profiles` só nasce quando a verificação
passa.

## Decision

**A admissão tem duas fases, e a fronteira entre elas é a elegibilidade.**

1. `verifyAndProvision` se parte em **`verify`** (elegibilidade) e **`provision`** (localidade,
   nome, perfil e membership). O `pending` passa a significar uma coisa só: *ainda não sabemos se
   esta pessoa é elegível*.
2. **O passo de onboarding acontece depois da elegibilidade**, com a pessoa presente, uma vez. É
   ali que ela informa a localidade — **campo obrigatório**, validado no servidor contra o
   catálogo canônico — e confirma o nome.
3. **A reconciliação de `pending` não provisiona.** O job responde "esta pessoa é elegível?" e
   para. Não há localidade a guardar num `pending`, porque a pergunta ainda não foi feita. Isso
   dissolve a necessidade de uma coluna de intenção em `verification_outcomes`.
4. **O nome: o Portal sugere, a pessoa confirma, e o que se persiste é o confirmado.** O nome
   civil devolvido pelo Portal preenche o campo; a pessoa aceita ou ajusta. **O que fica gravado
   é a declaração dela, não o extrato do registro federal** — então a D11 continua de pé: o
   payload não é persistido, a declaração é. É também onde a política de nomes da D23 se aplica.
5. **A waitlist geográfica sai do caminho.** A entrada "não sou de Manaus" e o link na tela de
   rejeição são removidos na P0. A tabela `public.waitlist` e a RPC `add_to_waitlist` **não são
   removidas na mesma mudança**: a remoção vem em migration própria, depois, para não pôr um
   `drop` dentro da reescrita do caminho de admissão num projeto sem staging (D42).
6. **O que este ADR não muda:** o classificador continua descartando tudo o que não é
   elegibilidade. `apps/web/lib/portal/classify.ts` lê `orgao`, `situacao` e `tipoServidor` e os
   joga fora; `VerificationResult` (`lib/portal/types.ts`) carrega `status` e `eligibilityClass`.
   **Organização militar, posto e situação permanecem proibidos de persistir**, conforme
   `AGENTS.md:205`, a D11 e o [`ADR-20260811-om-declarada`](ADR-20260811-om-declarada.md), que
   segue `proposed` com cinco pré-requisitos abertos.

### O que entra no passo pós-elegibilidade, e o que não

**Entra:** localidade (obrigatória) e confirmação do nome.

**Não entra:** assuntos de interesse com grupos sugeridos. A ideia é boa e encaixa no modelo — a
§3.2 diz que pertencimento por interesse é grupo —, mas fica para a **onda E**, por dois motivos.
Em cidade recém-aberta não existe grupo algum a sugerir, e o passo apareceria vazio exatamente
onde a solidão já é o risco principal do
[`ADR-20260816-national-localities`](ADR-20260816-national-localities.md). E coletar interesses
agora para usar depois quebraria a regra 3 da §12 — capability sem ciclo não é produto — além de
exigir finalidade declarada no momento da coleta, pela LGPD.

**Não entra:** pedido de entrada em vila. Misturaria dois atestadores diferentes — o que a pessoa
declara e o que o dono aprova — na mesma interação, e a §5.2 os separa de propósito.

## Alternatives considered

### A. Duas fases: elegibilidade, depois onboarding

**Escolhida.** Alinha o código à §4.1, elimina os dois dados inventados, e faz as quatro chamadas
a `PILOT_LOCALITY_ID` em `verifyAndProvision` desaparecerem **por construção** em vez de por
substituição. Também simplifica a reconciliação da D08.

### B. Fase única, com a localidade perguntada antes do CPF

Manteria uma chamada só, pedindo a cidade junto do CPF. Rejeitada: faz quem não é elegível
preencher um formulário maior para chegar à mesma resposta genérica que a §4.2 exige, e obriga a
guardar a intenção de localidade num `pending` — dado coletado que pode nunca ter uso, o que a
LGPD trata como finalidade sem propósito.

### C. Fase única, com a localidade derivada de algum sinal automático

CEP, DDD do telefone ou geolocalização. Rejeitada em todas as formas. A D11 proíbe persistir
endereço residencial, e o produto já avisa o membro quando ele digita um CEP num post
(`detectCep`); adotar consulta de CEP seria oferecer, na porta de entrada, o dado que o produto
pede para a pessoa não publicar. DDD é pior: militar transferido carrega o chip da cidade
anterior por anos, e a validação rejeitaria exatamente o público de dezembro.

### D. Manter como está, com a localidade escolhida depois, no perfil

Rejeitada: reproduz o defeito atual — o produto grava um valor por conta própria e a pessoa
descobre depois. É o que o `"Novo membro"` já faz com o nome.

## Market or reference baseline

Produtos com verificação de elegibilidade separam rotineiramente a **prova** do **cadastro**:
a prova é feita contra a fonte que consegue atestá-la, e os dados que só o usuário conhece são
coletados depois, quando ele já sabe que passou. O padrão evita atrito em quem não vai entrar e
evita coletar dado de quem será recusado.

O canon do produto-mãe já resolveu isto melhor e o `BIVAQUE.md` §1.5 registra a adoção:
verificação dual-path e versionamento de consentimento vieram de lá.

## Proposed divergence from baseline

Nenhuma divergência relevante. A decisão aproxima a implementação do padrão e do modelo que a
§4.1 já descrevia.

## Evidence and sources

- `apps/web/lib/onboarding/verifyAndProvision.ts:59-106` — verificação e provisionamento na mesma
  função; `:86`, `:94` (localidade constante) e `:95` (`"Novo membro"`).
- `apps/web/lib/portal/classify.ts` e `lib/portal/types.ts` — a fronteira da D11 implementada em
  código: o classificador descarta nome, posto e OM.
- `supabase/migrations/20260802000200_private_trust_family_foundation.sql:25-36` —
  `verification_outcomes` sem localidade.
- `apps/web/app/(preauth)/onboarding/page.tsx:431-474` e
  `apps/web/app/(preauth)/onboarding/status/page.tsx:127-132` — as duas entradas da waitlist
  geográfica.
- `docs/BIVAQUE.md` §4.1, §4.2, §4.3, §5.2, §12 regras 2 e 3; D08, D11, D12, D23.
- `docs/decisions/ADR-20260816-national-localities.md` — a decisão que torna a localidade uma
  pergunta real.
- Decisão do dono em 2026-08-16: *"isso deve ser objeto de um onboarding após a elegibilidade"*.

## Benefits

- O produto para de inventar dois dados sobre a pessoa.
- A reconciliação de `pending` fica com uma responsabilidade só, e a D08 fecha sem coluna nova.
- As quatro chamadas a `PILOT_LOCALITY_ID` em `verifyAndProvision` somem por construção.
- Quem não é elegível não preenche formulário maior para receber a mesma negativa genérica.
- A política de nomes da D23 ganha o único lugar do produto onde faz sentido aplicá-la.

## Risks

- **Um passo a mais entre a verificação e o feed.** Mitigação: dois campos, um deles já
  preenchido.
- **Abandono no passo novo.** Alguém verificado que não conclui fica em estado "elegível sem
  membership". Mitigação: esse estado já é previsto no gate; o que precisa mudar é
  `onboarding/status/page.tsx:58`, que hoje manda `verified` direto para `/community` e passará a
  mandar para o passo de localidade.
- **O nome vindo do Portal atravessa a fronteira do payload.** Mitigação e razão de a decisão ser
  "sugere e confirma": o que persiste é a declaração da pessoa. Se alguma implementação gravar o
  nome sem confirmação, ela viola a D11 e este ADR.
- **A waitlist fica como código morto** até a migration de remoção. Mitigação: prazo escrito e a
  linha correspondente no `PRODUCT_STATUS.md` marcada como obsoleta, não como entregue.

## Reversal cost

Baixo. Voltar à fase única exigiria reunir `verify` e `provision` e reintroduzir um default de
localidade — mecanicamente simples, mas conceitualmente é voltar ao bug. A remoção da waitlist,
por ser destrutiva, é a única parte com custo assimétrico, e por isso foi separada em migration
própria.

## Success metric

1. Nenhum `locality_memberships` ou `profiles` é criado sem que a pessoa tenha informado a
   localidade.
2. Nenhum perfil nasce com `display_name` inventado pelo código.
3. O job de reconciliação de `pending` não escreve membership nem profile — provado por teste.
4. Localidade submetida pelo cliente e ausente do catálogo é recusada no servidor — teste
   negativo.
5. `grep` no runtime não encontra a string `"Novo membro"`.

## Reopen condition

Reabrir se a taxa de abandono entre "elegível" e "membro provisionado" for materialmente maior
que a taxa de abandono anterior no formulário de CPF — sinal de que o passo extra custa mais do
que a correção conceitual vale.

## Approval

Aprovação humana explícita por Juan em **2026-08-16**, na sessão de decisões que originou este
ADR: *"isso deve ser objeto de um onboarding após a elegibilidade"*, e a escolha subsequente de
que o Portal sugere o nome, a pessoa confirma, e grava-se o confirmado.

Pela `RISK_MATRIX.md`, isto é **R3**: muda onboarding e verificação de identidade, e toca a
fronteira do payload do Portal. A implementação permanece bloqueada até `critic_verdict: PASS`.
