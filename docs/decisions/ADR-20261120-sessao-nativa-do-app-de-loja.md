---
id: ADR-20261120-sessao-nativa-do-app-de-loja
status: Aceito por delegação — aguarda ratificação
risk: R3
owner: Juan
approved_at: 2026-11-20 (por delegação; mandato do lançamento de 02/11)
linked_plan: docs/LANCAMENTO.md
amends: ADR-20261024-front-react-spa (§5, só o modo Bearer do app de loja)
critic_verdict: pending
critic_review: pendente — security-auditor e revisão independente sobre o texto antes do merge; o lote de implementação terá auditoria e revisão próprias.
---

# Sessão nativa do app de loja: token no cofre do aparelho, servidor como porta

## Problema

O LOJA-001 empacotou o `apps/app` em Capacitor, mas não mudou a sessão. O inventário
(`docs/agents/LOJA-SESSAO-INVENTARIO.md`) registrou três fatos.

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

1. **Modo da sessão.** No aparelho, a sessão é um par de tokens do Supabase Auth: acesso, de vida curta
   (padrão de 1 h), e renovação, de uso único e rotacionada. O app manda só o token de acesso, como
   `Authorization: Bearer`, às rotas `/api/app/*` que já existem. Não há cookie de sessão na WebView. A web
   continua só com cookie, sem mudança.
2. **Quem fala com o Supabase é o servidor.** Rotas novas do servidor, cada uma com o contrato do ADR SPA
   §5 e teste positivo e negativo:
   - `POST /api/app/entry/otp/verify` em modo nativo: a verificação do código por e-mail devolve o par
     no corpo, e não em cookie.
     - O modo nativo é declarado pelo cabeçalho `x-bivaque-cliente: loja`.
     - O servidor só o aceita vindo da origem do Capacitor ou sem origem; vindo de origem web, a resposta é
       403.
     - O par nunca vai a uma origem web.
   - `POST /api/app/sessao/token` troca `code` mais `code_verifier` (passo 3) pelo par, nas mesmas
     condições de modo nativo.
   - `POST /api/app/sessao/renovar` recebe o token de renovação no corpo e devolve o par novo.
     - A recusa de renovação (token usado, revogado ou vencido) responde 401, e o app limpa o cofre.
   - `POST /api/app/sessao/sair` revoga a sessão do aparelho (`signOut` com escopo `local`) e responde 200.
     O app limpa o cofre depois disso, ou também sem resposta: sair nunca depende da rede.
3. **Google e Apple pelo navegador do sistema com PKCE.**
   - O app gera `code_verifier` e `state`, guarda os dois no cofre e abre a autorização no navegador do
     sistema (Custom Tabs ou ASWebAuthenticationSession).
   - O retorno é `bivaque://auth/retorno?code=…&state=…`.
   - O app confere o `state` e troca `code` mais `code_verifier` em `POST /api/app/sessao/token`.
   - O código é de uso único e preso ao verificador: sozinho, um link interceptado não abre sessão.
   - Quando houver domínio próprio, o retorno passa a App Links e Universal Links, com o arquivo de
     associação servido pelo `apps/web`. Até lá, vale o esquema com PKCE.
4. **Cofre do aparelho.**
   - O token de renovação, o verificador e o `state` ficam no armazenamento seguro do sistema: Keystore no
     Android, Keychain no iOS, com acesso só depois do primeiro desbloqueio e sem backup em nuvem.
   - O token de acesso vive só na memória.
   - É proibido guardar qualquer um deles em `localStorage`, IndexedDB, `@capacitor/preferences`, URL,
     log, Sentry ou analytics.
   - O plugin de cofre é a única dependência fora de `@capacitor/*` que este ADR autoriza. Ele precisa de
     versão exata, código aberto, manutenção ativa e registro em `versoes-1a.json`. O lote escolhe entre
     plugins que usam Keystore e Keychain e registra a escolha no contrato.
5. **Ciclo de vida.**
   - **Ao abrir:** se há token de renovação no cofre, o app renova antes da primeira leitura; sem ele, vai
     para `/app/entrar`.
   - **401 no meio do uso:** uma única renovação em curso de cada vez; os pedidos esperam por ela.
     - Se a renovação der certo, o pedido é repetido uma vez só, e só leituras. Escrita não se repete
       (regra do `cliente.ts`): a tela oferece "Tentar de novo".
     - Se a renovação falhar, o app limpa o cofre e vai para a entrada com `redirect`, pelo mesmo caminho do
       #309.
   - **Troca de conta:** sair limpa o cofre, os caches de consulta e a inscrição de push do aparelho, na
     ordem do ADR-20261118 §5.
   - **Exclusão de conta e suspensão:** o servidor já recusa pelo token, e o app trata como sessão encerrada.
6. **CORS e origem.**
   - `https://localhost` e `capacitor://localhost` entram na lista de origens só para o modo Bearer.
   - Cookie vindo dessas origens é recusado, e elas nunca recebem `Access-Control-Allow-Credentials`.
   - A conferência de escrita continua exigindo o cabeçalho do app.
7. **O que não se registra.** Token de acesso, token de renovação, código, verificador, `state` e e-mail
   ficam fora de log do servidor, log do app, Sentry e qualquer URL que não seja o retorno de uso único do
   passo 3.

## Provas exigidas do lote

- Testes do servidor:
  - token de acesso válido lê; token inválido não volta ao cookie; cookie mais Bearer é recusado;
  - renovação com token reutilizado recusa;
  - a sessão revogada pela saída não renova;
  - origem web pedindo modo nativo é recusada.
- Testes do app:
  - renovação única com pedidos concorrentes;
  - escrita não repetida;
  - falha de renovação limpa o cofre;
  - `state` divergente é recusado;
  - nada do cofre aparece em `localStorage`.
- Emulador Android, com pilha local e sem chave real:
  - entrar por código;
  - fechar e reabrir o app continua logado;
  - sair e reabrir cai na entrada.
- iOS compila no CI. A prova no iPhone é ato do dono, no marco de aparelho real.

## Consequências

- O app de loja passa a funcionar sem cookie, e o resolvedor de sessão continua sendo um só.
- Ficam três rotas novas de sessão e um plugin de cofre para manter.
- O par de tokens existe no aparelho. O risco fica contido pelo cofre do sistema, pela rotação do token
  de renovação e pela revogação ao sair.
- Google e Apple dependem das credenciais dos provedores, que são atos do dono. O código e a prova com
  provedor falso ficam prontos antes.

## Alternativas consideradas

- **Cookie na WebView.** Recusada: depende da política de cookie de terceiros de cada sistema, não
  compartilha a sessão com o navegador externo usado no Google e na Apple e exigiria credenciais CORS
  para origens locais.
- **Credencial opaca do aparelho, guardada pelo servidor.** Recusada para o lançamento: acrescenta tabela,
  revogação e renovação próprias para resolver o mesmo que a rotação do Supabase já resolve. Pode voltar
  se a auditoria pedir que o token do provedor não saia do servidor.
- **supabase-js direto no app.** Recusada: quebra a porta de dados (ADR-20261105) e espalha a lógica de
  sessão em dois lugares.
