---
id: ADR-20260901-mobile-session
status: draft
risk: R3
owner: Juan
approved_at:
expires_at:
linked_plan:
critic_verdict:
critic_review:
---

# Sessão móvel — armazenamento de credencial, PKCE, refresh, revogação e purge

## Problem

A fundação `apps/mobile` (ADR-20260831-mobile-native, aceito) só carrega
placeholders. Para portar a golden slice do web (compositor + feed + audiência
+ reação + comentário + persistência), o cliente precisa de uma sessão
Supabase Auth vinculada ao aparelho, com:

1. Token armazenado em storage seguro do SO (Keychain no iOS, Keystore
   no Android). Nenhum segredo em `AsyncStorage`, em cookie httpOnly
   manual, em variável de ambiente JSX, em `localStorage`, nem em
   servidor de logs.
2. PKCE (proof key for code exchange) no login. O cliente nativo não tem
   client_secret; o OAuth do web só funciona com PKCE. O web tem
   `flowType: "pkce"` configurado na URL de authorize; a fundação
   precisa portar o mesmo fluxo para o app nativo.
3. Refresh automático antes da expiração do JWT. O app permanece
   autenticado entre invocações; o usuário não vê um logout no meio de
   uma conversa.
4. Revogação: `supabase.auth.signOut()` chama `POST /auth/v1/logout`
   no servidor, que invalida o refresh token no `auth.refresh_tokens`,
   e remove o token do storage do aparelho.
5. Purge de cache sensível (postagens em rascunho offline, fotos em
   upload, preferências que tenham sido derivadas do estado autenticado)
   ao `signOut()` ou ao `purgeSession()` explícito.
6. Bloqueio de screenshot/screen recording na tela que mostra a
   sessão (Android `FLAG_SECURE`; iOS não tem equivalente nativo,
   mas o app não renderiza conteúdo sensível em telas que poderiam
   ser capturadas).

A decisão não pode ser local ao implementador: o armazenamento seguro,
a política de purge e a interação com backup em nuvem são decisões
de produto e segurança **irreversíveis** depois de publicadas para
os usuários.

## Decision (proposed — pendente de aprovação humana)

Adotar a biblioteca **`expo-secure-store`** como storage de token e
metadados de sessão, com PKCE no login, refresh automático gerenciado
pelo `supabase-js`, sign-out que revoga servidor + storage + cache do
app, e screen-secure nas telas autenticadas.

| Item | Escolha | Por quê |
|---|---|---|
| Biblioteca | `expo-secure-store` | API única que abstrai Keychain (iOS) e Keystore (Android); mantida pelo Expo; documentada para uso com Supabase. |
| Schema | `access_token`, `refresh_token`, `expires_at`, `user_id`, `locality_id`, `aud` — apenas esses campos; sem PII, sem foto, sem endereço. | §4.3 privacidade; AGENTS.md proíbe CPF/Portal payload/endereço; o storage seguro é caro, então só o mínimo. |
| PKCE | Supabase Auth OAuth com `flowType: "pkce"` (mesma config do web). Cliente nativo não tem `client_secret`; o app recebe o `code` no deep link, troca por token. | ADR-20260831-mobile-native §Decision: "O app só pode portar a chave pública/anon e o JWT da sessão do próprio usuário." |
| Refresh | `supabase-js` detecta `expires_at` e faz `POST /auth/v1/token?grant_type=refresh_token` automaticamente. | Mantém sessão viva sem o usuário perceber; evita logout no meio de uma ação. |
| Revogação | `signOut()` chama `supabase.auth.signOut()`, que faz `POST /auth/v1/logout`, que apaga o refresh_token em `auth.refresh_tokens`. Depois, remove `access_token`, `refresh_token`, `expires_at`, `user_id` do secure store. Purga cache do app (`react-query` cache, AsyncStorage de rascunhos, expo-file-system de uploads pendentes). | Sem revogação no servidor, um token roubado fica válido até `expires_at`. Sem purge no cliente, fotos em rascunho continuam no aparelho. |
| `iCloud` / `Google Drive` backup | `expo-secure-store` por padrão EXCLUI os itens de backup (Keychain com acessibilidade restrita ao aparelho; Keystore sem sync). Não sobrescrever. | Backup em nuvem vaza o JWT para a conta Apple/Google do membro. |
| `FLAG_SECURE` no Android | `expo-navigation-bar` + `expo-blur` não cobrem; a opção atual é wrapping manual via `NativeModules.ExpoScreenCapture.preventScreenCaptureAsync()`. Sem isso, aceitar a lacuna no Android até uma issue Expo ser fechada. | DS-007: dado sensível não ecoado na UI; aqui é dado sensível não captado pela tela. |
| Timeout de inatividade | 30 dias, alinhado com o cookie de consentimento v2 (`bivaque-consent-version`). Após isso, forçar re-login. | Mesmo tempo do consentimento: o usuário já decidiu confiar no dispositivo por esse período. |
| Bloqueio biométrico | Não obrigatório nesta sessão. Pode ser opt-in em uma jornada futura. | ADR-20260831 restringe escopo; login biométrico exige ADR próprio. |

