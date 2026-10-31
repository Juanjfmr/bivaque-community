# Verificação independente — landing pública (15/09/2026)

Sessão distinta do executor do redesign. Este documento registra **o que rodou, contra qual
revisão, o que foi corrigido no verificador e o que continua aberto** — a lista do que *não* foi
verificado está no fim e é parte do resultado, não letra miúda.

Contrato verificado: [`BRIEF.md`](BRIEF.md). Relatório de direção anterior (v1–v4, superado para
aparência): [`apps/web/app/landing/DIRECAO.md`](../../../apps/web/app/landing/DIRECAO.md).

---

## 1. Revisão exata

- Git `b9faf50`, **árvore suja** (redesign não commitado).
- Nenhum arquivo sob `apps/web/app` mudou entre **01:14:29** e esta verificação (07:00–08:00):
  a prova abaixo cobre a mesma árvore que a captura do executor.
- Servidor: `next build` + `next start` em `http://127.0.0.1:3014` (**produção**), não `next dev`.

## 2. O que foi executado

| Comando | Resultado |
|---|---|
| `next build` (`apps/web`) | Compilou (Turbopack, 14,4 s), TypeScript 3,7 s, 37 páginas geradas; `/` = **estática (○)**; aviso `metadataBase` reproduzido |
| `next start --port 3014` | `Ready in 355ms`; `GET /` → **200** (14.026 bytes) |
| `node .visual/verify-landing-interaction.cjs` | **37/37 PASS** · artefato `.visual/landing-redesign-2026-09-15-prod/interaction-check.json` |
| `node scripts/agents/task-contract.mjs` | 48 contratos válidos, exit 0 |
| `node --check .visual/verify-landing-interaction.cjs` | exit 0 |

**Prova de produção (a que faltava).** O 37/37 anterior do executor rodou contra `next dev` — a
trilha de foco registrava `NEXTJS-PORTAL`, overlay que só existe em desenvolvimento. Rodando
contra `next start`, o primeiro Tab é o atalho: `A:Pular para o conteúdo` → `#conteudo`. O
requisito "o atalho é o primeiro Tab em produção" (BRIEF §6) fica provado **sem** a tolerância de
4 paradas que o script usava para conviver com o overlay.

**Integridade do artefato.** O JSON grava o hash do próprio script que o produziu
(`script.sha256 = 15a6b751…2af6e0`), conferido contra `Get-FileHash` do arquivo: bate. Uma prova
passa a dizer qual revisão da prova a gerou.

## 3. Correções aplicadas ao verificador (e por quê)

O script era agnóstico de **copy**, não de **DOM**. Quatro acoplamentos:

1. **Fotografia.** `img.count() === 1` — exigia exatamente uma imagem. O BRIEF §3 manda colagem
   (Readymag), parede de rostos (Typeform) e mapa (Joby): a primeira imagem nova viraria FAIL
   pelo motivo errado, e o risco real era alguém "consertar" a landing para agradar o teste.
   Agora aceita ≥ 1 imagem visível com caixa não nula e **imprime a contagem** no detalhe
   (`1 img · primeira 593×650`), então a mudança aparece como informação, não como falha.
2. **Região da demonstração.** `page.locator("section", …).first()` escolhia a **primeira** seção
   rotulada. Há duas ("Demonstração — exemplos ilustrativos" em `landing.tsx:452` e
   "Demonstração · pessoas e conversas ilustrativas" em `:517`); a primeira não tem controles, e o
   código caía no fallback de página inteira **em silêncio**. Agora tenta cada seção rotulada e
   fica com a primeira que tem 2+ controles, imprimindo o escopo: `região=seção rotulada #2 de 2`.
3. **Painel do exemplo.** `#conversation-example` estava fixo no script. Agora o painel é
   resolvido pelo **`aria-controls` do próprio controle** (fallback: ancestral
   `section/article/fieldset`). O relatório mostra `painel=aria-controls=#conversation-example` —
   derivado, não embutido.
