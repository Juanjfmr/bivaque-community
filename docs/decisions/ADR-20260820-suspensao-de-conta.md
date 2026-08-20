---
id: ADR-20260820-suspensao-de-conta
status: accepted
risk: R3
owner: Juan
approved_at: 2026-08-20
expires_at:
linked_plan: docs/superpowers/plans/2026-08-20-onda-h-operacao.md
critic_verdict: PASS
critic_review: Revisao adversarial executada em 2026-08-20 na mesma sessao que escreveu o ADR — o critico NAO foi independente, e isso fica registrado aqui em vez de ser omitido. A revisao achou e corrigiu seis defeitos de implementabilidade antes da aprovacao (helper inalcancavel por policy, leitura de display_name negada pela RLS, sync_paid_reach contradizendo a tolerancia de 7 dias, recurso sem tabela, revogacao de ficha sem task, e uma citacao de migration errada sobre exclusao de conta). Nenhum defeito atingiu as decisoes em si. Veredito PASS.
---

# Suspender uma pessoa: quem decide, por quanto tempo, o que ela ainda pode, e como recorre

## Problem

A D24 decidiu que o operador age sobre conteúdo **e** pessoa, *"porque ação sobre conteúdo não
resolve quando o problema é a pessoa"*. A D38 decidiu o mecanismo: flag em `profiles` mais
helper na RLS, entrando em toda policy de escrita na mesma migration.

Nenhuma das duas decidiu o **devido processo**, e sem ele a implementação decide sozinha o que
é, na prática, a punição mais severa que este produto pode aplicar a alguém — num público onde
a conta está atada a uma verificação de CPF contra o Estado e onde a comunidade é a vila real
em que a pessoa mora.

Hoje não existe nada: `grep -ri "suspend" supabase/ apps/web/` devolve apenas o `Suspense` do
React e a constante `PORTAL_SUSPENSION_MS`. O `BIVAQUE.md` §10.2 é explícito sobre o custo
disso — *"H incompleta significa abrir sem suspensão de conta"* —, e §11.7 repete que essa
decisão é do dono.

A `RISK_MATRIX.md` classifica isto como R3 por três motivos somados: mexe em RLS de escrita,
trata de exclusão de escopo, e é irreversível do ponto de vista de quem a sofre no momento em
que a sofre.

## Decision

**1. Quem suspende: o operador, e só ele.** O dono da comunidade **remove da vila** — poder que
ele já tem e que a D14 lhe dá, porque a vila é dele. Ele **não** suspende a conta, porque a
conta atravessa localidades: uma pessoa pode ser membro de Manaus, ter transferência declarada
para outra cidade (D51) e pertencer a duas vilas. Dar a um dono de vila o poder de silenciar
alguém nas outras é atravessar a fronteira que a D14 desenha.

**2. Prazos fechados: 7 dias, 30 dias, ou indeterminado.** O indeterminado é reservado às
condutas que o código de conduta nomear como graves — e só a elas. `suspended_until` nulo com
`suspended_at` preenchido é o estado "indeterminado", e ele exige que o motivo aponte para uma
dessas condutas nomeadas.

**3. O que a suspensão tira: escrita. O que ela não tira: leitura.** O suspenso continua vendo
a vila. O objetivo é interromper o dano, não exilar — e o exílio silencioso produz a pergunta
"o que aconteceu com fulano?" na vila inteira, que é pior para todos.

**4. Quatro escritas sobrevivem à suspensão, e são decisão, não esquecimento:**

   - **denunciar** (`reports`): quem foi suspenso também pode ser alvo de assédio, e tirar dele
     o canal de denúncia transforma suspensão em desproteção;
   - **bloquear** (`dm_blocks`): bloquear é autodefesa;
   - **recorrer** (`suspension_appeals`): é o único ato que a decisão 7 promete ao suspenso, e
     bloqueá-lo pelo guard tornaria o recurso decorativo;
   - **pedir a exclusão da própria conta**, quando esse caminho existir.

> **Sobre o quarto item, uma correção de fato.** Uma versão anterior deste ADR citava
> `20260819010000_self_delete_policies.sql` como se fosse o caminho de exclusão de conta. Não é:
> aquela migration adiciona a policy de `delete` de **`event_rsvps`**, para o cancelamento de
> presença da onda F. **Não existe caminho de exclusão de conta no produto hoje** —
> `grep -rni "delete_account\|account_deletion"` em `supabase/` e `apps/web/` volta vazio,
> enquanto `docs/legal/PRIVACIDADE.md:77` já promete apagar "em até **30 dias**" a quem pedir.
>
> Isso é uma lacuna do produto, **anterior a este ADR e independente dele**, e a suspensão não
> a cria nem a piora. O que este ADR decide é o de sempre: quando o caminho de exclusão nascer,
> ele nasce **fora** do guard de suspensão. Fechar a lacuna é trabalho próprio, e ela é
> pré-requisito de publicar a política de privacidade — não de suspender alguém.

**5. O conteúdo já publicado permanece.** Suspender pessoa e ocultar conteúdo são atos
distintos (D24), com registros distintos. Ocultar tudo o que alguém escreveu por causa de uma
mensagem é punição retroativa sobre terceiros — as respostas, as indicações e os RSVPs de quem
interagiu somem junto.

