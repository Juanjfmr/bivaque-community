---
id: ADR-20261101-entrada-unica-por-codigo
status: Aceito por delegação — aguarda ratificação
risk: R3
owner: Juan
approved_at: 2026-11-02 (por delegação do dono em 02/11; aceite no lote do F01, aguarda ratificação)
expires_at:
linked_plan: docs/agents/regua-nextdoor/HANDOFF.md (seções 6.5 e 7)
critic_verdict: pendente — revisão independente e security-auditor não disponíveis neste executor; listado em RATIFICACAO.md
critic_review:
---

# Entrada única: Google, Apple ou código no e-mail, sem senha

## Problem

A régua Nextdoor (handoff de 01/11/2026, §7.2) pôs a entrada do F01 abaixo da régua em quatro pontos que são de
autenticação, não de tela:

1. **Entrar e criar conta são caminhos separados.** A pessoa precisa saber se já tem conta antes de começar. O
   cadastro pede nome, e-mail, senha e aceite de uma vez, com o botão desabilitado até o aceite.
2. **Senha.** Ela é mais um campo no cadastro, mais uma tela de recuperação e mais uma troca de senha a construir
   (item "Changing password" da régua). E vaza em reuso entre serviços.
3. **Sem Apple.** A App Store exige uma opção equivalente quando o app oferece login com Google (diretriz 4.8).
4. **O aceite é uma caixa de seleção no cadastro** (ADR-20260907-consentimento-no-cadastro). Quem entra pelo Google
   pula o cadastro e precisa da rota `/consent` (PR #104). São dois caminhos para registrar a mesma coisa.

O app de loja (Capacitor, ADR-20261024-front-react-spa §6) acrescenta dois requisitos:
- o login nativo, sem sair do app quando possível;
- links que voltem ao app (convite, retorno do login), inclusive abertos em outro aparelho ou navegador.

## Decision

Decisões do dono em 01/11/2026, nesta sessão: Negócio fora do onboarding; código sem senha; Apple na prévia e no ADR
agora, ligado antes da loja; aceite antes do CPF e "o combinado" depois; CPF antes do nome.

### 1. Uma porta só

A primeira tela tem, nesta ordem:
- Continuar com Apple;
- Continuar com Google;
- Continuar com e-mail;
- "Tem um código de convite?".

Não há "Entrar" e "Criar conta" separados. O sistema reconhece a conta pelo e-mail:

- **E-mail.** A pessoa digita o e-mail e recebe um código de 6 dígitos (OTP do Supabase, `signInWithOtp` com criação
  de conta permitida; `otp_length = 6` já está em `supabase/config.toml`). Ela digita o código (`verifyOtp`, tipo
  `email`) e está dentro. Conta nova ou antiga, a tela e a mensagem são as mesmas: "Enviamos um código para
  …". A tela nunca diz se o e-mail já tem conta. É a mesma regra anti-enumeração do ADR-20260907-login-com-senha,
  porque a lista de membros expõe vínculo com a instituição.
- **Google e Apple.** O provedor devolve a identidade, e o Supabase liga contas com o mesmo e-mail verificado (padrão
  do GoTrue; `enable_manual_linking` continua `false`).
- **Depois de entrar**, o servidor decide o destino pelo progresso salvo: onboarding na etapa onde parou ou Início.
  Quem tem conta não vê o cadastro, e quem não tem não vê erro.

### 2. Sem senha

- O e-mail e a senha saem da tela, junto com "Esqueci minha senha" e a troca de senha. A troca de senha sai da lista
  de propostas da régua.
- Contas antigas com senha entram pelo código do mesmo e-mail. O hash antigo fica sem uso e é apagado numa migration
  posterior, depois de um ciclo sem login por senha.
- O código vale 10 minutos (`otp_expiry` passa de 3600 para 600) e é de uso único. O reenvio fica liberado depois de 60
  segundos, com contagem visível. Seis tentativas erradas invalidam o código. Valem os limites do GoTrue por IP
  (`[auth.rate_limit]`: envio e verificação de token) e um limite próprio por e-mail no servidor.
- O e-mail do código tem o código no assunto e no corpo, em texto grande, sem link clicável. O iOS (17+) e o Android
  oferecem o código do e-mail no teclado. Sem link, não há o problema de o link abrir no navegador errado.
- Produção exige SMTP próprio (o SMTP padrão do Supabase é só para desenvolvimento) com SPF, DKIM e DMARC no domínio.
  Sem isso, o código cai no spam e a entrada para.

### 3. Aceite versionado, antes do CPF

- Depois de entrar e antes do CPF, toda conta nova passa pela etapa **Aceite**: o resumo da Política de Privacidade,
  dos Termos e do Código de Conduta, com link para cada um, e o botão "Aceito e continuo".
- A gravação usa a `public.record_consent_acceptance` que já existe (versões da aplicação, nunca do cliente;
  `accepted_at` do servidor). Não muda nada no banco.
- A etapa é a rota `/consent` do PR #104, agora para todos e não só para quem vem do Google. Ela não é portão de
  navegação: aparece no onboarding e não reaparece a cada visita.
- **Por que antes do CPF:** o CPF é consultado no Portal assim que é digitado. A pessoa precisa ter visto e aceito a
  política que explica esse uso antes.
- **"O combinado"** vem depois da prévia da cidade. Ele mostra as quatro regras de convivência em linguagem simples, com
  "Entendi". Não é um segundo aceite jurídico: a conclusão fica registrada como etapa do onboarding, com a versão do
  Código de Conduta exibida.

### 4. Login nativo no app de loja

Este ponto emenda o ADR-20261024-front-react-spa §6.

- **Google:** SDK nativo (Credential Manager no Android, Google Sign-In no iOS), por um plugin do Capacitor com versão
  fixa, devolvendo um ID token. Entra com `signInWithIdToken({ provider: "google", token, nonce })`. O nonce é gerado
  no aparelho e enviado em hash ao provedor. A tela de conta do sistema não é WebView, então a proibição do Google não
  se aplica. Se o SDK nativo falhar, o caminho de reserva é o do §6: navegador do sistema com PKCE e volta por link
  profundo.
- **Apple:** no iOS, Sign in with Apple nativo (`ASAuthorizationController`); no Android e na web, OAuth da Apple com
  PKCE. Mesmo `signInWithIdToken({ provider: "apple" })` no nativo. A Apple manda o nome só no primeiro login: ele
  vai para a etapa do nome como sugestão, nunca direto para o perfil.
- **Web:** OAuth com PKCE (`flowType: "pkce"`), como hoje.
- **Sessão:** como manda o §5.5 do ADR da SPA, o token fica em armazenamento seguro do sistema (Keychain e Keystore),
  nunca em `localStorage` no app de loja. Renova ao reabrir e é revogado no servidor ao sair.

### 5. Links profundos

- **Universal Links (iOS) e App Links (Android)** no domínio do Bivaque, para o prefixo `/app/`, com
  `apple-app-site-association` e `assetlinks.json` servidos pelo Next. O mesmo link abre o app se ele estiver
  instalado, ou a web se não estiver.
- Entram nesse prefixo: convite de familiar (`/app/convite/<código>`), grupo, anúncio e o retorno do OAuth
  (`/app/auth/retorno`).
- O esquema próprio `bivaque://auth-callback` (já na lista de retorno) fica só como reserva do OAuth. A lista continua
  sem curinga.
- O app valida todo parâmetro de link profundo antes de navegar, com uma lista de rotas permitidas. Link de convite
  aberto em outro aparelho funciona, porque o código está no link, e não num estado local.

### 6. Convite de familiar

O convite por código (ADR-20261022-entrada-do-prototipo §2) perde a senha:
1. código do convite;
2. e-mail do convite, só para leitura;
3. código no e-mail;
4. aceite.

Os limites de tentativa do código de convite não mudam.

### Decisão do dono em 05/11/2026 — o que o CPF devolve

O dono decidiu, ao fechar a revisão do PR #128, que `POST /api/app/entry/cpf` **pode devolver o nome
sugerido e o resultado da consulta**. O vínculo entre o nome e o militar já é público no Portal da
Transparência; a rota não revela nada que uma consulta pública ao mesmo CPF não revelasse. O CPF
continua sem ser gravado, sem voltar na resposta e sem entrar em log, e o resultado segue sem motivo
técnico. Esta decisão encerra o ponto: revisões futuras não reabrem o que a rota devolve, só o que
ela persiste e registra.

### O que não muda

- a verificação pelo Portal e o caminho do documento (ADR-20260922-identidade-quando-portal-falha);
- as regras de admissão;
- nada do Portal, CPF ou motivo técnico chega ao navegador;
- a mensagem única para erro de código ("Código inválido ou vencido") e para e-mail inexistente;
- o resolvedor de sessão único, CSRF e CORS do ADR da SPA §5.

### Substitui ou emenda

- **Substitui o ADR-20260907-login-com-senha.** Ele escolheu senha porque o público mais velho tinha dificuldade com o
  link no e-mail. Este ADR responde a isso com código digitado em vez de link, e com o código oferecido pelo teclado.
  Ver Riscos.
- **Emenda o ADR-20260907-consentimento-no-cadastro:** o aceite sai do formulário de cadastro, que deixa de existir, e
  vai para uma etapa própria antes do CPF.
- **Emenda o ADR-20261024-front-react-spa §6:** login nativo por ID token, com o navegador do sistema como reserva.
- **Não muda a ordem do ADR-20261022-entrada-do-prototipo:** o CPF continua antes do nome.

## Alternatives considered

1. **E-mail e senha (atual), com código como alternativa.** Rejeitada pelo dono: mantém a senha no cadastro, a
   recuperação e a troca, e duas formas de entrar por e-mail na mesma tela.
2. **Código, com senha opcional criada depois.** Rejeitada pelo dono: mantém recuperação e troca de senha para uma
   minoria.
3. **Link mágico no e-mail.** Rejeitada: no app de loja, o link abre o navegador ou outro aparelho, e é o mesmo atrito
   que motivou o ADR de 07/09.
4. **Passkeys desde já.** Adiada: exige suporte do provedor de autenticação e uma recuperação que ainda depende do
   e-mail. Fica para depois, como segundo fator ou atalho.
5. **Apple ligado já na web.** Adiada pelo dono: exige a conta Apple Developer agora. O botão aparece na prévia e é
   ligado antes da loja.

## Market or reference baseline

- **Nextdoor** (Mobbin, flows Onboarding `68adea93` e Logging in `51617ea5`): Apple, Google, e-mail e Facebook numa
  tela; "Create an account or enter your existing login credentials" numa tela só; termos numa linha; "Have an invite
  code?".
- Slack, Notion, Linear, Substack e Medium entram por código no e-mail, sem senha.
- App Store Review Guideline 4.8 (Login Services).
- Docs do Supabase Auth: `signInWithOtp`, `verifyOtp`, `signInWithIdToken` (Google e Apple), PKCE.
  **Conferir a versão fixada de `@supabase/supabase-js` antes da ligação.**

## Proposed divergence from baseline

- O Nextdoor mostra os termos numa linha na primeira tela. Aqui o aceite é uma etapa própria antes do CPF, porque o
  dado pedido logo depois (CPF consultado no Portal) é mais sensível que um endereço.
- Sem Facebook: o público não pede, e é mais um provedor para manter.

## Evidence and sources

- `docs/agents/regua-nextdoor/HANDOFF.md` §6.5, §7.2, §7.4; `AVALIACAO-79-FLOWS.md` (Entrada e conta).
- `supabase/config.toml` (`[auth]`, `[auth.email]` com `otp_length = 6`, `additional_redirect_urls`).
- `supabase/migrations/20260815131000_consent_acceptances.sql` (aceite versionado no servidor).
- `apps/web/lib/auth/entry-send.ts` e `apps/web/app/(preauth)/login/components/bivaque-sign-in.tsx` (entrada atual).
- ADR-20260907-login-com-senha, ADR-20260907-consentimento-no-cadastro, ADR-20260901-mobile-session,
  ADR-20261024-front-react-spa §5 e §6, ADR-20260922-identidade-quando-portal-falha.

## Benefits

- Uma tela e uma decisão a menos para quem chega: ninguém escolhe entre "entrar" e "criar conta".
- Sem senha, não há recuperação, troca nem vazamento por reuso.
- Apple atende a diretriz da loja.
- O aceite fica num lugar só, para Google, Apple e e-mail, antes do dado sensível.
- No app de loja, o login nativo não sai do app, e os links abrem o app certo.

## Risks

- **O público mais velho e o e-mail.** É a razão do ADR de 07/09. Mitigação: código digitado em vez de link, oferecido
  pelo teclado, reenvio visível em 60 s, e Google e Apple como caminho de um toque. Medir a taxa de conclusão da etapa
  do código por faixa de chegada (Google, Apple, e-mail). Se a conclusão por e-mail ficar abaixo de 85%, reabrir.
- **Entrega do e-mail.** Sem SMTP próprio e domínio autenticado, o código não chega. A ligação fica bloqueada até o
  SMTP de produção existir.
- **E-mail privado da Apple** ("Ocultar meu e-mail"): a conta da Apple não se liga sozinha a uma conta antiga por
  e-mail. Mitigação: "Formas de entrar" em Você > Conta para ligar as duas, depois. Até lá, a ajuda orienta a
  entrar pela forma original.
- **Força bruta no código:** 6 dígitos, 10 minutos, uso único, 6 tentativas e limite por IP e por e-mail. Exige teste
  negativo.
- **Contas com senha hoje:** passam a entrar por código. Nenhuma perde acesso, desde que o e-mail continue delas.

## Consequences — emenda de 04/11/2026 (SEC-007, lote A do F01)

A revisão independente e a auditoria de 04/11 sobre a primeira implementação das rotas `/api/app/entry/*` mediram que
os limites do §2 estavam escritos e não implementados. O desenho que os cumpre, sem mudar a decisão:

- **O limitador mora no banco**, em `private.entry_otp_limits`, com duas funções do schema `private` executáveis só por
  `service_role` e pontes `public.entry_otp_send_gate` e `public.entry_otp_verify_attempt` (a Data API só resolve
  `public`; `anon` e `authenticated` não executam nenhuma das quatro). A chave é HMAC-SHA256 do e-mail normalizado ou do
  IP, calculado no servidor: o banco nunca vê o endereço. A inundação de um e-mail esgota o contador dele e de mais
  ninguém; pedido recusado não gasta a cota do IP.
- **Envio:** no máximo 1 por e-mail a cada 60 s, 6 por hora por e-mail e 30 por hora por IP. O limite é consumido antes do
  GoTrue e não consulta a conta, então o 429 (com os segundos) é igual exista ou não a conta. O IP vem só de
  `x-vercel-forwarded-for` ou `x-real-ip`, que a plataforma escreve; `x-forwarded-for` é do cliente e nunca é
  identidade. Sem nenhum dos dois (desenvolvimento local) vale só o limite por e-mail. Isto pressupõe o deploy na Vercel.
- **Verificação:** a tentativa é consumida no banco antes do GoTrue (paralelas não passam do teto). No 6º erro o código é
  invalidado no servidor com `generateLink` (sem envio de e-mail; medido contra o GoTrue local: o código antigo passa a
  responder `otp_expired`; o tipo de link depende do estado da conta, ver a emenda do SEC-008), e a 7ª tentativa, mesmo com o código antes certo, falha com a mesma mensagem única sem chegar
  ao GoTrue. Um envio liberado reabre as seis tentativas.
- **Falha fecha:** sem resposta do limitador as duas rotas respondem 503; falhar aberto desligaria o limite quando há
  abuso.
- **GoTrue:** `max_frequency = "60s"`, `[auth.rate_limit]` explícito e o e-mail de confirmação de cadastro também leva o
  código (o `magic_link` já levava).
- **O cookie da sessão** gravado na verificação, e o renovado nas rotas que leem a sessão por cookie, usam as opções do
  callback do OAuth (`Secure` em produção). O proxy não renova em `/api` nem em `/app`; a renovação é da própria rota.

Risco residual aceito: o endpoint público do GoTrue (`/auth/v1/verify`) continua alcançável com a chave anônima. O contador
por e-mail só vê tentativas que passam pela rota do app; quem fala direto com o GoTrue é contido pelo limite por IP do
próprio GoTrue (`token_verifications`) e pela validade de 10 minutos. Fechar isso de vez exige o hook de verificação do
GoTrue ou o SMTP/Auth próprio de produção, e fica para a ligação de produção (BLOCK-RESEND). O `generateLink` cria a conta
de um endereço que ainda não a tinha, o mesmo efeito que `signInWithOtp` com criação já tem.

## Consequences — emenda de 04/11/2026 (SEC-008, lote A2 do F01)

A revisão independente do SEC-007 (PASS com ressalva: I-1, I-2, M-1, M-5) e a auditoria do `security-auditor` (LIBERA com M1,
M2, L1 a L5), ambas sobre `1ea22a9f`, apontaram o que a emenda anterior deixou aberto. O SEC-008 fecha, sem mudar a decisão
do §2:

- **Verificação limitada por IP (I-2, M1).** A verificação consome um escopo `verify_ip` por IP confiável (30 por 10
  minutos) ANTES do escopo por e-mail (6 por código). Um cliente que gira por muitos endereços esgota o IP dele, não o de
  todos. Recusa não gasta cota de nenhum dos dois escopos. A resposta é 429 com os segundos até a janela reabrir; o teto do
  e-mail continua respondendo a mesma mensagem única do código inválido.
- **Teto global de envio (M2).** O escopo `send_global` limita o projeto inteiro a 50 envios por hora, abaixo do
  `email_sent` do GoTrue (60 no `config.toml` local; antes 30, igual ao teto por IP). O servidor corta antes de o GoTrue
  ficar sem e-mail para todos. Os três tetos (e-mail, IP, global) só contam quando os três deixam passar.
- **O reset das tentativas sai do portão (M2).** Antes o envio liberado zerava as seis tentativas antes de o GoTrue
  confirmar o envio; se o GoTrue recusasse (reenvio de 60 s dele), o código antigo seguia vivo e já ganhava tentativas
  novas. Agora `entry_otp_send_confirmed` é uma chamada própria, feita pela rota só depois de o GoTrue confirmar.
- **Invalidação com o tipo de link certo (I-1, L3).** `generateLink` de tipo `magiclink` só troca o token de uma conta
  confirmada. O código de uma conta ainda não confirmada (confirmação ligada) é um token de confirmação, e o `magiclink`
  não o toca. O servidor lê o estado da conta (`entry_otp_account_state`, só `service_role`) e usa `magiclink` para conta
  confirmada e `invite` para conta não confirmada (troca o token de confirmação sem pedir senha). E-mail sem conta: não há
  código, nenhuma chamada ao GoTrue e nenhuma conta criada (o `generateLink` do SEC-007 criava uma).
- **Segredo do limitador sem padrão público (M-1, L1).** Em produção, sem `BIVAQUE_LIMITER_PEPPER` (ausente, vazio ou só
  espaço) as duas rotas respondem 503 antes de tocar banco ou GoTrue. O padrão existe só fora de produção. A variável está
  documentada em `apps/web/.env.example`, sem valor.
- **IPv6 pelo /64 (L4).** Nos dois escopos de IP o IPv6 entra reduzido ao prefixo /64 antes do hash; IPv4 embutido em IPv6
  vira o IPv4. Um cliente com um /64 não ganha 2^64 chaves.
- **RLS forçada (L2).** `private.entry_otp_limits` passa a ter `FORCE ROW LEVEL SECURITY`; pgTAP prova
  `relforcerowsecurity`, nenhum privilégio de tabela para `anon` e `authenticated` (e nem `service_role` lê a tabela
  direto) e a ausência de policy.

### Prova de runtime da invalidação (acceptance 5)

Medido em 04/11/2026 contra o GoTrue local com `enable_confirmations = true` ligado só localmente (o `config.toml` commitado
segue `false`; a stack foi reiniciada com o valor ligado e de novo com o commitado). O script chama o código real do servidor
(`apps/web/lib/app-api/entrada-limite.ts`) com o cliente de serviço local: envio pelo portão, `signInWithOtp`,
`entry_otp_send_confirmed`, leitura do código no Mailpit local, seis erros com a tentativa consumida no banco, invalidação no
6º erro, a 7ª tentativa pela rota e, por fim, o código original enviado direto ao GoTrue (o que faria quem ignora o app):

| Estado da conta | Estado lido | Invalidação no 6º erro | 7ª tentativa pela rota | Código original direto no GoTrue |
| --- | --- | --- | --- | --- |
| Nova, não confirmada | `unconfirmed` | `invite` (ok) | esgotado, sem tocar o GoTrue | recusado (`otp_expired`, HTTP 403) |
| Existente, confirmada | `confirmed` | `magiclink` (ok) | esgotado, sem tocar o GoTrue | recusado (`otp_expired`, HTTP 403) |
| Controle: nova, só `magiclink` (SEC-007) | `unconfirmed` | `magiclink` (ok) | esgotado | **ENTROU (código ainda vale)** |

Os seis erros responderam `otp_expired` no GoTrue e as tentativas foram numeradas de 1 a 6 em ambos os estados. A linha de
controle reproduz o defeito I-1 e mostra que a medição distingue o comportamento. Fora do controle, medido antes na matriz:
`invite` e `signup` invalidam o código da conta nova; `recovery` e `magiclink` não.

**Reprodução independente em 04/11/2026 pelo executor do SEC-008**, com o mesmo ambiente (`enable_confirmations = true`
só local, `config.toml` commitado com `false`), contra o GoTrue local e as rotas reais (`/api/app/entry/otp` e
`/api/app/entry/otp/verify`), endereços sintéticos `example.invalid`, código lido no Mailpit local e o token final
conferido direto no GoTrue (o que faria quem ignora o app):

| Caso | Envio | Seis erros pela rota | Código original direto no GoTrue depois |
| --- | --- | --- | --- |
| A. conta confirmada, controle | 200 | — | ENTROU (`email`) |
| B. conta confirmada, ataque | 200 | 400 × 6 | recusado — código morto |
| C. conta nova (não confirmada), ataque | 200 | 400 × 6 | recusado — código morto |
| D. conta nova, controle | 200 | — | ENTROU (`email`) |

Os controles A e D provam que os códigos chegavam vivos antes do ataque; B e C provam a invalidação no 6º erro nos dois
estados de conta, inclusive o caso I-1 (conta nova com confirmação ligada). Evidência completa com os corpos de cada
resposta em `.visual/sec008/prova-*.json` (ignorada). O `config.toml` foi revertido para `false` e a stack reiniciada com o
valor commitado antes do fechamento do lote.

### Custos e limites aceitos

- **DoS dirigido a um e-mail.** Quem sabe o e-mail de alguém consegue, sem conta nem sessão, matar o código dessa pessoa
  enquanto ele está em trânsito: seis verificações erradas esgotam o contador do e-mail e invalidam o código; e seis envios
  por hora consomem o teto de envio daquele endereço. O IP do atacante limita o ritmo (30 verificações por 10 minutos e 30
  envios por hora por IP), mas não impede o alvo de ficar sem código por um tempo. É a contrapartida de o limite ser por
  e-mail, necessário contra adivinhação distribuída. Mitigações: reenvio visível de 60 s, Google e Apple como caminho de um
  toque, janela de 10 minutos e hora. Mede-se o abuso pelo 429 e pelo 400 sem entrada; passkeys (alternativa 4) reduzem o
  risco.
- **O envio é contado antes do GoTrue.** Se o GoTrue falhar depois (transporte, limite dele), a cota do e-mail, do IP e a
  global já foram gastas e não voltam. A pessoa pode ver 429 sem ter recebido o código. Foi o preço de não depender de uma
  segunda ida ao banco para devolver cota e de o limite não consultar a conta.
- **Limites de produção a dimensionar.** Os números deste ADR (6 por hora por e-mail, 30 por IP, 50 globais, 30 verificações
  por IP em 10 minutos) são de desenvolvimento. A produção precisa dimensionar `email_sent`, `token_verifications` e
  `sign_in_sign_ups` do GoTrue e o teto global do servidor com o SMTP escolhido e o volume esperado do lançamento. O teto
  global do servidor tem de ficar sempre abaixo do `email_sent`. O cuidado fica em BLOCK-RESEND.
- **Resíduo do `/auth/v1/verify` público (L5).** Continua como na emenda anterior: o contador por e-mail só vê tentativas que
  passam pela rota do app. Quem fala direto com o GoTrue é contido pelo limite por IP do próprio GoTrue
  (`token_verifications`) e pela validade de 10 minutos. Fechar de vez exige o hook de verificação ou o Auth próprio; item
  explícito em BLOCK-RESEND.

## Reversal cost

Médio:
- volta da tela de senha (o mecanismo continua no GoTrue);
- configuração do `otp_expiry`;
- plugins nativos do Capacitor;
- os arquivos de associação de domínio.

O aceite não muda o banco.

## Success metric

- Taxa de conclusão da entrada (porta → aceite) por provedor, por evento de funil sem dado pessoal: alvo ≥ 85% no
  e-mail e ≥ 95% em Google e Apple.
- Tempo mediano da porta ao aceite ≤ 60 s.
- Zero contas duplicadas por e-mail não-privado em 30 dias.
- Provas:
  - e2e de conta nova e conta antiga pelo mesmo caminho;
  - teste negativo de enumeração (mesma resposta com ou sem conta);
  - teste negativo de código vencido, reutilizado e errado sete vezes;
  - link de convite aberto em navegador limpo.

## Reopen condition

Conclusão por e-mail abaixo do alvo por duas semanas; mudança na diretriz 4.8; passkeys suportadas pelo provedor de
autenticação.