4. **Reduced-motion.** Uma única amostra (`scrollTo(0, 700)`) deixava passar parallax que começa
   depois disso. Agora amostra **25% e 75%** da rolagem, depois de `settleLayout()` (espera
   imagens pendentes e `document.fonts.ready`, que também deslocam layout). Resultado:
   `deslocadas: 0` nas duas amostras.

Total de verificações segue **37** — o conteúdo ficou mais forte, não mais numeroso.

## 4. Contagens conferidas (o relatório de status subestimava)

| Item | Alegado | Verificado |
|---|---|---|
| Referências no BRIEF §3 | 13 | **12 linhas · 18 marcas** (Geneva → Partiful) |
| Anti-padrões proibidos | 11 | **12** (BRIEF §4) |
| Perguntas da remoção | 12 | **13** no BRIEF §5.3 · **15 no código** (`landing.tsx:75-107`: 7 + 4 + 4) |

O código acrescentou duas perguntas ao brief (cubagem e `ex officio`) e usa o vocabulário
combinado: trânsito, cubagem, `ex officio`, guarnição, tempo de sede. As três fases estão em
`landing.tsx:72/87/99`; a nota de honestidade aparece duas vezes — FAQ (`:156`) e dentro do
capítulo 001 (`:380`).

## 5. Continua aberto (não fechado por esta verificação)

- **5 achados `nav-active` (medium), 0 alto.** A regra exige item atual em nav que não navega por
  rota → card `AUDIT-NAV-ATIVO-ANCORA` (`repo`, P1). **"0 high" não é auditoria limpa**; a landing
  não fecha captura sem achado enquanto a regra não for escopada.
- **`metadataBase` ausente** → `og:image` absoluto em `http://localhost:3000`; o aviso foi
  reproduzido no build desta sessão. Card `WEB-OG-METADATABASE` (`blocked`, P2): depende do domínio
  canônico.
- **`PostPreview` sem modo de demonstração** (nome acessível do compositor vaza para a demo) →
  card `FRONTEND-POSTPREVIEW-DEMO` (`next`, P3).
- **Fraunces via `next/font/google`**: zero request em runtime (correto), mas **rede no build** —
  se o CI ficar sem acesso ao Google Fonts, o build cai. Public Sans já é `localFont` com woff2 +
  `OFL.txt` em `apps/web/app/fonts/`; o caminho simétrico para Fraunces (OFL permite versionar o
  arquivo) elimina a dependência. O comentário em `apps/web/app/page.tsx:8-10` afirma que, se a
  busca falhar, "o CSS cai para Public Sans" — build derrubado não tem fallback; o comentário
  promete mais resiliência do que existe.
- **Direção ainda não materializada:** esta revisão renderiza **1 `<img>`**. Colagem, parede de
  rostos e mapa (BRIEF §3/§5.4) não estão no render — é escopo do executor, não defeito.
- **Contrato:** resolvido nesta sessão — [`LAND-002`](../../agents/tasks/LAND-002.task.yml) (R1)
  cobre a revisão de 15/09 e passa no validador de contratos. `LAND-001` (14/09) segue como o
  contrato da entrega v1–v4 e não cobre `docs/design/landing-redesign-2026-09-15/**`.
- **Board:** nenhuma transição foi escrita nesta sessão, de propósito —
  `tools/backend-kanban/public/board.json` é caminho do executor e dois escritores no mesmo arquivo
  perdem um dos lados. A evidência nova (prova de produção + hash da prova) entra no card da
  entrega.

## 6. O que **não** foi verificado

- **Gate completo (`npx pnpm@11.18.0 gate`)** não rodou: nesta sessão o `npx pnpm` falha com EPERM
  no cache do npm, fora do workspace. Rodaram: o typecheck **do próprio `next build`** (3,7 s) e o
  validador de contratos. **Lint, testes e varredura de segredos não rodaram nesta verificação.**
