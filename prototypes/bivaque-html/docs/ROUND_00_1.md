# Bivaque — Rodada 00.1: estabilização da fundação

**Fechamento atualizado em 14/10/2026: PASS nos critérios do protótipo;
BLOCKED para aprovação geral.** O verificador independente concluiu o parecer
interrompido, conferiu hashes da revisão `217cdc9f`, executou sondas próprias em
`file://` e repetiu integralmente as capturas visuais. O gate do repositório e a
tipagem mobile mantêm os defeitos preexistentes registrados abaixo. Não há
aprovação geral, CI ou publicação.

Parecer: `.visual/bivaque-html-round01/prior-round-verification/independent-round001-verdict.json`,
SHA256 `af238f8088a0cd815c3b59748d4d922ca7e186959317a67fc6012cff8ee8163f`.
Prova funcional independente preservada: 96 checkpoints em seis contextos.
Recaptura visual independente: 144 capturas finais, 144 pares consecutivos exatos,
três réplicas estáveis; 12/12 comparações candidato/oracle autorizado exatas.
As duas sondas suplementares inicialmente inadequadas e suas correções de
medição permanecem no parecer, sem alterações em produção.

## O que foi corrigido

- A seleção abre a conversa correta. Mensagens fictícias aparecem imediatamente,
  são escapadas e persistem no localStorage existente (`bivaque-material-web-v3`).
- Vazio, espaços, limite de 2.000 caracteres e restrições do perfil/cidade demo
  apresentam feedback. Falha de armazenamento preserva o texto e o histórico;
  retentativa grava uma mensagem sem duplicação.
- Enter envia; Shift+Enter adiciona linha; composição IME não envia. Entrada foca
  o compositor; retorno após reload foca a entrada da conversa selecionada.
- O contato retorna ao anúncio/negócio de origem. Origem removida informa a
  indisponibilidade sem abrir outro recurso. Conversa ausente/excluída ou de outra
  cidade não apresenta compositor. Menu local permite fixar, apagar e desfazer.
- A conversa identifica explicitamente a demonstração e a ausência de envio real.
- Home em 768 px: duas interseções de legendas foram eliminadas. Único delta CSS:
  media query 720–999 px, mantendo as quatro áreas na linha abaixo da busca.
- Build distingue `--check` estrito da referência de `--check-current` do candidato
  autorizado. O primeiro continua recusando diferenças; o segundo verifica hash
  congelado, sintaxe, duas montagens iguais e dist atualizado.

HTML gerado: `prototypes/bivaque-html/dist/Bivaque_Material_Web.html`, **2.767.785 bytes**,
SHA256 `3a89428131ea76386ca0966d8dc7964cb0b7a58e398ed350a88148e35682e8c2`.
Original congelado: **2.760.578 bytes**, SHA256
`29a402c4e717ab2826c2e2aa0c3da6bac7f7b2b390090ed22c5ff1f2cbb385a4`.

## Agentes e separação de responsabilidades

| Responsabilidade | Execução |
| --- | --- |
| Arquitetura e integração | `html_architecture`: builder, testes, mapa e README |
| Conversas e notificações | `bivaque_conversas_notificacoes`: cinco fontes de mensagens/ligação/foco |
| Frontend premium e motion | `bivaque_visual_stability`: CSS localizado e protocolo de captura |
| Revisão QA/UI/UX | `html_review`: somente leitura; achados e reparos revistos |
| Runtime independente QA/UI/UX | `html_ux_audit`: matriz funcional executada, parecer final interrompido |
| Coordenação | integração, contrato/card, prova funcional, gate, relatório e commit |

Foram usados os perfis já instalados; nenhum perfil duplicado foi criado. Escrita
paralela ficou restrita a paths disjuntos. Apenas o coordenador gerou o dist. Revisor
e verificador não implementaram os fontes. Os procedimentos `execute-task` e
`gate-before-done` foram aplicados sem substituir a autorização explícita do usuário.

