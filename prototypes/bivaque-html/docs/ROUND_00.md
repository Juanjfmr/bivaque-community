# HTML-000 — início da implementação, 13/10/2026

O responsável escolheu **“Protótipo HTML do ZIP, em área separada”**. Foram instalados
34 arquivos novos, incluindo 18 perfis Codex com hashes/tamanhos e TOML conferidos.
A aplicação Next.js, o backend e as alterações de outras sessões foram preservados.

O protótipo agora possui 48 fragmentos, template e manifest em `src/`, com a ordem e
o escopo lexical originais. `scripts/bivaque-html/build.py` gera um HTML único em
`dist/Bivaque_Material_Web.html`, permitindo futuras edições dos fontes sem reextração.
Material Web oficial, fontes, imagens incorporadas e avisos de licença foram mantidos.

Original, montagem e artefato possuem **2.760.578 bytes idênticos** e SHA256
`29a402c4e717ab2826c2e2aa0c3da6bac7f7b2b390090ed22c5ff1f2cbb385a4`.
Não houve redesenho nem reparo do comportamento recebido nesta extração.

## Provas por camada

| Camada | Resultado |
| --- | --- |
| Instalação | PASS independente: 18 perfis válidos e únicos; manifesto conferido |
| Referência/build | PASS independente: bytes idênticos, determinismo e sintaxe dos três scripts |
| Revisão de código | PASS após reparo do destino de saída; não equivale a runtime |
| Biome dirigido | PASS nos arquivos próprios; snapshots importados excluídos localmente |
| Contrato/kanban | HTML-000 válido R2; card HTML-000-PROTOTIPO e resumo gerado |
| Testes de escopo | 107/107 passaram, incluindo scanner de segredos |
| Gate completo | FAIL no lint de dois JSONs preexistentes; etapas seguintes não rodaram |
| Browser independente | 96 capturas; 44/48 pares de pixels idênticos; FAIL estrito de pixels |
| Funcionamento completo | FAIL: entrada e envio de conversas quebrados no original e no gerado |
| CI/publicação | Não executadas |

Revisor `html_review` e verificador `html_ux_audit` não implementaram nem alteraram
produção. O builder foi reparado após a revisão: destino fixo em `dist`, proteção
contra redirecionamento de caminhos/symlinks e escrita atômica. Probes negativos
do executor e do revisor passaram. Identidades finais revisadas/verificadas:

- `build.py`: `c1493f046e938aac5bea24866142fd76d9e8a923283342b9fdd52515ba750212`.
- `runtime-proof.mjs`: `e330593d2aa00b7c43dde81efd318460c442ab9df87aaa9de1549e4d74e06d65`.

Chromium local 1234, 375/768/1440, claro/escuro, pt-BR/Manaus, contextos isolados e
relógio de parede fixo. Foram exercitados início, busca com resultado e vazia, Criar,
detalhes de anúncio/negócio/grupo e entrada na etapa 2 do cadastro demonstrativo.
O ciclo completo do cadastro não foi certificado. Conversa exigiu rota direta:
clicar na entrada mantém `#conversas`; isso foi registrado como falha, não sucesso.
Probe independente de envio manteve **3 → 3 mensagens** e texto no campo em ambos.

Quatro pares divergiram: Criar 375/claro, Início e Criar 768/claro, Início 1440/claro.
Diferenças localizadas em cor do botão Criar e faixas de sombra dos cards, sem
evidência de mudança de layout. Estado transitório é hipótese, não causa comprovada.
A primeira matriz foi preservada; PASS estrito requer nova captura com estabilização
verificada. Também há colisão preexistente das legendas das áreas no Início a 768 px.
Zero overflow de documento não elimina essa colisão local.

Evidências em `.visual/bivaque-html-round00/`: `runtime-report.json`,
`independent-first-matrix.json`, `independent-verdict.json`,
`independent-message-probe.json`, `baseline-inventory.json` e `shots/`.
SHA256 da matriz independente inicial:
`692c2aa9a57b5a7863fb158ebc0a875081bb81ee8cba70578ff58e4f7500bf37`.

O gate parou por formatação em arquivos que já existiam fora deste lote:
`docs/evidence/figma-2026-10-06/local-artifacts-manifest.json` e
`docs/evidence/figma-2026-10-06/repair-run15-proof.json`. Eles foram preservados.
Não há gate geral verde, prova de tipos/build Next ou testes gerais nesta rodada.

## Pendências e próximo incremento

Auditoria independente com AST Acorn, inspeção dirigida e navegador encontrou
19 rotas no renderizador e 28 ações literais emitidas sem handler. O inventário regex
inicial traz 26 suspeitas e não é prova completa de dispatch.

Ações sem atendimento: `attend-event`, `open-event`, `notices`, `resume`, `agenda`,
`guide`, `plan-check`, `plan-go`, `plan`, `share`, `report`, `create-event`, `edit-event`,
`delete-event`, `my-ads`, `saved`, `family`, `cap`, `thread-menu`, `open-thread`,
`send-message`, `thread-origin`, `submit-event`, `copy-invite`, `remove-invite`,
`new-invite`, `submit-report`, `copy-share`. Os arrays de swipe acrescentam
`pin-thread` e `swipe-delete-thread`. Navegação de Guia/evento/salvos/família sem
resposta foi confirmada no navegador, além de conversas.

Outros achados preexistentes: aviso demo ausente em algumas jornadas; aprovação
automática de grupo fechado apresentada como decisão do admin; preferência
`showHood` salva sem efeito; foco de transição pendente de teste de teclado.

O card continua aberto. Próximo incremento: estabilizar a prova visual e conectar
as entradas/envio de conversas em `src`, com persistência fictícia, retorno, feedback
e caminhos de erro; depois conectar Guia/Agenda/Perfil. O original permanece congelado.
Nenhum desses reparos funcionais foi realizado nesta rodada.

## Reproduzir

```powershell
python scripts/bivaque-html/verify_reference.py
python scripts/bivaque-html/build.py --check
$env:PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH = 'C:/Users/juana/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe'
node scripts/bivaque-html/runtime-proof.mjs
node --test tests/scope/*.test.mjs
```

O runtime retorna 1 enquanto o fluxo conhecido estiver quebrado. Em outras máquinas,
ajuste o caminho do Chromium ou omita a variável com bundle instalado.
Build/abertura são detalhados no [README](../README.md).

Servidor estático iniciado em `127.0.0.1:4173`, com HTTP 200 confirmado para a saída.
A abertura no painel Codex retornou `queued`, sem confirmação de navegação.
`dist` é regenerável e ignorado pelo Git. Nenhum commit, merge ou publicação foi feito.