**6. O suspenso vê quatro coisas, e nenhuma delas é o texto do denunciante:** que está suspenso;
até quando; **qual regra** do código de conduta fundamenta, por categoria; e como recorrer. O
motivo em texto livre fica no registro de moderação e nunca é exibido — ele é escrito por um
terceiro sobre a pessoa e pode conter o que o produto se recusa a guardar (D11) e o que a Task
2 da onda H redige.

**7. Recurso: um por suspensão, resposta em 48 horas.** Mesmo prazo do
`SUPPORT_SLA_HOURS = 48` que o produto já usa na admissão
(`apps/web/lib/support.ts:12`) — um prazo só, para não prometer dois. Quem julga o recurso é o
operador; num piloto de fundador solo não existe segunda instância, e afirmar que existe seria
mentira. O recurso é o "acompanhamento" que a regra 3 da §12 exige para a linha fechar.

**8. Toda suspensão e todo levantamento viram linha em `moderation_actions`,** com autor,
sujeito, motivo, denúncia de origem quando houver, e data. Retenção de **2 anos**, o prazo que
o §4.4 já fixou para registro de moderação.

**9. Base contratual: o código de conduta assinado.** A D12 é explícita — consentimento e
código de conduta com aceite versionado são *"a base contratual da suspensão"*. Enquanto
`docs/legal/CODIGO_DE_CONDUTA.md` não tiver a assinatura do dono, **a suspensão não sobe**. Não
é formalidade: suspender sem regra escrita é exatamente o erro do Nextdoor que o §2 manda não
copiar.

**O que não muda:** a D25 continua valendo — moderação em três camadas com prazo público. Este
ADR define a camada que age sobre pessoa; as outras duas (ocultar conteúdo, remover da vila)
seguem como estão.

## Alternatives considered

**A. Banimento em vez de suspensão** — apagar ou desativar a conta em definitivo. Rejeitada
pela D38, que escolheu a flag justamente por ser **reversível e auditável**, e porque numa rede
onde a conta é atada a uma verificação de CPF um banimento errado é definitivo de verdade: a
pessoa não consegue voltar nem criando outra conta.

**B. Suspensão delegada ao dono da comunidade.** Rejeitada pela decisão 1 — a conta atravessa
localidades e o poder do dono para na vila dele. Fica registrada como a primeira extensão a
considerar quando houver mais de uma vila e o operador virar gargalo, na forma restrita
"suspender **dentro** daquela comunidade".

**C. Silenciar em vez de suspender** — a pessoa escreve e ninguém vê (*shadowban*). Rejeitada
por princípio: é o produto mentindo para o usuário, e numa comunidade onde todos se conhecem
fisicamente a descoberta é questão de dias. O §7.4 filtro 2 já estabelece o padrão de honestidade
— o que é, é declarado.

**D. Suspensão automática por volume de denúncias.** Rejeitada: transforma denúncia em arma. Um
grupo coordenado suspende quem quiser. O contador de denúncias no mesmo alvo, que a Task 4 da
onda H entrega, é **sinal para o operador**, nunca gatilho.

**E. Sem suspensão no piloto**, apenas ocultação de conteúdo. É o estado atual, e é a
alternativa que o §10.2 avalia explicitamente ao dizer que **H é a que não deveria escorregar**.
Rejeitada porque o custo não é feature, é o primeiro incidente — e o §5.1 diz o que um incidente
custa: não um usuário, uma vila.

## Market or reference baseline

- **Nextdoor**: moderação em camadas com prazo público de resposta a denúncia — o §2 manda
  copiar isso, e manda **não** copiar a moderação por voluntário sem regra escrita.
- **Prática corrente de plataformas comunitárias**: suspensão temporária escalonada, com aviso
  do motivo por categoria e canal de recurso — o padrão que o DSA europeu tornou obrigatório
  para plataformas grandes e que virou expectativa geral de usuário.
- **ANPD**: [guia de segurança para agentes de pequeno porte](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-sobre-seguranca-da-informacao-para-agentes-de-tratamento-de-pequeno-porte)
  e os [direitos dos titulares](https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados-1/direito-dos-titulares)
  — que sustentam a decisão 4, terceiro item.

## Proposed divergence from baseline

**Uma, e é honestidade sobre o tamanho do produto:** não há segunda instância de recurso. O
padrão de mercado é escalonar para um time; aqui existe um operador. O recurso é real — muda o
desfecho, tem prazo, e é julgado por uma pessoa — mas quem o julga é quem decidiu. Isso está
declarado ao suspenso na própria tela, em vez de descrito como um processo que não existe.

## Evidence and sources

- `docs/BIVAQUE.md` §2 (o que copiar e o que não copiar do Nextdoor), §4.4 (os três prazos e a
  governança), §5.1, §10.2, §11.7, §11.11, §12 regras 3, 6 e 7.
- Decisões D12, D14, D24, D25, D38, D51 na tabela do §9.
- `docs/PRODUCT_STATUS.md` §9 — as oito linhas de moderação, com "Ação sobre pessoa: não
  existe".