## Arquivos alterados nesta rodada

- `src/features/messaging/actions.js`, `views.js`;
- `src/app/handlers.js`, `src/shell/bindings.js`, `navigation.js`;
- `src/styles/base.css`;
- `scripts/bivaque-html/build.py`, novos `test_build.py`, `capture-support.mjs`,
  `visual-stability.mjs`, `round001-proof.mjs`;
- `README.md`, `docs/MODULE_MAP.md`, este relatório e `docs/EVIDENCE_00_1.json`;
- contrato `docs/agents/tasks/HTML-000.task.yml`, card e resumo gerado do kanban.

O commit também incorpora a instalação e a fundação da Rodada 00, que ainda estavam
sem commit, para que o protótipo seja reconstruível. Não incorpora alterações alheias
em Next.js/mobile/backend, anexos remotos ou evidências Figma de outras sessões.

## Testes realmente executados

| Verificação | Resultado e alcance |
| --- | --- |
| Integridade original | PASS, hash congelado |
| Build/sintaxe/determinismo | PASS, três scripts completos e dist fresco |
| `test_build.py` | 20/20 PASS, inclusive caminhos, symlinks, drift e negativa do check estrito |
| Biome dirigido | PASS nos scripts próprios; snapshots importados preservados |
| Contrato e kanban | PASS; resumo regenerado |
| Testes de escopo | 107/107 PASS, incluindo scanner de segredos |
| Unitários do repositório | 564 testes em 70 arquivos PASS, conforme saída Vitest salva |
| Conversas em navegador | PASS nos 6 contextos 375/768/1440, claro/escuro |
| Execução funcional independente | 96 checkpoints PASS e 30 capturas; zero erros de browser ou chamadas externas |
| HTML `file://`, prova suplementar do coordenador | PASS: segunda conversa `t2`, envio e reload 2 → 3 mensagens |
| Visual estabilizado do executor | PASS: 144 capturas finais, 144 pares consecutivos idênticos, três réplicas exatas |
| Revisão de código/CSS/prova | PASS independente após reparos; não equivale ao parecer final de runtime |
| Gate completo | FAIL no lint, dois JSONs preexistentes; etapas seguintes não executadas pelo gate |
| Tipagem separada | FAIL: TS2688, definição `yargs` ausente em `apps/mobile` |

A primeira matriz funcional encontrou perda de foco após reload. O reparo foi
aplicado, revisto e a prova passou; a asserção final exige o compositor e a entrada
do ID selecionado, incluindo shadow roots, e não apenas foco diferente de BODY.
UUIDs do helper também foram corrigidos para variar o prefixo utilizado por `uid()`.

## Comparação visual objetiva

As quatro diferenças da Rodada 00 foram investigadas com repetições do **mesmo HTML**.
O protocolo antigo reproduziu variação em cantos dos cards sem mudança de código.
Desabilitar GPU não resolveu; outra opção experimental de composição produziu
timeout e foi descartada. Essas tentativas FAIL foram preservadas.

O protocolo final registra o primeiro paint, carrega fontes, aguarda updates Material
recursivos em shadow roots, decodifica imagens visíveis e espera animações finitas
reais e frames. Nenhum componente é ocultado; não há máscara ou tolerância de pixels.
120/144 capturas iniciais diferiram dos estados finais, com estabilização medida
entre 44 e 524,4 ms. A causa de baixo nível da rasterização dos cantos não foi provada;
o caráter transitório foi reproduzido e eliminado no protocolo final.

Resultado `visual-1791930736349`: 12/12 cenários original/baseline e 12/12
candidato/oracle exatos, três réplicas por cenário e zero colisões no candidato.
O oracle é o original mais **somente o literal CSS congelado e revisto** da correção
tablet; o teste exige esse sufixo exato. Assim a mudança autorizada não encobre
outros estilos. Criar 375/claro, Home e Criar 768/claro e Home 1440/claro passaram.
As capturas de conversa têm mudanças deliberadas de feedback/demo/foco; não são
declaradas byte a byte idênticas ao fluxo anteriormente quebrado.