## Alternatives considered

1. **AsyncStorage puro** — Rejeitado: o token fica em arquivo de texto
   no aparelho, em backup na nuvem, e exposto a qualquer app com
   permissão de leitura do sandbox.
2. **Keytar / react-native-keychain** — Aceitável tecnicamente, mas
   exige configuração nativa por plataforma e quebra a portabilidade
   do Expo. `expo-secure-store` já resolve.
3. **Servidor persiste a sessão via cookie httpOnly** — Rejeitado: o
   cookie exige WebView ou fetch interceptor que persiste cookies em
   disco, o que é exatamente o que a ADR-20260831 proíbe ("A UI
   nativa nunca é uma barreira de autorização").
4. **service_role no app para "pular" RLS** — Rejeitado. ADR-20260831
   §Decision: "É vedado incluir `service_role`, qualquer segredo ou
   acesso ao schema `private`."
5. **Login com username/password nativo em vez de PKCE** — Rejeitado:
   o web já usa PKCE; o app nativo precisa do mesmo contrato para
   reuso de fluxos e auditoria única.

## Market or reference baseline

O Supabase Auth para React Native + Expo documenta exatamente este
padrão: secure-store + PKCE + refresh gerenciado + revogação
servidor. Diversos apps de produção seguem o mesmo desenho.

## Proposed divergence from baseline

Nenhuma.

## Evidence and sources

- ADR-20260831-mobile-native §Decision
- BIVAQUE.md §4.3 Privacidade
- BIVAQUE.md §7.3 Proibidos (sem `service_role`, sem `private` no app)
- Supabase Auth docs (expo-secure-store + flowType=pkce)
- DS-007 (Sensitive verification data is not echoed back)

## Benefits

Fecha a porta para a jornada autenticada no mobile sem reabrir a ADR
mãe. Permite que S3 (golden slice nativa) e S4 (prova de runtime)
avancem em paralelo depois.

## Risks

- Vazamento de token via backup em nuvem se `expo-secure-store` for
  configurado errado. Mitigação: declaração explícita de
  `requireAuthentication` e checagem no teste.
- Timeout de 30 dias é longo. Mitigação: alinhado com consentimento
  v2; o membro pode `signOut()` explícito a qualquer momento.
- Android sem `FLAG_SECURE`: capturas de tela são possíveis em
  teoria. Mitigação: nenhum dado sensível PII (CPF, OM, endereço)
  fica em tela autenticada por design — apenas posts, reações,
  comentários. Captura vaza *posts*, não credenciais.
- `expo-secure-store` em Expo SDK 54 com React 19.2: oficialmente
  suportado, mas há relatos de incompatibilidade menor. Mitigação:
  testes positivos + negativos (storage guarda token, `signOut`
  limpa, `purgeSession` limpa storage de rascunhos).

## Reversal cost

Alta depois de publicada para usuários. O cliente já tem um
esquema de storage no aparelho; trocar de esquema exige migração
de token (todos os usuários re-autenticam). Antes da publicação:
média — ajuste de contrato e rebuild.

## Success metric

1. Login com PKCE funciona em iOS e Android; o JWT é armazenado em
   secure-store.
2. O app sobrevive a um kill+relaunch sem pedir re-login (refresh).
3. `signOut()` limpa secure-store, AsyncStorage de rascunhos, e
   uploads pendentes em expo-file-system.
4. Pós-publish: zero tokens em logs de Sentry ou analytics.
5. Pós-publish: zero queixas de usuários sobre logout súbito.

## Reopen condition

Reabrir se (a) backup em nuvem vazar token em produção, (b) refresh
falhar sistematicamente, (c) `FLAG_SECURE` no Android for exigido
por ADR futuro.

## Approval

**Pendente de aprovação humana explícita.** Esta ADR foi redigida pelo
orquestrador para reduzir a fricção da decisão, mas a escolha é
irreversível depois de publicada. Espera o sinal do dono.