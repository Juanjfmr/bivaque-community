# Lote 2 — Entrada e onboarding

Auditoria de produto dos cenários RT-02, RT-04 (exceto o armazenamento de CPF já coberto por
F5), RT-05, RT-06, RT-07, RT-08 e RT-09. A leitura aplicou as dez dimensões da régua
(necessidade, modelo mental, coerência, happy path, sad paths, permissões, privacidade, abuso,
operação e valor), mas registra abaixo somente as dimensões que falharam.

## RT-02 — Máquina de estados observada

Não existe uma única máquina de admissão. O middleware decide acesso ao shell usando somente
sessão + cookie de consentimento, enquanto `/onboarding` consulta o resultado de verificação.
Além disso, todo caminho iniciado por `/onboarding` é público por prefixo
(`apps/web/middleware.ts:5-14,34-37`). O resultado é:

| Estado observado | `/` | `/onboarding` | `/community` direto | `/login` | Refresh |
|---|---|---|---|---|---|
| Não autenticado, sem cookie | `/login` | formulário de CPF; submit volta ao login | `/consent` antes de checar sessão | continua no login | repete o destino da rota |
| Não autenticado, com cookie residual | `/login` | formulário de CPF; submit volta ao login | `/login?redirect=/community` | continua no login | repete o destino da rota |
| Autenticado, sem consentimento | `/consent` | consulta status apesar de faltar consentimento | `/consent?redirect=/community` | continua no login | repete o destino da rota |
| Consentido, sem resultado | `/community` | formulário de CPF | `/community` | continua no login | permanece na rota escolhida |
| `pending` | `/community` | `/onboarding/status?state=pending` | `/community` | continua no login | status continua `pending`, mesmo se o backend mudar |
| `verified` | `/community` | `/community` | `/community` | continua no login | permanece na rota escolhida |
| `rejected` | `/community` | `/onboarding/status?state=rejected` | `/community` | continua no login | status continua `rejected` |
| `temporary_error` | `/community` | formulário de CPF | `/community` | continua no login | permanece na rota escolhida |

Evidência da tabela: `apps/web/middleware.ts:79-103`;
`apps/web/app/(preauth)/onboarding/page.tsx:98-140`; a tela do shell é montada sem gate adicional
em `apps/web/app/(shell)/layout.tsx:9-14` e chega a renderizar cabeçalho, compositor e CTA de
publicação em `apps/web/app/(shell)/community/page.tsx:217-240`, embora as operações de dados
continuem protegidas por RLS. Portanto, não há exatamente um destino correto por estado.

### F15 · Callback aceita destino externo após autenticação

- **Promessa:** o callback conclui o login e devolve a pessoa a um destino seguro dentro do
  Bivaque.
- **Comportamento:** `next` vem diretamente da query string e é passado a `new URL` sem
  allowlist de origem ou exigência de caminho relativo. Um `next` absoluto pode enviar a sessão
  recém-autenticada para outro domínio **[inferência baseada na semântica de `URL`]**.
- **Evidência:** `apps/web/app/auth/callback/route.ts:14-16,51-53`.
- **Severidade:** P0 — cria uma saída pós-autenticação aproveitável para phishing.
- **Veredicto:** MODIFY — aceitar somente destinos internos conhecidos ou um caminho relativo
  validado.
- **Balde:** A — correção inequívoca de fronteira de confiança.

### F16 · Sessão + consentimento furam o gate observável de verificação

- **Promessa:** após autenticar, a sequência é consentimento → onboarding → verificação; somente
  quem se torna membro entra na comunidade.
- **Comportamento:** o middleware não consulta verificação ou membership. Qualquer conta com o
  cookie de consentimento chega ao shell por `/`, `/community` e demais rotas protegidas, inclusive
  nos estados sem resultado, `pending`, `rejected` e `temporary_error`. A RLS preserva os dados,
  mas a UI exibe Manaus, compositor e “Publicar” antes da admissão, convertendo o gate em erros ou
  vazios tardios.
- **Evidência:** `apps/web/middleware.ts:79-103`;
  `apps/web/app/(shell)/layout.tsx:9-14`;
  `apps/web/app/(shell)/community/page.tsx:217-240,265-287`.