## Modularização e preparação da Rodada 01

[MODULE_MAP.md](./MODULE_MAP.md) inventaria os 48 fragmentos, dependências e ownership.
Eles continuam concatenados no mesmo IIFE, com estado compartilhado; não são módulos
ES funcionalmente isolados. A mudança mínima demonstrada é o dispatcher
`messagingAction()` e o binder `bindMessagingScreen()`, com uma ligação em cada área
compartilhada. Persistência permanece sob `mutate`; nenhum registry novo foi necessário.

**Preparado para lotes locais da Rodada 01 com ownership explícito**, um responsável
por manifest/estado/shell e revisão/prova independente. Não está aprovado para merge,
release ou paralelismo irrestrito sobre helpers globais. Próxima rodada deve conectar
as ações restantes do shell/navegação, sem iniciar os domínios proibidos nesta rodada,
e incluir prova de teclado. O restante do protótipo não é declarado funcional completo.

## Falhas e bloqueios restantes

1. Gate: formatação dos arquivos preexistentes `docs/evidence/figma-2026-10-06/`
   `local-artifacts-manifest.json` e `repair-run15-proof.json`. Ambos permanecem com
   os hashes da entrada; foram reproduzidos sem reparo automático.
2. Tipagem: TS2688 em mobile, fora do lote. Configuração/diff alheios preservados;
   não foi realizado clean checkout separado nem correção de dependências.
3. Adjudicação final de runtime/recaptura visual pelo QA: BLOCKED por limite de
   execução do agente, após salvar a matriz funcional PASS. Não foi substituída
   por autoaprovação do coordenador.
4. Ações restantes e defeitos fora das cinco frentes continuam no card HTML-000:
   atalhos Guia/Agenda/Perfil, operações dos outros domínios, `showHood` sem efeito
   e aprovação automática de grupo apresentada como humana. Não corrigidos aqui.

Preservação: hashes dos documentos normativos/JSONs e comparação do diff rastreado
fora do kanban passaram em `preservation.json`. Nenhum backend, migration, política,
credencial, interface Next/Figma, merge ou publicação foi alterado nesta rodada.

## Evidência e reprodução

Evidência local: `.visual/bivaque-html-round00-1/`, incluindo `baseline/`,
`independent-functional/report.json`, `visual-1791930736349/visual-stability.json`,
`visual-findings.md`, logs de gate/tipagem/unitários/escopo e `preservation.json`.
Os hashes portáveis estão em [EVIDENCE_00_1.json](./EVIDENCE_00_1.json).

```powershell
python scripts/bivaque-html/verify_reference.py
python scripts/bivaque-html/build.py
python scripts/bivaque-html/build.py --check-current
python scripts/bivaque-html/test_build.py
$env:PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH = 'C:/Users/juana/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe'
node scripts/bivaque-html/round001-proof.mjs
node scripts/bivaque-html/visual-stability.mjs
node --test tests/scope/*.test.mjs
npx pnpm@11.18.0 gate
```

Em checkout novo, antes do teste visual crie `.visual/bivaque-html-round00-1/baseline/`
e copie a referência congelada para `round00.html`: a Rodada 00 comprovou a identidade
dessas duas entradas. Não copie o candidato atualizado para essa baseline.
O `dist` é regenerável e ignorado pelo Git. O check estrito `--check` deverá falhar
no candidato atualizado; não foi enfraquecido para aprovar as correções.

Histórico: commit específico `fix(html): stabilize round 00.1 foundation`, com a
fundação prévia ainda não commitada e os reparos desta rodada. Identificador entregue
na resposta final e verificável pelo Git, sem merge ou push.
