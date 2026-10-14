# Protótipo HTML — handoff para a próxima rodada

Leia só este arquivo para começar. Os relatórios `ROUND_*.md` e `EVIDENCE_*.json`
são histórico: consulte apenas se uma decisão anterior estiver em dúvida.

## Estado (14/10/2026)

- **Protótipo concluído** (Rodadas 00 a 06 PASS) e polido (Rodada 07 PASS). Candidato
  final `dist/Bivaque_Material_Web.html`, SHA256 `00575252…7f2c`. Ver [ROUND_06](ROUND_06.md)
  e [ROUND_07](ROUND_07.md).
- Antes do lançamento: auditoria de acessibilidade com axe-core e leitor de tela real.
- Pendente de decisão humana: aprovação da parte comercial (R3, exige ADR).
- Próximo passo do produto: adaptar ao backend seguindo [ADAPTERS](ADAPTERS.md).
- Decisões de produto registradas: em grupo fechado, quem aprova é o moderador
  (simulado em Controles do protótipo).
- Gate completo do repo **verde** (`npx pnpm@11.18.0 gate`, exit 0). Se o TS2688
  `yargs` voltar, é `node_modules` corrompido por instalação interrompida, não código.
- Pendências por domínio: [NEXT_DOMAINS](NEXT_DOMAINS.md). Ownership: [MODULE_MAP](MODULE_MAP.md).

## Regras que não mudam

- Edite só `prototypes/bivaque-html/src/`. Nunca leia `dist/` nem `reference/`
  (2,7 MB de base64): use os scripts.
- Referência congelada, Material Web, `styles/`, `data/demo/` e `vendor/` não mudam
  sem decisão explícita.
- Sem backend, Supabase, Next.js ou Figma.

## Comandos

Durante o trabalho (rápido, rode a cada mudança):

```bash
python scripts/bivaque-html/build.py && python scripts/bivaque-html/build.py --check-current && python scripts/bivaque-html/verify_reference.py
```

No fechamento da rodada (uma vez; Chromium em
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=…/ms-playwright/chromium-1234/chrome-win64/chrome.exe`):

```bash
node scripts/bivaque-html/round01-proof.mjs
```

```bash
node scripts/bivaque-html/round02-proof.mjs --full
```

```bash
node scripts/bivaque-html/round03-proof.mjs --full
```

```bash
node scripts/bivaque-html/round04-proof.mjs --full
```

```bash
node scripts/bivaque-html/round05-proof.mjs --full
```

```bash
node scripts/bivaque-html/round06-proof.mjs --full
```

```bash
node scripts/bivaque-html/round07-proof.mjs --full
```

Durante o trabalho, as provas sem `--full` rodam só 375 claro;
`BIVAQUE_HTML_CHECKPOINT=<nome>` roda um checkpoint. Rodada nova: crie
`roundNN-proof.mjs` importando `proof-harness.mjs` (modelo: `round03-proof.mjs`).

```bash
node scripts/bivaque-html/round01-visual.mjs --deterministic-renderer
```

```bash
node --test tests/scope/*.test.mjs
```

O critério visual compara hashes de DOM/estilo e aceita diferença de pixel só na
zona que o Chromium já não reproduz entre réplicas da própria referência. Não volte
a exigir bytes idênticos entre contextos: a referência congelada não cumpre isso.

## Como pedir a próxima rodada

Uma frente por sessão. Prompt com: objetivo, arquivos de `src/` envolvidos e
comando de aceite. Um implementador e um verificador no fim. Evidência: uma seção no
relatório da rodada e uma linha no card, sem hashes de tudo nem cópias de diff.