- `docs/red-team/lote-2-moderacao.md`, achados F160 a F165.
- `docs/PILOT_RUNBOOK.md` §6 (resolução de denúncia, "sem revelar a ação tomada") e §10.
- `supabase/migrations/20260820045749_locality_switcher_write_guard.sql:1-7` — o precedente que
  prova o risco de execução: a onda T injetou um guard em três tabelas de escrita e **esqueceu
  `events`**, e a correção veio dias depois.
- `supabase/migrations/20260819010000_self_delete_policies.sql` — as policies que a decisão 4
  preserva.
- `apps/web/lib/support.ts:12` — `SUPPORT_SLA_HOURS = 48`, o prazo que a decisão 7 reutiliza.

## Benefits

- **O operador consegue agir sobre a causa.** Ocultar dez mensagens não resolve uma pessoa.
- **O ato tem dono e motivo**, e isso é o que separa moderação de arbítrio (D24).
- **É reversível.** Suspensão errada se levanta com uma linha; banimento não.
- **O suspenso sabe o que aconteceu e tem o que fazer.** Sem isso, a linha do
  `PRODUCT_STATUS.md` não fecha — capacidade no banco não fecha linha (§12 regra 3).
- **O lançamento deixa de depender de sorte.** O §5.1 avisa: um tiro por vila.

## Risks

- **Policy esquecida = suspensão que não suspende.** É o risco central, com precedente exato
  neste repositório (a onda T e a tabela `events`). Mitigação obrigatória: enumerar as policies
  a partir do `pg_policies` do banco, nunca do diff, e teste positivo **e** negativo por tabela.
- **Suspensão errada sobre pessoa certa.** Mitigação: prazo curto por padrão, recurso em 48h,
  registro auditável.
- **Uso da suspensão para silenciar desavença.** Mitigação: motivo obrigatório amarrado a uma
  regra nomeada do código de conduta, e registro que o dono consegue auditar.
- **A tela do suspenso vaza o que o denunciante escreveu.** Mitigação: decisão 6 — categoria,
  nunca texto livre.
- **Denúncia como arma.** Mitigação: decisão D — nenhum automatismo.
- **O suspenso exclui a conta e some com a evidência.** Aceito: o `moderation_actions` guarda o
  ato por 2 anos e `subject_user_id` vira nulo por cascade; o direito de eliminação prevalece.
- **Suporte.** Suspensão gera contato humano, sempre, e sempre com quem está bravo.

## Reversal cost

**Baixo tecnicamente, alto socialmente.** Tecnicamente: a flag é nula por padrão, o helper sai
das policies numa migration reversa, e nada de conteúdo se perde. Socialmente: a primeira
suspensão numa vila de 600 pessoas que se conhecem é um evento social, não uma linha de log —
e se ela for mal aplicada ou mal explicada, o custo cai sobre a confiança que é o único ativo
do produto (§7.4 filtro 3).

Por isso a ordem importa: código de conduta assinado **antes** da primeira suspensão, e não
depois.

## Success metric

Noventa dias após a onda H fechar:

- **100% das suspensões** com motivo registrado, regra nomeada e prazo definido — auditável em
  `moderation_actions` sem exceção;
- **100% dos recursos** respondidos dentro de 48h;
- **zero** caso em que um suspenso conseguiu escrever em qualquer superfície (verificável pela
  suíte de negação, não por observação);
- **zero** caso em que um suspenso ficou impedido de denunciar, bloquear ou recorrer.

## Reopen condition

- Se o operador virar gargalo com mais de uma vila aberta, reabrir a alternativa B (delegação
  restrita ao dono, dentro da própria comunidade).
- Se aparecer padrão de denúncia coordenada, reabrir a decisão D para desenhar contenção — que
  continua não podendo ser automatismo de suspensão.
- Se a taxa de recurso deferido passar de 30%, o problema é o critério de suspensão, não o
  recurso: reabrir a decisão 2 e o código de conduta junto.
- Se o produto ganhar uma segunda pessoa na operação, reabrir a divergência da segunda
  instância.

## Approval

**Aprovado.** Autorizacao explicita do dono (Juan) em 2026-08-20, na sessao de planejamento das ondas G e H: *"Revise as adr, se não tiver nada que impeça o desenvolvimento, pode autorizar"*. A revisao esta registrada em `critic_review` — inclusive a ressalva de que o critico foi o proprio autor do ADR.

Mesmo formato do `ADR-20260816-shells-e-navegacao`, que registra veredito por autorizacao explicita do dono em sessao.

**A aprovacao nao destrava a Task 5 sozinha.** A decisao 9 exige a **assinatura do [codigo de conduta](../legal/CODIGO_DE_CONDUTA.md)**, que continua pendente do dono: sem o texto assinado, suspender e suspender sem regra escrita. As Tasks 1 a 4 e 6 da onda H correm sem isto.

Aprovados junto: os **prazos** da decisao 2 e as **quatro escritas que sobrevivem** da decisao 4 — cada uma e uma assercao positiva na suite de testes da Task 5.
