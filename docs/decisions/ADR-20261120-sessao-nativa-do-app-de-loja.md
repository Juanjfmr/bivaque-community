---
id: ADR-20261120-sessao-nativa-do-app-de-loja
status: Aceito por delegação — aguarda ratificação
risk: R3
owner: Juan
approved_at: 2026-11-20 (por delegação; mandato do lançamento de 02/11); emenda de 21/11 por delegação (§4 e §7, reuso da renovação medido no GoTrue)
linked_plan: docs/LANCAMENTO.md
amends: ADR-20261024-front-react-spa (§5, modo Bearer do app de loja); ADR-20261105-porta-de-dados-do-app (§1, credenciais e repetição de leitura no nativo); ADR-20261105-entrada-enxuta-e-r3-sem-parada (entrada congelada, só o modo nativo da verificação do código)
critic_verdict: pass
critic_review: 3 rodadas — 1ª (54e66389) security-auditor BLOQUEIA e revisão FAIL; 2ª (4b6321bd) LIBERA COM RESSALVAS e PASS-COM-RESSALVA; 3ª (1e09fca0) LIBERA e PASS-COM-RESSALVA (style-src, renovação na volta do segundo plano). Todas as ressalvas incorporadas neste texto. Emenda de 21/11 (40850d7b4): security-auditor LIBERA COM RESSALVAS (reuso não revoga a família, aceito como resíduo; sem CRITICAL/HIGH) e revisão independente PASS-COM-RESSALVA; ressalvas incorporadas no §4, no §8 e nas Consequências.
---

# Sessão nativa do app de loja: token no cofre do aparelho, servidor como porta

## Problema

