# apps/mobile — fundação nativa Bivaque

Cliente nativo React Native + Expo do Bivaque Community. Esta é a **fundação** —
não a jornada autenticada. Foi autorizada por
[`docs/decisions/ADR-20260831-mobile-native.md`](../decisions/ADR-20260831-mobile-native.md)
(aceito, R3) e por [`docs/agents/tasks/MOB-000.task.yml`](../agents/tasks/MOB-000.task.yml)
(execução R1). A autorização política e a implementação executável são contratos
separados.

## O que esta fundação é

- Um segundo cliente executável do mesmo produto, pareado com `apps/web`.
- Quatro telas-placeholder (Cidade, Minha comunidade, Grupos, Eu) que
  espelham os containers de `docs/agents/VISUAL_GUIDE.md §0 Navegação`.
- Integração nativa ao tooling do monorepo: `pnpm typecheck`,
  `pnpm lint`, `pnpm test:scope` continuam verdes com este workspace.
- Bundle Metro exportável para Android e iOS.

## O que esta fundação NÃO é (e por quê)

Cada item abaixo exige um contrato R3 próprio, separado desta fundação. A
fundação os **proíbe** por desenho — não por esquecimento.

| Vedado nesta fundação | Por quê | Próximo passo |
|---|---|---|
| Sessão / login / chave anon / JWT | ADR-20260831 §Decision: autorização continua no servidor, e storage seguro + revogação + purge exigem ADR. | Contrato R3 próprio para a jornada de sessão móvel. |
| Cliente Supabase / `service_role` | Mesma ADR. Qualquer segredo no aparelho expõe a sessão do membro. | Quando o contrato R3 de sessão for aprovado, importar `@supabase/supabase-js` com a chave anon apenas. |
| Fetch de rede / chamada de API | Fundação sem backend próprio: o servidor do web é do web. | Contrato próprio por jornada, depois de o R3 de sessão existir. |
| Dado pessoal (CPF, OM, patente, endereço) | R3 e vedado por AGENTS.md mesmo no web. | Quando chegar, com contrato R3 + ADR de tratamento de dado pessoal. |
| WebView / reembarque da UI web | ADR rejeita explicitamente. | Proibido por desenho. |
| Push / SMS / vídeo / IA / DM / modo escuro | ADR-20260831 §Decision empilha todas essas exclusões no D31. | Cada uma exige reabrir a ADR. |
| Editar migrations / policies / RLS / schema `private` | Trilha de R3 do repositório; este workspace nem toca Supabase local. | Nada a fazer aqui. |

A fundação **só** sabe ler tokens (`@bivaque/tokens`) e desenhar placeholders.

## Stack e versões

| Item | Versão | Por quê |
|---|---|---|
| Expo SDK | `~54.0.0` | Compatível com React 19.1.0 e React Native 0.81 (matriz oficial do Expo). |
| React | `19.1.0` | Alinhado com a matriz do SDK 54; `apps/web` está em React 19.2.x. |
| React Native | `0.81.0` | Versão que o SDK 54 empacota. |
| expo-router | `~6.0.0` | Padrão atual do Expo (post-SDK 49) para file-based routing. |
| TypeScript | `^7.0.2` | Mesmo do workspace raiz (`package.json`). |

Escolha registrada: **expo-router**, não React Navigation. Expo Router é o padrão
atual do Expo, mantém file-based routing coerente com a expansão futura do app e
não acrescenta dependências externas além do que o Expo já carrega.

## Comandos locais

```sh
# Do diretório raiz do monorepo:
npx pnpm@11.18.0 install               # já feito na fundação
npx pnpm@11.18.0 --filter mobile typecheck
npx pnpm@11.18.0 --filter mobile lint
npx pnpm@11.18.0 --filter mobile export:android
npx pnpm@11.18.0 --filter mobile export:ios

# Diretamente em apps/mobile:
npx expo start                         # abre Metro Dev Tools
npx expo run:android                   # requer Android SDK local
npx expo run:ios                       # requer Xcode local
```

## Layout

```
apps/mobile/
├── package.json
├── app.json
├── tsconfig.json          # estende expo/tsconfig.base (desvio da raiz registrado)
├── metro.config.js        # monorepo-aware: watchFolders + nodeModulesPaths
├── babel.config.js        # preset mínimo babel-preset-expo
├── expo-env.d.ts
├── app/
│   ├── _layout.tsx        # Stack raiz; sem provider de sessão
│   └── (tabs)/
│       ├── _layout.tsx    # Tabs com os quatro containers
│       ├── cidade.tsx
│       ├── community.tsx
│       ├── groups.tsx
│       └── me.tsx
└── src/
    └── theme.ts           # tokens RN-friendly (rem → px, cores hex)
```

## Divergências registradas

1. **TypeScript preset**: o workspace estende `expo/tsconfig.base`, não
   `../../tsconfig.base.json`. Expo tem preset próprio (lib sem DOM, JSX
   `react-jsx`, plataforma-aware). A intenção é manter a base do repositório
   próxima a apps/web onde fizer sentido, mas priorizar o que o Expo declara
   como correto para React Native. Veja `tsconfig.json` para os campos
   declarados.
2. **Espaço e tipografia**: `@bivaque/tokens` exporta `rem` para espaço e
   tipografia. React Native StyleSheet só aceita números em pixel space, então
   `src/theme.ts` traduz `rem → px` usando base 16px. Cores são hex
   diretamente. Drift documentado aqui para não virar surpresa mais tarde.
3. **pnpm-workspace.yaml**: não foi tocado. A configuração monorepo do Metro
   está toda dentro de `metro.config.js`. Se a fundação precisar de
   `nodeLinker: hoisted`, o próximo contrato justifica e a alteração entra
   nele — não silenciosamente aqui.
