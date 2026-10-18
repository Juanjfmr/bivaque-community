# Protótipo HTML — handoff para a próxima rodada

Leia só este arquivo para começar. Os relatórios `ROUND_*.md` e `EVIDENCE_*.json`
são histórico: consulte apenas se uma decisão anterior estiver em dúvida.

## Estado (14/10/2026)

- **Protótipo concluído** (Rodadas 00 a 06 PASS) e polido (Rodada 07 PASS). Candidato
  final `dist/Bivaque_Material_Web.html`, SHA256 `00575252…7f2c`. Ver [ROUND_06](ROUND_06.md)
  e [ROUND_07](ROUND_07.md).
- Rodadas 08 a 10: movimento, pacote Material reproduzível e componentes Material
  visíveis. **Rodada 11 (15/10):** "Contratar serviço", com pedido aberto e até 5
  propostas de empresas do ramo, aprovado só para o protótipo pelo
  [ADR-20261015](../../../docs/decisions/ADR-20261015-pedido-aberto-e-propostas.md). Ver
  [ROUND_11](ROUND_11.md). Levar ao backend exige novo ADR depois do teste com pessoas.
- **Rodada 12 (15/10):** 12 grupos de serviço + Outros, com especialidade opcional. Marcar
  negócio só ao responder pergunta. Ver [ROUND_12](ROUND_12.md).
- **Rodada 13 (15/10):** Início do desktop (≥ 1024 px) e painel "Criar no Bivaque" com
  atalho C. **Nova base visual congelada** em `scripts/bivaque-html/round13-baseline.mjs`.
  Ver [ROUND_13](ROUND_13.md).
- **Rodadas 14 a 24 (15 e 16/10):** lote de componentes inspirados no 21st.dev:
  - busca rápida ⌘K, plano em linha do tempo, propostas lado a lado e central de avisos;
  - fotos com arrastar e soltar e galeria, contador com avatares, balões de conversa e
    pílula deslizante;
  - Desapegos e Imóveis em telas próprias, com filtros de cada mercado em pílulas (maquete
    aprovada);
  - fotos carregando e estados vazios ilustrados.
  Ver [ROUND_14](ROUND_14.md) a [ROUND_24](ROUND_24.md). A revisão foi única para o lote, a
  bateria completa passou e a **nova base visual** está em
  [VISUAL_BASELINE_R24](VISUAL_BASELINE_R24.md). Publicado em 16/10.
- **Lote B, Rodadas 25 a 28 (16/10):**
  - alerta de busca salva;
  - plano com anel e "Continuar";
  - imóvel em etapas;
  - explicação do selo verificado.
  Revisão única, bateria e base visual em [VISUAL_BASELINE_R28](VISUAL_BASELINE_R28.md).
  Publicado em 17/10, junto com o lote C.
- **Lote C, Rodadas 29 a 34 (16 e 17/10):**
  - cartão para compartilhar no WhatsApp;
  - comparar imóveis salvos;
  - mapa de bairros com MapLibre e OpenFreeMap (ADR-20261016-mapa-de-bairros, a aprovar);
  - agenda agrupada por dia;
  - avisos empilhados com desfazer;
  - celebração ao indicar.
  Revisão única, bateria e base visual em [VISUAL_BASELINE_R34](VISUAL_BASELINE_R34.md).
  Publicado em 17/10 (`8dcad9cd…`).
- **Lote mobile, Rodadas 35 a 39 (17/10):**
  - Início do celular com a organização do desktop e a cidade no título;
  - barra de baixo com "Criar" no centro, luz na aba ativa e ícones em SVG;
  - título grande que sobe para a barra;
  - conversa com a pessoa na barra, aviso contra golpe e caixa em pílula;
  - anúncio e negócio com a foto até o topo;
  - deslizar nas conversas com "Não lida". O gesto já existia; a auditoria errou ao dizer
    que faltava.
  Revisão única, bateria e base visual em [VISUAL_BASELINE_R39](VISUAL_BASELINE_R39.md).
  Publicado em 17/10 (`b71c2248…`).
- **Lote mobile 2, Rodadas 40 a 44 (17/10):**
  - galeria com arrastar para fechar, pinça e toque duplo;
  - folha do bairro sobre o mapa, com três alturas;
  - teclado certo em cada campo, preenchimento automático e vibração leve;
  - avisos pedidos com explicação antes e instalação como app;
  - busca em tela cheia com recentes, explorar e sugestões.
  Revisão única, bateria e base visual em [VISUAL_BASELINE_R44](VISUAL_BASELINE_R44.md).
  Publicado em 17/10 (`eb4969db…`).
- **Lote de volume, Rodadas 45 a 48 (17/10):**
  - listas longas em blocos de 24, com carregamento ao rolar e contagem;
  - blocos também em Comunidade, busca, grupos, Conversas, Salvos e Meus anúncios;
  - salvar e "Útil" sem redesenhar a lista;
  - folha do bairro com muitos anúncios terminando em "Ver todos".
  Sonda de volume: numa cidade grande, num celular médio, as listas abrem em menos de 1 s (antes,
  até 9,5 s). Revisão única, bateria e base visual em
  [VISUAL_BASELINE_R48](VISUAL_BASELINE_R48.md). Publicado em 17/10 (`1de94489…`).
- **Painel do Bivaque, Rodadas 49 a 52 (18/10):** o console do dono da plataforma (Você →
  Controles do protótipo → "Ver como dono do Bivaque"):
  - visão geral com chegadas atendidas, métricas, O que mudou e a fila com prazo;
  - revisão no painel lateral, com motivo para remover ou recusar;
  - Filas, Cidades, Negócios e planos, Pessoas e equipe;
  - a denúncia feita no app passa a ser registrada e chega à fila.
  Revisão própria e revisão independente do GPT (Codex), bateria e base visual em
  [VISUAL_BASELINE_R52](VISUAL_BASELINE_R52.md). Publicado em 18/10 (`c83703ea…`).
- Teto de tamanho: 2 MB transferidos com gzip (`round09-proof.mjs`); hoje cerca de 1,8 MB.
- Método combinado com o usuário: cada rodada roda só a prova nova (375 e 1440) e o gate. A
  revisão independente, as provas antigas e o congelamento visual ficam para o fechamento do
  lote.
- Lotes B e C concluídos e publicados em https://bivaque-prototipo.vercel.app. Publicar só
  quando o usuário pedir.
- Antes do lançamento: auditoria de acessibilidade com axe-core e leitor de tela real.
- Pendente de decisão humana: aprovação da parte comercial (R3, exige ADR).
- Próximo passo do produto: adaptar ao backend seguindo [ADAPTERS](ADAPTERS.md).
- Decisões de produto registradas: em grupo fechado, quem aprova é o moderador
  (simulado em Controles do protótipo).
- Gate completo do repo **verde** (`npx pnpm@11.18.0 gate`, exit 0). Se o TS2688
  `yargs` voltar, é `node_modules` corrompido por instalação interrompida, não código.
- Pendências por domínio: [NEXT_DOMAINS](NEXT_DOMAINS.md). Ownership: [MODULE_MAP](MODULE_MAP.md).

## Link de teste

- **https://bivaque-prototipo.vercel.app**: projeto Vercel separado (`bivaque-prototipo`),
  só com o HTML gerado. Tem `noindex` e não tem cache, então cada publicação aparece na
  hora. Os dados de cada pessoa ficam no navegador dela.
- Publicar uma nova versão, depois do commit da rodada (confere o build antes):

```bash
node scripts/bivaque-html/deploy-vercel.mjs
```

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