- **Severidade:** P1 — expõe incompletude e ações indisponíveis na primeira sessão.
- **Veredicto:** MODIFY — consolidar o destino de cada estado antes de montar o shell.
- **Balde:** A — C1/C2 já definem que membership só existe após `verified`.

### F17 · O destino protegido que iniciou o login é descartado

- **Promessa:** o parâmetro de retorno preserva a intenção de quem foi interrompido pelo gate.
- **Comportamento:** o middleware cria `?redirect=<pathname>`, mas o login não lê `redirect` nem
  `return`; magic link e Google fixam `next=/consent`. O consentimento também ignora seu próprio
  `?redirect` e sempre envia para `/onboarding`.
- **Evidência:** `apps/web/middleware.ts:91-100`;
  `apps/web/app/(preauth)/login/components/bivaque-sign-in.tsx:178-204`;
  `apps/web/app/(preauth)/consent/page.tsx:16-23`.
- **Severidade:** P1 — quebra continuidade em qualquer deep link protegido.
- **Veredicto:** MODIFY — definir um único parâmetro interno de retorno e carregá-lo por todo o
  fluxo, sujeito à validação de F15.
- **Balde:** A — há intenção explícita no middleware, hoje sem consumidor.

### F18 · Falha no callback termina em JSON técnico sem recuperação

- **Promessa:** clicar no magic link ou voltar do Google leva a uma entrada compreensível, inclusive
  quando o código está ausente, expirado ou inválido.
- **Comportamento:** código ausente retorna JSON 400; falha de troca retorna JSON 401 com a mensagem
  do provedor. Não há tela humana, reenvio de link ou retorno ao login.
- **Evidência:** `apps/web/app/auth/callback/route.ts:18-26,45-49`.
- **Severidade:** P1 — o sad path principal de autenticação abandona a pessoa fora do produto.
- **Veredicto:** MODIFY — terminar em uma superfície de recuperação, sem ecoar erro técnico bruto.
- **Balde:** A — o destino seguro e a ação de recomeçar já existem.

## RT-04 — CPF e recomeço

### F19 · CPF não é mascarado nem validado e entrada inválida vira inelegibilidade

- **Promessa:** o campo apresenta a máscara `000.000.000-00` e verifica um CPF; erro de entrada não
  equivale a falha de elegibilidade.
- **Comportamento:** o input apenas limita 14 caracteres, sem aplicar máscara, exigir 11 dígitos ou
  validar dígitos verificadores. A API aceita qualquer string não vazia; o Portal recebe só os
  caracteres numéricos e resposta vazia é classificada como `rejected`. Assim, texto, CPF curto ou
  CPF inválido pode produzir a mesma resposta de “não elegível”.
- **Evidência:** `docs/agents/VISUAL_GUIDE.md:146-150`;
  `apps/web/app/(preauth)/onboarding/page.tsx:348-365`;
  `apps/web/app/api/onboarding/route.ts:57-64`;
  `apps/web/lib/portal/client.ts:82-95`;
  `apps/web/lib/portal/classify.ts:115-121`.
- **Severidade:** P1 — uma correção de digitação pode se transformar em rejeição persistida.
- **Veredicto:** MODIFY — validar formato e dígitos antes de consultar o Portal, com erro distinto.
- **Balde:** A — validação de identificador não é decisão de elegibilidade.

## RT-06 — Rejeição e recurso

### F20 · `rejected` mistura causa, geografia e saída em um estado sem recuperação

- **Promessa:** a rejeição explica o bastante para a pessoa entender se digitou algo errado, se não
  é elegível ou se está fora de Manaus, e oferece o próximo passo adequado.
- **Comportamento:** o classificador não consulta localidade, mas a copy diz “critérios de Manaus” e
  sugere outras localidades; mudar de cidade não corrige inelegibilidade. Após refresh,
  `/onboarding` redireciona todo `rejected` para uma página sem retry, recurso, suporte ou CTA real
  para a waitlist. Portanto, nem um CPF corrigido pode ser reenviado pela UI.