- **E2E autenticado e qualquer fluxo com Supabase:** a stack local não estava de pé (porta 55321
  fechada). A landing é pública e estática; nada aqui prova fluxo com banco.
- **Fidelidade visual contra o guia/prancha:** a própria auditoria declara `not assessed`; a
  comparação é de olho nas capturas, não contra a referência.
- **Leitor de tela:** o vazamento de `aria-label` do `PostPreview` e as `aria-live` aninhadas
  seguem sem teste com tecnologia assistiva.
- **Julgamento editorial/estético** deste verificador: fora de escopo. Esta página prova
  comportamento, contagem e integridade de artefato — não gosto.

## 7. Como reproduzir

```sh
# em apps/web
node_modules/.bin/next.cmd build
node_modules/.bin/next.cmd start --port 3014 --hostname 127.0.0.1

# na raiz
BIVAQUE_VISUAL_BASE_URL=http://127.0.0.1:3014 \
  OUT=.visual/<run>/interaction-check.json \
  node .visual/verify-landing-interaction.cjs
```

O script da prova vive em `.visual/`, que é **gitignored** (`.gitignore:8`). Para reproduzir a
prova a partir de um clone, ele precisa acompanhar o BRIEF para dentro do repositório versionado.

## 8. Segunda rodada — retorno do responsável (15/09)

O responsável abriu a primeira tela em 1920x1080 e reprovou três coisas: falta de movimento, o
desenho de rede e a copy. Medido com o mesmo método do resto deste documento:

**Movimento.** A página tem **8.259 px** de altura
(`.visual/landing-redesign-2026-09-15/shots/root--visitor--desktop-1440--full.png`). Todo o
movimento dela cabe em quatro itens: a foto do hero desloca 45 px e o fio desenha de 0,42 a 1
(`apps/web/app/landing/landing.tsx:244-246`), a troca da demonstração leva 250 ms, a faixa de
jornada tem um keyframe em loop de 5,5 s (`apps/web/app/landing/landing.module.css:491`) e há oito
regras de hover. **Nenhuma seção depois do hero tem movimento** — zero `whileInView`, zero entrada,
zero reveal em sete mil pixels.

**O processo é cego para isso.** A regra de movimento da auditoria
(`scripts/visual/capture.mjs:396-403`) só exige que o elemento interativo tenha *alguma* transição,
e a prova interativa desta pasta **falha se as imagens se moverem** sob `prefers-reduced-motion` —
ou seja, premia imobilidade. Não existe hoje checagem capaz de detectar ausência de momentum: "0
high" nunca foi evidência de página atraente.

**Desenho de rede.** `.visual/_probe/map-zoom.png` traz o recorte em tamanho real. É uma elipse
**fechada** com três cidades nomeadas e um arco tracejado que termina num círculo vazio. A legenda
declara três marcadores — ponto cheio, círculo vazado e quadrado — e no desenho **não existe nenhum
quadrado**, enquanto o único círculo vazado é o do rótulo "A sua próxima", que a legenda não cobre.
Duas das três entradas da legenda não têm referente. Com nomes reais de cidade, a elipse ainda
afirma uma geografia falsa, e um circuito fechado diz o oposto do que a seção promete.

**Copy.** Toda manchete de seção segue o mesmo molde — duas frases aforísticas, ponto no meio,
substantivo abstrato — e são **intercambiáveis entre si sem perda de sentido**, que é o teste de que
não dizem nada. O hero não nomeia o que a pessoa recebe. O material que responde "por que eu
entraria?" são as 15 perguntas reais, e elas só aparecem no capítulo 001, abaixo da primeira tela.

**Encaminhamento.** As três viraram critério verificável em
[`LAND-002`](../../agents/tasks/LAND-002.task.yml) — R1, validado por
`node scripts/agents/task-contract.mjs`. A prova de movimento exigida ali não é "existe animação":
são números medidos por seção, para poderem ser reexecutados por quem não confia no executor.
