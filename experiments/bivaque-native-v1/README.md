# Bivaque — Beta nativo Android

App Android real em **Expo SDK 54 + React Native + Expo Router**. Não utiliza WebView, HTML ou React DOM. O projeto é um aplicativo de testes instalável com três jornadas: chegada à cidade, recomendações entre membros e mercado de desapegos. Funcionalidades de criação, respostas, salvamentos, grupos e conversas persistem localmente em AsyncStorage, não apenas em estado visual.

**Limite conhecido**: os registros e pessoas iniciais são dados de amostra; nenhuma mensagem é enviada a terceiros. Integração com Supabase exige adoção dos contratos de autenticação, identidade e RLS já presentes em `apps/mobile` e verificação dos esquemas de publicação e anúncios. O app não representa a produção.

## Desenvolvimento

Na raiz do repositório:

```sh
cd experiments/bivaque-native-v1
npm install
npm run assets:copy
npm run typecheck
npm test
npx expo start
```

## APK para testes

A ação `Bivaque Native Android APK` compila um **APK release de testes**, com bundle JS incluído e identidade de pacote separada da versão de produção. A assinatura de testes é gerada localmente pelo Gradle (não serve para publicação na Google Play). Baixar em GitHub Actions > Artifacts e instalar no Android após permitir instalações de fontes externas.

A APK é construída no GitHub Actions com `expo prebuild`, Gradle e o SDK do Android. Nenhum token Expo, Supabase ou serviço privado é necessário para a experiência local.

Build Android: workflow dedicado compila pacote instalável a partir deste código em branch isolada.
