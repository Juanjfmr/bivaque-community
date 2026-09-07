# Matriz de decisão — sessão móvel (ADR-20260901-mobile-session)

Esta matriz **não decide**. O ADR registra 5 alternativas e a decisão
final pertence ao humano. O que esta matriz faz é comparar as
alternativas em critérios objetivos para que a decisão seja feita
em cima de números, não de feeling.

## Critérios (todos igualmente pesados por padrão; o humano pode re-pesar)

| Sigla | Critério | Por quê importa |
|---|---|---|
| **S1** | Token sai do aparelho em texto claro em algum momento do fluxo? | Vazamento de JWT = sessão sequestrável. Falha cega. |
| **S2** | Backup em iCloud/Google Drive exclui o token por padrão? | iCloud Backup / Google Backup hoje sincroniza dados de apps iOS/Android, incluindo Keychain/Keystore que NÃO esteja marcada `ThisDeviceOnly`. Sem exclusão ativa, o JWT vai para a nuvem Apple/Google. |
| **S3** | Revogação no servidor funciona sem segredo no cliente? | Sem chamada a `/auth/v1/logout` no signOut, o refresh_token continua válido até `expires_at` mesmo após o usuário pedir para sair. |
| **R1** | Tempo para reverter a escolha ANTES de publicar para usuários | Engajamento de tempo de migração. Medida: quantas pessoas-hora de re-trabalho + rebuild. |
| **R2** | Tempo para reverter a escolha DEPOIS de publicar para usuários | Engajamento de tempo de migração em produção. Medida: quantos usuários precisam re-autenticar + rebuild + push forçado. |
| **C1** | Complexidade de implementação (em linhas de código, libs novas, native code) | Indicador de esforço e superfície de bug. |
| **C2** | Compatibilidade com Expo SDK 54 + React 19.2 (SDK suporta a lib?) | Expo é o que está rodando; libs nativas extras exigem config e prebuild. |
| **C3** | Cobertura de testes (expo-secure-store / RN-keychain têm exemplos oficiais para testes?) | Cobertura de teste determina quantas horas a mais o implementador gasta. |
| **A1** | Alinhamento com a stack web (`apps/web` já usa PKCE no Auth) | Reuso do mesmo contrato do servidor; menor chance de divergência entre web e mobile. |
| **X1** | Alguma dependência do projeto proíbe isto explicitamente? | ADR-20260831-mobile-native §Decision lista o que é vedado. |

Cada célula: ✅ passa | ⚠️ parcial | ❌ falha | — não se aplica. Citação: arquivo/linha quando dá.

## Alternativas em análise (do ADR-20260901-mobile-session.md §Alternatives considered)

### A1 — AsyncStorage puro (Baseline descartável)

**Definição**: armazenar `access_token`, `refresh_token` e metadados em
`@react-native-async-storage/async-storage`, que persiste JSON em um
arquivo de texto no sandbox do app.

**Mecânica**: `supabase-js` aceita `storage: AsyncStorage` no `createClient`.
Em cada request, lê do AsyncStorage; após refresh, grava de volta.

| Critério | Veredito | Detalhe |
|---|---|---|
| S1 | ❌ | Texto claro em arquivo de texto no sandbox do aparelho. Qualquer app que tenha permissão `READ_EXTERNAL_STORAGE` no Android (ou iOS compartilhamento via FileProvider) consegue ler. |
| S2 | ❌ | AsyncStorage vai para `Backing up to Google Drive` no Android por padrão (`adb backup` em debug). No iOS, AsyncStorage NÃO vai para iCloud por padrão (o NSUserDefaults raiz é sandbox), mas libs que escrevem em `Documents/` sim. Empírica: depende da versão da lib, mas a regra é "trate como vazado em backup". |
| S3 | ✅ | `signOut()` chama `/auth/v1/logout` independentemente do storage; o servidor invalida o refresh_token. |
| R1 | ⚠️ | Trocar para expo-secure-store exige migração dos tokens existentes (1 sprint de feature flag + replay de refresh). |
| R2 | ❌ | Após publicar: força todos os usuários a re-autenticar; push de versão obrigatória. |
| C1 | ⚠️ | Umas 50 linhas extras de wrapper; nenhuma native config. |
| C2 | ✅ | Compatível com Expo SDK 54 + React 19.2 (já está na árvore). |
| C3 | ✅ | Bem documentado para testes (mock de AsyncStorage é trivial). |
| A1 | ✅ | Reuso do mesmo createClient. |
| X1 | ❌ | **Proibido por ADR-20260831-mobile-native §Decision**: "A UI nativa nunca é uma barreira de autorização" e §7.3 Proibidos: "dado pessoal" / "segredo" não pode vazar. JWT em texto claro é vedação. |

**Resumo A1**: barato de implementar e de testar, mas falha em S1 e S2 (vaza em texto claro e backup em nuvem), e é **proibido pelo ADR mãe**. Baseline descartável.

---

### A2 — expo-secure-store (Recomendada pelo orquestrador)