- **Evidência:** `apps/web/lib/portal/classify.ts:115-146`;
  `apps/web/app/(preauth)/onboarding/page.tsx:128-138,188-193`;
  `apps/web/app/(preauth)/onboarding/status/page.tsx:86-97`.
- **Severidade:** P1 — rejeição incorreta ou contestável vira beco sem saída na primeira sessão.
- **Veredicto:** SPLIT — separar erro de CPF, inelegibilidade e decisão de localidade; o dono deve
  definir recurso/reconsideração e quando uma nova tentativa é legítima.
- **Balde:** B — a correção factual é clara, mas política de recurso e rechecagem é decisão de
  produto/operação.

## RT-05 — Pending e demora do Portal

### F21 · Tela de status confia na query string, não no status real

- **Promessa:** “Sua verificação está em andamento”, “rejeitada” ou “instável” representa o estado
  atual da verificação.
- **Comportamento:** a página valida somente `?state=` e autenticação; não chama o endpoint de status.
  Qualquer conta autenticada pode trocar a mensagem na URL. Se um `pending` for resolvido no backend,
  refresh continua exibindo `pending`, sem polling, botão de atualizar ou redirecionamento.
- **Evidência:** `apps/web/app/(preauth)/onboarding/status/page.tsx:11-44,46-97`;
  o endpoint que contém o estado real existe em
  `apps/web/app/api/onboarding/status/route.ts:34-92`, mas não é usado por essa página.
- **Severidade:** P1 — o acompanhamento pode permanecer falso depois da resolução.
- **Veredicto:** MODIFY — derivar a tela do estado server-side real e reconciliar mudanças.
- **Balde:** A — status observável não pode ser decidido por parâmetro editável.

### F22 · `pending` existe no contrato, mas o fluxo síncrono não o produz

- **Promessa:** quando a consulta demora, a pessoa entra em análise e recebe resposta em até 48
  horas úteis.
- **Comportamento:** a chamada ao Portal aborta em 10 segundos; timeout vira `temporary_error`. O
  classificador atual só retorna `verified` ou `rejected`; não há produtor de `pending` nesse
  caminho. Se uma linha `pending` existir por operação externa, F21 mostra que a UI também não a
  reconcilia. Portal que leve dois minutos ou nunca responda resulta em erro temporário após dez
  segundos, não em acompanhamento assíncrono.
- **Evidência:** `apps/web/lib/portal/client.ts:34-40,61-64,82-109`;
  `apps/web/lib/portal/classify.ts:115-146`;
  `apps/web/lib/onboarding/verifyAndProvision.ts:38-49`;
  `apps/web/app/(preauth)/onboarding/status/page.tsx:57-65`.
- **Severidade:** P1 — o produto comunica uma operação assíncrona que não está fechada ponta a
  ponta.
- **Veredicto:** UNPROVEN — o dono deve escolher entre verificação síncrona com retry ou fila
  assíncrona real com produtor, reconciliador e SLA.
- **Balde:** B — manter ou remover `pending` muda o modelo operacional de admissão.

## RT-07 — Waitlist

### F23 · Conta autenticada redigita e pode substituir o próprio e-mail

- **Promessa:** a candidatura associa um canal confiável à pessoa que acabou de autenticar.
- **Comportamento:** `email` inicia vazio e nunca é preenchido com `session.user.email`; o handler
  aceita qualquer e-mail informado e não o compara à identidade autenticada. Isso adiciona atrito e
  permite cadastrar endereço de terceiro.
- **Evidência:** `apps/web/app/(preauth)/onboarding/page.tsx:81-86,257-287,414-421`;
  `apps/web/app/api/onboarding/route.ts:82-95`.
- **Severidade:** P2 — atrito e qualidade de dado aparecem na entrada secundária.
- **Veredicto:** MODIFY — o dono deve decidir entre e-mail da conta bloqueado ou contato alternativo
  explicitamente rotulado e confirmado.
- **Balde:** B — identidade de login e canal de contato podem ter semânticas diferentes.

### F24 · Waitlist de “outras localidades” grava Manaus e não coleta a localidade

