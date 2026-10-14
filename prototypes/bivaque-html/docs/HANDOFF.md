# Protótipo HTML — handoff para a próxima rodada

Leia só este arquivo para começar. Os relatórios `ROUND_*.md` e `EVIDENCE_*.json`
são histórico: consulte apenas se uma decisão anterior estiver em dúvida.

## Estado (14/10/2026)

- Rodada 01 **PASS** no escopo do protótipo. Candidato
  `dist/Bivaque_Material_Web.html`, SHA256 `e6acf9e6…af87`.
- Gate geral do repo: vermelho só por itens **externos**, que não são deste lote:
  lint em `docs/evidence/figma-2026-10-06/*.json` (não versionados, outra sessão) e
  typecheck `apps/mobile` TS2688 `yargs`. Não rode o gate inteiro esperando outro
  resultado; rode as etapas abaixo.
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