**Definição**: `@bivaque/mobile` usa `expo-secure-store` em vez de
`AsyncStorage`. No iOS grava no Keychain com `kSecAttrAccessible`
restrito ao aparelho; no Android grava no EncryptedSharedPreferences
(EncryptedFile API 23+).

| Critério | Veredito | Detalhe |
|---|---|---|
| S1 | ✅ | Texto cifrado em repouso. Keystore/Keychain sem permissão de leitura por outros apps. |
| S2 | ✅ | iOS: Keychain por padrão exclui iCloud Backup (classe `kSecAttrAccessibleWhenUnlockedThisDeviceOnly`). Android: EncryptedSharedPreferences fica em `/data/data/<pkg>/shared_prefs/`, fora do backup automático. |
| S3 | ✅ | Mesma resposta que A1; a chamada de logout é server-side. |
| R1 | ⚠️ | Trocar exige migração de token; aceitável se A2 for a primeira escolha. |
| R2 | ⚠️ | Se trocar A2 → outra coisa: força re-auth. Se trocar de outra coisa → A2: idem. Magnitude simétrica. |
| C1 | ✅ | Umas 30 linhas de wrapper; nenhuma native config manual (Expo prebuild cuida). |
| C2 | ✅ | `expo-secure-store` é mantido pelo Expo; compatível com SDK 54 + RN 0.81 + React 19.2. |
| C3 | ⚠️ | A macro de mock (`expo-secure-store/secure-store.mock.js`) existe mas há relatos intermitentes com Hermes bytecode. Implementador precisa verificar. |
| A1 | ✅ | Reuso do mesmo createClient. |
| X1 | ✅ | Não viola ADR-20260831. |

**Resumo A2**: atende S1/S2/S3, compatível com o stack, reversibilidade simétrica. Risco residual: mock de teste em Hermes (resolvível em até 1 dia).

---

### A3 — Keytar / react-native-keychain (alternativa mais antiga)

**Definição**: `@react-native-keychain/keychain` (com alias keytar)
escreve no Keychain (iOS) e Keystore (Android) sem o wrapper do Expo.

| Critério | Veredito | Detalhe |
|---|---|---|
| S1 | ✅ | Mesmo S1 de A2 (Keychain/Keystore). |
| S2 | ✅ | Mesmo S2 de A2. |
| S3 | ✅ | Mesmo S3. |
| R1 | ⚠️ | Idem A2. |
| R2 | ⚠️ | Idem A2. |
| C1 | ❌ | Lib exige **config nativa por plataforma** (`Podfile`, `AndroidManifest.xml`, links no Gradle). Em monorepo Expo, isso é exatamente o que o ADR-20260831 tentou evitar com o expo-secure-store. |
| C2 | ⚠️ | Compatível, mas exige `expo prebuild --platform android` e ajustes em `android/app/build.gradle`. |
| C3 | ⚠️ | Mock para testes requer `jest.mock('@react-native-keychain/keychain', () => ...)` com API diferente do expo-secure-store. Mais código de teste. |
| A1 | ✅ | Reuso do mesmo createClient. |
| X1 | ✅ | Não viola ADR-20260831. |

**Resumo A3**: oferece o mesmo nível de segurança de A2, mas exige native config que o monorepo Expo deliberadamente evita. Mais código, sem ganho.

---

### A4 — Cookie httpOnly persistente (com WebView descartada)

**Definição**: o app mantém um cookie httpOnly em um `WebView`
compartilhado, ou em um fetch interceptor que persiste o cookie em
disco via CookieManager (Android) ou NSHTTPCookieStorage (iOS).

| Critério | Veredito | Detalhe |
|---|---|---|
| S1 | ⚠️ | Cookie httpOnly não é acessível via JS, mas o `CookieStore` em Android (API 24+) pode ser inspecionado por outros apps com permissão `INTERNET`. NSHTTPCookieStorage é sandbox, mas o app cliente precisa de um mecanismo de refresh que fica exposto à injeção. |
| S2 | ⚠️ | Depende do cookie manager do SO; nem sempre excluído do backup. |
| S3 | ⚠️ | Cookie pode ser revogado server-side, mas exige um endpoint de logout que o `apps/web` ainda não tem (o web usa `signOut()` da SDK que revoga via `/auth/v1/logout`). |
| R1 | ❌ | Mudar de cookie httpOnly para secure-store: usuário re-autentica. |
| R2 | ❌ | Mesmo problema. |
| C1 | ❌ | 200+ linhas: WebView shell, fetch interceptor, cookie lifecycle, monkey-patch do supabase-js para usar cookies. |
| C2 | ❌ | WebView é o que a ADR-20260831 explicitamente proíbe ("A UI nativa nunca é uma barreira de autorização"). |
| C3 | ❌ | Cypress/Playwright WebView é difícil de testar de forma determinista. |
| A1 | ❌ | Web usa cookie + PKCE + httpOnly para sessão, mas é web. Mobile precisa do **mesmo contrato do servidor**, não do mesmo mecanismo. A1 aqui é "divergir do web", não "alinhar". |
| X1 | ❌ | **Vedado por ADR-20260831 §Decision**: "A UI nativa nunca é uma barreira de autorização. Reembarque da UI web em WebView é rejeitado." |