- **Promessa:** quem não é de Manaus se candidata à expansão para “sua localidade”.
- **Comportamento:** não existe campo de cidade/localidade; toda submissão envia
  `PILOT_LOCALITY_ID`, que é o ID do piloto de Manaus. A tabela só possui `email` e `locality_id`.
  Logo, o registro não diz para qual outra localidade a pessoa espera **[inferência: impossível
  segmentar expansão por cidade com os dados persistidos]**.
- **Evidência:** `apps/web/app/(preauth)/onboarding/page.tsx:283-287,377,414-432`;
  `apps/web/lib/locality.ts:1-14`;
  `supabase/migrations/20260802000600_onboarding_consent_waitlist.sql:9-18`.
- **Severidade:** P1 — a operação recebe candidatos, mas não o dado necessário para entregar o valor
  prometido.
- **Veredicto:** MODIFY — decidir se a lista é interesse genérico ou demanda por localidade; copy,
  formulário e modelo devem dizer a mesma coisa.
- **Balde:** B — coletar localidade e seu nível de precisão é decisão de produto e privacidade.

### F25 · “Entraremos em contato” não tem estado nem consumidor comprovado

- **Promessa:** após cadastrar, o Bivaque avisará quando houver expansão/vagas na localidade.
- **Comportamento:** o sucesso observável é apenas uma linha `email + locality_id + created_at`; não
  há status, posição, marca de contato ou leitura da waitlist na aplicação. A RPC ignora duplicata e
  a UI sempre responde como novo sucesso. Um contato manual externo é possível, mas não está
  especificado nem comprovado neste recorte **[inferência]**.
- **Evidência:** `apps/web/app/(preauth)/onboarding/page.tsx:290-300,335-339,426-433`;
  `supabase/migrations/20260802000600_onboarding_consent_waitlist.sql:10-18,40-58`.
- **Severidade:** P1 — o ciclo termina em promessa operacional sem acompanhamento demonstrável.
- **Veredicto:** UNPROVEN — documentar o processo manual e seu dono/SLA ou implementar o mínimo
  estado de follow-up; não inventar posição, conforme C11.
- **Balde:** B — canal, SLA e automação de expansão pertencem ao dono/operação.

## RT-08 — Convite familiar, lado convidado

### F26 · “Enviar” cria um token e o descarta sem entregar convite

- **Promessa:** ao informar o e-mail e clicar “Enviar”, o familiar recebe um convite utilizável.
- **Comportamento:** a action gera token e digest, grava o digest e termina com `revalidatePath`; não
  envia e-mail, não retorna link e não persiste o token bruto. O componente também não mostra link
  copiável. Não foi encontrado outro consumidor do token em `apps/web` **[inferência confirmada por
  busca de referências]**.
- **Evidência:** `apps/web/app/(shell)/profile/family-invite-section.tsx:59-78`;
  `apps/web/app/(shell)/profile/family-invite-section-actions.ts:74-92`;
  `supabase/migrations/20260802000400_trust_invitation_helpers.sql:22-73`.
- **Severidade:** P1 — o caminho convidado não pode começar por meios normais.
- **Veredicto:** MODIFY — escolher entrega por e-mail ou link copiável e fechar o ciclo de
  distribuição/feedback.
- **Balde:** B — o mecanismo de entrega e suas implicações de abuso/custo são decisão do dono.

### F27 · Aceite ignora o e-mail-alvo e transforma o link em passe transferível

- **Promessa:** o convite é dirigido ao familiar cujo e-mail foi informado.
- **Comportamento:** o banco armazena `invitee_email_digest`, mas o aceite seleciona somente por
  token, status e expiração. Em seguida vincula o convite ao `userId` autenticado sem comparar a
  identidade/e-mail. Um link encaminhado pode provisionar membership para outra conta
  **[inferência direta das condições do aceite]**.
- **Evidência:** `supabase/migrations/20260802000200_private_trust_family_foundation.sql:38-45`;
  `supabase/migrations/20260802000400_trust_invitation_helpers.sql:104-145`;
  `apps/web/lib/onboarding/verifyAndProvision.ts:102-140`.