O LOJA-001 (#312) empacotou o `apps/app` em Capacitor sem mudar a sessão. O inventário
(`docs/agents/LOJA-SESSAO-INVENTARIO.md`, que entra na `main` com o #312) registrou três fatos.

- Na web, a sessão é o cookie que `/api/app/entry/otp/verify` e `/auth/callback` gravam (caminho `/`,
  SameSite Lax, 400 dias). O app instalado roda em outra origem: `https://localhost` no Android e
  `capacitor://localhost` no iOS. Cookie de terceiros na WebView depende da política de cada sistema, e o
  navegador externo usado no Google e na Apple não compartilha cookie com a WebView.
- O resolvedor do servidor (`apps/web/lib/app-api/sessao-do-next.ts`) já aceita
  `Authorization: Bearer`. Ele valida o token, recusa duas credenciais juntas, não volta ao cookie quando o
  token é inválido e cria o cliente do usuário sob RLS. Falta o app obter, guardar, renovar e revogar esse
  token.
- O app não tem cliente Supabase (ADR-20261105, porta de dados): tudo passa por `/api/app/*`.

## Decisão

### 1. Modo da sessão

No aparelho, a sessão é um par de tokens do Supabase Auth: acesso, de vida curta (padrão de 1 h), e
renovação, rotacionada a cada uso. O app manda só o token de acesso, como `Authorization: Bearer`, às rotas
`/api/app/*` que já existem. Não há cookie de sessão na WebView. A web continua só com cookie, sem mudança.

### 2. Posse de credencial é a única barreira

- Toda emissão de par exige prova de posse: código OTP válido, `code` mais `code_verifier`, ou token de
  renovação. Nenhuma rota nativa lê cookie, troca cookie por par ou gera par a partir de sessão de cookie.
- O modo nativo é declarado pelo cabeçalho `x-bivaque-cliente: loja`. Ele escolhe o formato da resposta
  (par no corpo em vez de cookie) e não autentica ninguém.
- Pedido em modo nativo vindo de origem web recebe 403. `Origin: null` conta como origem web. "Sem
  origem" significa só o cabeçalho `Origin` ausente. As origens nativas aceitas são `https://localhost` e
  `capacitor://localhost`.
- Pedido em modo nativo que traga cookie de sessão é recusado, venha de onde vier. A resposta nativa nunca
  tem `set-cookie`.
- O corpo que leva o par é exatamente `{ access_token, refresh_token, expires_at }`. `provider_token`,
  `provider_refresh_token` e o objeto `user` não saem do servidor.

### 3. Rotas

Cada rota segue o contrato do ADR SPA §5, entra em `apps/web/lib/security/api-surface.ts` e na superfície
pública do proxy (ADR-20261110), e tem teste positivo e negativo.

- **Alteradas:**
  - `POST /api/app/entry/otp` (envio do código) passa a aceitar as origens nativas.
  - `POST /api/app/entry/otp/verify`, em modo nativo, devolve o par no corpo em vez de gravar cookie. O
    limitador por tentativa que já existe (SEC-007/008) vale igual.
  - `POST /api/app/voce/sair` continua sendo a única rota de sair, para cookie e para Bearer (sem rota nova
    de sair). No modo Bearer, a revogação chama o GoTrue com `auth.admin.signOut(<token de acesso>,
    "local")`, que é `POST /logout?scope=local` com o JWT da pessoa e não usa `service_role`. O
    `signOut()` do cliente criado a partir do token é proibido: com `persistSession: false` ele não chama o
    GoTrue e responde sem revogar. No modo cookie, nada muda, inclusive o `Clear-Site-Data` do
    ADR-20261119 §3. No modo Bearer a resposta não leva `Clear-Site-Data` (não alcança a origem nativa;
    a limpeza local é do app, §7).
- **Novas:**
  - `POST /api/app/sessao/token` troca `code` mais `code_verifier` (§5) pelo par.
  - `POST /api/app/sessao/renovar` recebe o token de renovação no corpo e devolve o par novo.
  - As duas exigem modo nativo nas condições do §2.
- **Limitador:** `sessao/token` e `sessao/renovar` são públicas e chamam o GoTrue a partir do IP do
  servidor, cuja cota por IP todos os membros dividem. Por isso as duas ganham limitador por IP confiável no
  banco, consumido antes da chamada ao GoTrue e fechando em falha, no mesmo padrão da verificação do código.
  - **Tetos:** `sessao/token`, 20 por IP em 10 minutos; `sessao/renovar`, 120 por IP em 10 minutos. A
    verificação do código usa 30 em 10 minutos; a renovação fica mais folgada porque vários aparelhos atrás
    do mesmo CGNAT renovam sozinhos, e o app só renova quando faltam menos de 5 minutos para o
    `expires_at` (ou diante de 401), o que deixa cada aparelho em poucas renovações por hora.
  - **IP indisponível:** quando `ipConfiavel` devolve `null`, a chave do limitador é um balde único
    `sem-ip` com o mesmo teto, nunca isenção.
  - Ao estourar, respondem 429. Para o app, 429 é falha passageira (§4): não limpa o cofre.

### 4. Classes de resposta da renovação

- **Recusa definitiva → 401:** token inexistente, revogado, reusado fora da janela ou usuário removido. O
  app limpa o cofre e vai para a entrada.
- **Falha passageira → 429, 503 ou erro de rede:** 429 do limitador ou do GoTrue, 5xx, tempo esgotado ou falta de rede. O cofre
  fica intacto e o app tenta de novo com espera crescente. Abrir o app sem rede não derruba a sessão.
- **Rotação:** fica ligada, com a janela de reuso do `supabase/config.toml` (`refresh_token_reuse_interval
  = 10` s). Dentro da janela, o token anterior ainda devolve sessão; fora dela, o GoTrue recusa o token
  reusado (401) e registra a tentativa de abuso, e o app trata isso como sessão encerrada. **Emenda de
  21/11:** a prova contra o GoTrue local (CI do PR #317, run 44908862984) mediu que os descendentes do token
  reusado continuam válidos: R2 renovado direto no GoTrue devolve 200 e lê `/auth/v1/user`. A revogação
  da família não é garantida pelo provedor e deixa de ser promessa deste ADR. A janela não é zerada só
  no ambiente local para facilitar prova.
- **Tempo de vida:** no lançamento, a sessão não tem limite de duração (`[auth.sessions]` sem timebox). A
  contenção é a revogação ao sair, a recusa do token reusado e a exclusão de conta. Um limite por
  inatividade fica para depois do lançamento, num card próprio.

### 5. Google e Apple pelo navegador do sistema com PKCE

- O app gera o `code_verifier` com gerador seguro (43 a 128 caracteres) e manda ao servidor só o
  `code_challenge` S256.
- Quem monta a URL de autorização é o servidor, como hoje (`entry/oauth`), estendido para Google e Apple e
  para o modo nativo. Ele usa `code_challenge_method=s256` e um `redirect_to` constante definido no
  servidor, nunca vindo do pedido nem do `Host`. A rota da web, que guarda o verificador em cookie e deriva
  o retorno do `Host`, não é reaproveitada no nativo: o ramo nativo de `entry/oauth` não usa o cliente SSR
  com cookie nem `origemDoPedido`, e não grava cookie.
- O retorno é `bivaque://auth-callback?code=…`, a URI exata que já está em `additional_redirect_urls` do
  `supabase/config.toml`, sem curinga. O registro no projeto hospedado é ato do dono no painel.
- **CSRF de login:** coberto pelo PKCE mais o fluxo pendente. O app só aceita um retorno se houver no cofre
  um verificador criado há menos de 10 minutos. Verificador e marcador são apagados na primeira tentativa,
  com sucesso ou falha. Retorno sem fluxo pendente é ignorado. Não há `state` do app na URL.
- **Ouvinte próprio:** o retorno tem um ouvinte separado de `ouvirLinksNativos`, que trata o evento
  `appUrlOpen` e também `App.getLaunchUrl()` na abertura a frio (o sistema pode ter matado o app enquanto o
  navegador estava aberto). `rotaDoLink` continua
  recusando esse host, para o `code` nunca entrar no roteador nem no histórico. Depois da troca, o app segue
  o mesmo destino do `next` do callback da web (`/app/entrar`, que decide o passo seguinte).
- **Navegador:** `@capacitor/browser`, que usa Custom Tabs no Android e SFSafariViewController no iOS. Com
  PKCE S256, a interceptação do esquema não abre sessão (RFC 8252 §8.1). ASWebAuthenticationSession exigiria
  plugin de terceiros e não entra neste ADR.
- **Apple nativo no iOS** (Sign in with Apple pelo sistema), se a revisão da loja exigir, entra como adendo
  a este ADR no lote de login.
- **App Links e Universal Links:** quando houver domínio próprio, o retorno passa a eles, com o arquivo de
  associação servido pelo `apps/web`, num card amarrado ao domínio.

### 6. Cofre do aparelho

- O token de renovação, o verificador e o marcador do fluxo pendente ficam no armazenamento seguro do
  sistema: Keystore no Android, Keychain no iOS, com acesso só depois do primeiro desbloqueio e sem backup em
  nuvem.
- No Android, `android:allowBackup="false"`, ou regras de extração que excluam o cofre. Falha de decifração
  conta como "sem sessão".
- O token de acesso vive só na memória.
- Emenda de 21/11: o token de renovação também fica em memória durante a sessão para a renovação única e é apagado ao sair e no 401 da renovação.
- É proibido guardar qualquer um deles em `localStorage`, IndexedDB, `@capacitor/preferences`, URL, log,
  Sentry ou analytics.
- O plugin de cofre é a única dependência fora de `@capacitor/*` que este ADR autoriza. Ele precisa de
  versão exata, código aberto, manutenção ativa e registro em `versoes-1a.json`. O lote escolhe entre
  plugins que usam Keystore e Keychain e registra a escolha no contrato.
- **Limite do cofre:** ele protege o dado parado, não a WebView. Um XSS no app consegue chamar o plugin, como
  hoje consegue ler o cookie da web, que também não é httpOnly. Por isso o build nativo tem CSP e não
  carrega conteúdo remoto.
- **CSP do build nativo (decisão):** o `dist-nativo` leva uma meta CSP com `default-src 'self'`,
  `script-src 'self'` (sem `unsafe-inline` nem `unsafe-eval`), `style-src 'self' 'unsafe-inline'` e
  `font-src 'self'` (como a CSP do `/app`, pelo ADR-20261119 §2: o React e as peças usam `style` inline),
  `connect-src 'self'` mais a origem de
  `VITE_API_BASE` e a do Supabase Storage usada nas URLs assinadas, `img-src 'self' data: blob:` mais essas
  origens, `object-src 'none'`, `base-uri 'none'` e `frame-src 'none'`. O script inline que
  `apps/app/scripts/preparar-nativo.mjs` injeta sai para um arquivo próprio (ou entra por hash). O
  `capacitor.config.ts` não tem `server.url` nem `allowNavigation`. A prova lê o `index.html` gerado e
  confere a meta, a ausência de script inline sem hash e a configuração; no emulador, o console não mostra
  violação de CSP.

### 7. Ciclo de vida

- **Ao abrir e ao voltar do segundo plano:** ao abrir, se há token de renovação no cofre, o app renova antes
  da primeira leitura; ao voltar do segundo plano, renova só se o token de acesso em memória falta menos de
  5 minutos para vencer (ou não existe). Sem token de renovação, vai para `/app/entrar`.
- **401 no meio do uso:** só uma renovação em curso por vez, cobrindo também a abertura e a volta do segundo
  plano, e os pedidos esperam por ela. O novo token de renovação é gravado no cofre antes de soltar os
  pedidos. Se a gravação falhar, o app mantém o par novo em memória e segue; se fechar antes de conseguir
  gravar, o token antigo no cofre já foi rotacionado, e a próxima abertura pode cair na entrada. Esse
  resíduo é aceito e declarado.
  - Se a renovação der certo, o pedido é repetido uma vez só, e só leituras. Escrita não se repete (regra do
    `cliente.ts`): a tela oferece "Tentar de novo". A exceção é sair (abaixo).
  - Se a renovação for recusada (401), o app limpa o cofre e vai para a entrada com `redirect`, pelo mesmo
    caminho do #309. Falha passageira segue o §4.
- **Sair** segue a ordem fixa do ADR-20261118 §2:
  1. apagar a inscrição de push pela rota, com a sessão ainda válida;
  2. cancelar o registro no plugin de push;
  3. revogar a sessão em `POST /api/app/voce/sair`. Diante de 401, o app renova e repete `sair` uma vez,
     porque a operação é idempotente;
  4. limpar o cofre, os caches de consulta e o armazenamento da WebView (`localStorage`, IndexedDB e Cache
     Storage, onde ficam os rascunhos). O `Clear-Site-Data` da resposta não alcança a origem nativa, então
     o app limpa sozinho.
- **Sair sem rede:** o passo 4 acontece mesmo sem resposta, como no ADR-20261118 §2: o app não guarda
  credencial para revogar depois. O token de renovação continua válido no servidor até a pessoa excluir a
  conta. Esse resíduo é aceito e declarado.
- **Exclusão de conta:** o servidor já responde 401 pelo token (provado na revisão do F10), e o app trata
  como sessão encerrada.
- **Suspensão:** é aplicada pelas regras do banco em cada leitura e escrita, não pelo token. O token continua
  válido, e o app mostra o que o servidor recusar.

### 8. CORS, origem e cliente

- As origens nativas ficam numa lista própria, fora de `origensPermitidas()` e da lista de escrita por
  cookie.
- Para elas, a resposta leva `Access-Control-Allow-Origin` exato, sem `Access-Control-Allow-Credentials`. O
  preflight libera `authorization`, o cabeçalho do app e `x-bivaque-cliente`.
- No nativo, o cliente do app (`cliente.ts`) e a entrada (`apps/app/src/entrada/servidor.ts`) usam a base
  absoluta e `credentials: "omit"`. A entrada passa a usar o cliente único, em vez de montar o próprio
  `fetch`.
- A exigência do cabeçalho do app em escrita vale para sessão por cookie, como hoje. **Emenda de 21/11:**
  as rotas de entrada e de sessão em modo nativo (`entry/oauth`, `entry/otp`, `entry/otp/verify`,
  `sessao/token`, `sessao/renovar`) também exigem o cabeçalho do app, e o cliente do LOJA-003 o envia em
  todo pedido. As demais rotas com Bearer não o exigem: Bearer não carrega credencial ambiente, então não há
  CSRF a barrar.
- **Escrita por Bearer vinda da origem nativa:** `avaliarEscrita` e `conferirPorta` hoje recusam com 403
  uma `Origin` presente fora de `origensPermitidas()`, também para Bearer. Passam a conferir a `Origin`
  presente de um pedido Bearer contra a lista web mais a nativa. A lista de escrita por cookie continua sem
  as origens nativas. O preflight lista também `content-type`.

### 9. O que não se registra

- Token de acesso, token de renovação, `code`, `code_verifier`, marcador do fluxo e e-mail ficam fora de log
  do servidor, log do app, Sentry e de qualquer URL que não seja o retorno de uso único do §5.
- `/api/app/sessao/*`, `/api/app/entry/otp/verify` e `/api/app/voce/sair` ficam fora da captura de corpo do
  Sentry (`ignoreIncomingRequestBody`).
- O scrubber (`packages/domain/src/pii-scrub.ts`) e o logger (`apps/web/lib/logger.ts`) passam a apagar
  `access_token`, `refresh_token`, `provider_token`, `provider_refresh_token`, `auth_code` e
  `code_verifier`, também como parâmetro de URL e em breadcrumbs. A chave genérica `code` não é apagada em
  todo lugar (ela nomeia códigos de erro): só como parâmetro de `bivaque://auth-callback` e nos corpos de
  `/api/app/sessao/*`.
- O tratador do retorno não grava a URL no histórico do roteador.

## Provas exigidas do lote

- **Servidor — sessão:**
  - token de acesso válido lê; token inválido não volta ao cookie; cookie mais Bearer é recusado.
  - **Integração contra o GoTrue local, sem mock:** depois de sair por Bearer, o mesmo token de acesso é
    recusado pelo resolvedor e o token de renovação é recusado.
  - **Rotação:** R0 vira R1 e R1 vira R2; reusar R0 depois da janela de 10 s é recusado (401). R2 seguir
    válido é o comportamento medido do GoTrue (emenda de 21/11) e não é asserção do lote.
  - `renovar` com GoTrue em 5xx responde 503, não 401.
  - Limitador de `token` e de `renovar` responde 429 antes de chamar o GoTrue, inclusive com IP
    indisponível (balde `sem-ip`).
- **Servidor — modo nativo e origem:**
  - origem web pedindo modo nativo recebe 403, e `Origin: null` também;
  - modo nativo com cookie é recusado;
  - a resposta nativa não tem `set-cookie`;
  - o corpo com o par tem só as três chaves do §2.
  - `sessao/token` com verificador errado e com código reusado é recusado.
- **Servidor — CORS:** origem nativa recebe `Allow-Origin` exato e nenhum `Allow-Credentials`; o preflight
  com `x-bivaque-cliente` e `content-type` passa; origem nativa não serve para escrita por cookie;
  escrita por Bearer com `Origin` nativa passa e com `Origin` fora das duas listas recebe 403.
- **CSP:** o `index.html` do `dist-nativo` tem a meta do §6 e nenhum script inline sem hash; o
  `capacitor.config.ts` não tem `server.url` nem `allowNavigation`.
- **Redação:** teste do scrubber e do logger com um corpo de renovação e uma URL de retorno sintéticos, sem
  sobrar valor.
- **App:**
  - renovação única com pedidos concorrentes; escrita não repetida; sair repetido uma vez depois de 401;
  - 401 na renovação limpa o cofre; 429, 503 e falta de rede não limpam;
  - o retorno é tratado tanto por `appUrlOpen` quanto por `getLaunchUrl()`;
  - abrir a frio renova sempre; voltar do segundo plano só renova com menos de 5 minutos para o
    `expires_at`;
  - retorno sem fluxo pendente ou vencido é ignorado; o verificador não se reutiliza;
  - ordem ao sair: push, plugin, sessão, limpeza local;
  - nada do cofre aparece em `localStorage`, e sair limpa `localStorage`, IndexedDB e Cache Storage;
  - `rotaDoLink` recusa o host do retorno.
- **Emulador Android, com pilha local e sem chave real:**
  - entrar por código;
  - fechar e reabrir o app continua logado;
  - sair e reabrir cai na entrada;
  - Google por provedor falso (GoTrue local com provedor de teste), do navegador do sistema de volta ao app.
  - O manifesto tem backup desligado ou excluindo o cofre.
- iOS compila no CI. A prova no iPhone é ato do dono, no marco de aparelho real.

## Ordem dos merges

1. #312 (LOJA-001) entra antes deste ADR, porque o inventário citado só existe nele.
2. Este ADR.
3. O lote LOJA-002, que implementa este ADR. Ele também traz a tela de entrada no nativo e os pontos
   adiados do LOJA-001 registrados no card LAN-LOJA.

## Consequências

- O app de loja passa a funcionar sem cookie, e o resolvedor de sessão continua sendo um só.
- Ficam duas rotas novas de sessão, um limitador novo, mudanças em três rotas existentes e um plugin de cofre
  para manter.
- O teto de 120 renovações por IP em 10 minutos pode apertar num CGNAT grande de operadora. O 429 não
  derruba a sessão, então fica aceito no lançamento, e a medição em produção entra num card próprio.
- O par de tokens existe no aparelho. O risco fica contido pelo cofre do sistema, pela rotação com recusa do token
  reusado, pela revogação real ao sair e pelo CSP do build nativo. Contra XSS no próprio app, o cofre não
  protege mais do que o cookie protege na web.
- Sair sem rede deixa o token de renovação vivo no servidor até a próxima abertura com rede.
- **Tempo esgotado depois da rotação (emenda de 21/11):** se o GoTrue rotacionar R_n e a resposta não chegar
  antes dos 10 s do `renovar`, o servidor responde 503 e o app guarda R_n; uma nova tentativa depois da janela
  recebe 401 e a sessão cai. O LOJA-003 só repete dentro da janela de reuso; fora dela, a queda é aceita como
  resíduo raro.
- **Apple:** o `entry/oauth` do LOJA-002 aceita só Google. Apple (pelo navegador ou nativa no iOS) entra no
  LOJA-003 ou no adendo do §5.
- **Resíduo da emenda de 21/11:** quem copiar um token de renovação e usá-lo antes do dono mantém a cadeia
  dele viva mesmo depois que o dono reusar o antigo; o reuso só derruba o token reusado. Fica aceito no
  lançamento porque exige roubo do cofre do aparelho, e a revogação ao sair e a exclusão de conta seguem
  derrubando tudo. Revogação própria da família (mapa do token para a sessão e `signOut` global no reuso)
  entra num card pós-lançamento.
- Google e Apple dependem das credenciais dos provedores e do registro da URI de retorno no projeto
  hospedado, que são atos do dono. O código e a prova com provedor falso ficam prontos antes.

## Alternativas consideradas

- **Cookie na WebView.** Recusada: depende da política de cookie de terceiros de cada sistema, não
  compartilha a sessão com o navegador externo usado no Google e na Apple e exigiria credenciais CORS
  para origens locais.
- **Credencial opaca do aparelho, guardada pelo servidor.** Recusada para o lançamento: acrescenta tabela,
  revogação e renovação próprias para resolver o mesmo que a rotação do Supabase já resolve. Pode voltar
  se uma auditoria futura pedir que o token do provedor não saia do servidor.
- **supabase-js direto no app.** Recusada: quebra a porta de dados (ADR-20261105) e espalha a lógica de
  sessão em dois lugares.
- **ASWebAuthenticationSession no iOS.** Recusada agora: exigiria um segundo plugin de terceiros. Com PKCE
  S256, o SFSafariViewController basta.

### Emenda de 21/11 — escolha do cofre

O plugin escolhido é `@aparajita/capacitor-secure-storage` 8.0.1 (MIT), configurado com Keychain
`afterFirstUnlockThisDeviceOnly` e sem sincronização com iCloud; usa Keystore no Android e
`allowBackup=false`. O `capacitor-secure-storage-plugin` 0.14.2 foi recusado por ser publicado
depois do corte de 11/10 da regra de versões, e o 0.13.0 por depender do SwiftKeychainWrapper sem
acesso configurável. Ressalva: o pacote SPM `keychain-swift` entra com faixa "from 21.0.0" e fica
fixado pelo `Package.resolved` do build.

### Reauditoria de 22/11

`AbortSignal.timeout` foi trocado por `AbortController` por causa do iOS 15; falha dupla ao apagar o cofre ao sair deixa o marcador `bivaque.saiu`, que impede retomar a sessão; rotas autenticadas da entrada renovam; e a prévia do convite exige `x-bivaque-app` no nativo. Riscos aceitos: escrita com 401 e token longe de vencer não limpa o cofre (a pessoa vê erro e Tentar de novo; o token vence em até 1 h); erro de configuração de `origemDaApi` aparece como falta de rede; `indexedDB.databases()` ausente em parte dos WebView torna a limpeza de rascunhos melhor esforço.


### Emenda de 22/11 — execução das provas de loja

O workflow `app-loja-provas` prepara a pilha local no runner Android e recolhe capturas do roteiro;
o job macOS compila e abre o app e um link no simulador. Sessão iOS com servidor continua para o
aparelho do dono: o job macOS não sobe Docker. A aprovação depende de um run e da conferência dos
artefatos; a existência do workflow não é prova de execução.

Para Google, a alternativa exercita a abertura do navegador e confere a URL local de autorização
com PKCE S256; o retorno autenticado fica pendente. A CLI permite referências `env(...)` no
`config.toml`, mas este lote não altera esse arquivo. O [GoTrue v2.190.0](https://github.com/supabase/auth/blob/v2.190.0/internal/api/provider/google.go#L26-L54)
ignora explicitamente `GOTRUE_EXTERNAL_GOOGLE_URL` e usa o emissor Google fixo. O
[Keycloak](https://github.com/supabase/auth/blob/v2.190.0/internal/api/provider/keycloak.go#L45-L66)
aceita URL configurável, mas o app pede `provider=google`; substituí-lo não provaria esse botão.
Isso impede o provedor Google falso apenas por configuração, sem trocar código ou imagem do GoTrue.