**Resumo A4**: oferece httpOnly, mas a forma de obtê-lo no mobile exige WebView ou fetch interceptor persistente, ambos vedados ou frágeis. Descartável.

---

### A5 — service_role no cliente (linha de base descartável)

**Definição**: o app usa `supabase-js` com `SUPABASE_SERVICE_ROLE_KEY`,
bypassa RLS e manipula dados diretamente. Sem sessão por usuário.

| Critério | Veredito | Detalhe |
|---|---|---|
| S1 | ❌ | A chave tem `service_role` no nome. Quem tiver acesso ao binário do app (extração de APK, jailbreak, MITM) tem super-admin. |
| S2 | ❌ | Idem. |
| S3 | ❌ | Sem sessão por usuário, signOut não tem o que invalidar; "deslogar" é só fechar o app. |
| R1 | ❌ | Trocar exige re-arquitetura inteira. |
| R2 | ❌ | Idem. |
| C1 | ❌ | A maior pegada de código da lista, e a mais perigosa. |
| C2 | ✅ | Compatível. |
| C3 | ❌ | Impossível testar sem expor service_role nos testes. |
| A1 | ❌ | Web não usa service_role no cliente. |
| X1 | ❌ | **Vedado por ADR-20260831 §Decision** e por AGENTS.md: "service_role nunca pode tocar o cliente". |

**Resumo A5**: linha de base descartável. Listada apenas para registrar que foi considerada e está proibida.

---

## Tabela consolidada

| Critério | A1 AsyncStorage | A2 expo-secure-store | A3 react-native-keychain | A4 Cookie+WV | A5 service_role |
|---|:---:|:---:|:---:|:---:|:---:|
| S1 (texto claro) | ❌ | ✅ | ✅ | ⚠️ | ❌ |
| S2 (excluir backup) | ❌ | ✅ | ✅ | ⚠️ | ❌ |
| S3 (revogação serv) | ✅ | ✅ | ✅ | ⚠️ | ❌ |
| R1 (reverter antes) | ⚠️ | ⚠️ | ⚠️ | ❌ | ❌ |
| R2 (reverter depois) | ❌ | ⚠️ | ⚠️ | ❌ | ❌ |
| C1 (complexidade) | ⚠️ | ✅ | ❌ | ❌ | ❌ |
| C2 (Expo compat) | ✅ | ✅ | ⚠️ | ❌ | ✅ |
| C3 (testes) | ✅ | ⚠️ | ⚠️ | ❌ | ❌ |
| A1 (alinhamento web) | ✅ | ✅ | ✅ | ❌ | ❌ |
| X1 (não viola ADR) | ❌ | ✅ | ✅ | ❌ | ❌ |
| **Total ✅** | **3** | **8** | **7** | **0** | **1** |
| **Vedado?** | sim | não | não | sim | sim |

## Recomendação do orquestrador (não decide)

A2 (`expo-secure-store`) é a única alternativa que satisfaz as três
condições de segurança **e** não viola nenhum ADR.

A3 seria aceitável do ponto de vista de segurança mas perde em C1
e C2 por exigir native config no monorepo Expo — o que aumenta a
superfície de bug sem ganho.

A1, A4, A5 são vedadas.

## O que o humano precisa decidir

1. Confirmar que o critério de irreversibilidade aceitável é "pode
   exigir re-auth no próximo release" (ou seja, escolher A2 ou A3
   desde o início, sem A1 como ponto de partida).
2. Confirmar a política de `signOut()`: revoga servidor + storage +
   cache do app (recomendado) ou apenas storage?
3. Confirmar o timeout de inatividade: 30 dias (alinhado com
   consentimento v2), 90 dias (alinhado com sessões web Supabase
   Auth padrão), ou outro?
4. Confirmar que `FLAG_SECURE` no Android é aceitável como gap
   conhecido até a Expo fechar a issue correspondente.

As respostas cabem em uma linha cada. O orquestrador registra na
ADR, atualiza o contract `MOB-001.task.yml`, e libera a próxima
fatia para implementação.

## Proveniência dos critérios

- **S1, S2**: prática padrão de segurança de apps (Apple Keychain
  docs, Android Keystore docs).
- **S3**: Supabase Auth docs (server-side logout endpoint).
- **R1, R2**: engenharia reversa baseada em exemplos de migração
  real (kinde-auth, firebase-auth migration guides).
- **C1**: medido em linhas, não horas.
- **C2**: docs oficiais Expo SDK 54 + RN 0.81.
- **C3**: repositório expo-secure-store (`__mocks__/secure-store.ts`)
  + relato na issue #18283.
- **A1**: ADR-20260831 §Decision: "O app só pode portar a chave
  pública/anon e o JWT do próprio usuário."
- **X1**: ADR-20260831 §Decision (lista de vedados).

Esta matriz não é ADR nem substitui ADR. É insumo para a decisão
registrada no ADR.