- **Severidade:** P0 — convite familiar é uma via alternativa que concede membership sem
  verificação de CPF; transferibilidade quebra a fronteira de admissão.
- **Veredicto:** MODIFY — vincular o aceite à identidade pretendida ou declarar e proteger
  explicitamente um convite bearer de alto risco.
- **Balde:** A — o digest de e-mail já expressa a intenção de vinculação e hoje não participa da
  autorização.

### F28 · Expirado, usado, sessão perdida e conta existente não têm tratamentos próprios

- **Promessa:** cada sad path do convite explica o que ocorreu e oferece saída segura.
- **Comportamento:** expirado, já aceito, revogado e inexistente viram a mesma exceção; a API a
  devolve como erro 500 e a UI apenas exibe texto técnico. Se a sessão expira, o token é salvo em
  `sessionStorage`, mas o boot só restaura CPF e não restaura `familyToken`; login e consentimento
  também não carregam o `return`, então o convite se perde. Conta já cadastrada não tem branch:
  pode ser aceita normalmente se ainda não tiver vínculo, enquanto uma conta que já é familiar
  colide com `family_user_id unique` **[inferência]**.
- **Evidência:** `supabase/migrations/20260802000400_trust_invitation_helpers.sql:117-145`;
  `supabase/migrations/20260802000200_private_trust_family_foundation.sql:67-80`;
  `apps/web/app/api/onboarding/route.ts:67-79,99-103`;
  `apps/web/app/(preauth)/onboarding/page.tsx:90-107,209-253`.
- **Severidade:** P1 — qualquer interrupção comum transforma o convite em beco sem saída.
- **Veredicto:** SPLIT — definir respostas separadas para expirado, usado/revogado, conta já
  vinculada e conta existente ainda elegível; preservar o token somente pelo retorno autenticado
  validado.
- **Balde:** B — mensagens de recuperação são inequívocas, mas a semântica de conta existente e
  reemissão exige decisão do dono.

## RT-09 — Welcome e time to first value

A página passa no teste principal de compreensão: em poucos segundos apresenta três primeiras
ações com explicação (grupo público, recomendações e perfil) e uma saída direta para a comunidade
(`apps/web/app/(preauth)/onboarding/welcome/page.tsx:5-46`). Não há finding por falta de orientação.
O problema está em acoplar essa boa orientação ao estado real:

### F29 · Welcome afirma verificação sem gate e não atende o caminho familiar

- **Promessa:** “Você foi verificado” é a confirmação final comum da admissão e leva toda pessoa
  aprovada à primeira ação.
- **Comportamento:** `/onboarding/welcome` é público pelo prefixo do middleware e a página não
  autentica nem consulta membership; qualquer visitante pode abrir a afirmação “Você foi
  verificado”. No sentido oposto, aceite familiar bem-sucedido vai direto a `/community`, pulando
  as três ações de ativação.
- **Evidência:** `apps/web/middleware.ts:5-14,34-37`;
  `apps/web/app/(preauth)/onboarding/welcome/page.tsx:1-46`;
  `apps/web/app/(preauth)/onboarding/page.tsx:245-249`.
- **Severidade:** P1 — a confirmação não prova o estado e a via familiar perde time to first value.
- **Veredicto:** MODIFY — gatear welcome por membership real e torná-la o destino comum de toda
  admissão concluída.
- **Balde:** A — a própria página já define a experiência final desejada; falta ligá-la ao
  invariante correto.

## Placar do lote

| Balde | Findings | Ação |
|---|---|---|
| A — correção inequívoca | F15, F16, F17, F18, F19, F21, F27, F29 | Corrigir fronteiras, estado e feedback sem redefinir produto |
| B — decisão do dono | F20, F22, F23, F24, F25, F26, F28 | Decidir política de recurso, operação assíncrona, waitlist e convites |

**Prioridade:** F15 e F27 são P0. Os demais P1 devem ser resolvidos antes de chamar admissão de
“Corrigida” no MAP, exceto F23 (P2). F5 não foi revalidado nem duplicado.
