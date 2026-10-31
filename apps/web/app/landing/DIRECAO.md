# Landing Bivaque — O fio que fica

> **Superado em 15/09/2026 para a aparência e a copy da landing.** O contrato vigente do
> redesign é [`docs/design/landing-redesign-2026-09-15/BRIEF.md`](../../../../docs/design/landing-redesign-2026-09-15/BRIEF.md),
> que troca a serif **Georgia** por **Fraunces** e reescreve a prova interativa. Este documento
> segue válido como registro da investigação e da entrega v1–v4: as seções "Direção de arte"
> (Georgia, "sem fonte remota adicional") e "Verificação independente" (46/46 em
> `.visual/landing-v4-2026-09-15/`) descrevem **aquela** revisão, não o redesign em curso.
> Nada foi apagado. Prova independente do estado atual em
> [`docs/design/landing-redesign-2026-09-15/VERIFICACAO.md`](../../../../docs/design/landing-redesign-2026-09-15/VERIFICACAO.md).

## Investigação e decisão — 14/09/2026

O núcleo emocional é continuidade: mudar de endereço sem reconstruir toda a rede de apoio. O produto transforma experiência vivida em ajuda encontrável. Público: militares das Forças Armadas, veteranos, pensionistas e familiares elegíveis. Serviços são outra forma de apoio, sem transformar prestadores em membros.

Inspecionados: landing anterior renderizada, componentes PostPreview/FeedPost/MemberAvatar, Início e prancha 01-web-inicio, tokens Casa comum, correções do responsável e caminhos de entrada. A captura anterior está em `.visual/landing-before-2026-09-14`. O visual escuro e a mensagem abstrata distanciavam a aquisição do produto claro e cotidiano. Há erro preexistente de service worker 404 nessa captura; zero achados visuais não certifica runtime.

A autorização de 14/09 redefine a apresentação da landing. Mantemos infraestrutura, marca, cor de ação, destinos e regras do produto. Não mudamos o sistema inteiro. A escala editorial e a serif Georgia são uma exceção local de apresentação, sem fonte remota adicional.

## Cinco conceitos realmente distintos

Notas conceituais de 1 a 5; dificuldade e risco altos são desfavoráveis. São comparação de possibilidades, não avaliação da entrega.

| Conceito | Ideia e experiência | Originalidade | Clareza | Adequação | Visual | Narrativa | Motion | Imagem | Dificuldade | Risco de artifício |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Endereço afetivo | Uma porta muda de cenário enquanto relações familiares permanecem | 4 | 5 | 5 | 5 | 4 | 4 | 5 | 3 | 2 |
| Bagagem compartilhada | Objetos da mudança revelam conhecimentos que cabem na experiência, não nas caixas | 5 | 3 | 4 | 5 | 5 | 5 | 5 | 5 | 4 |
| Uma mesa a mais | Uma cadeira vazia se integra a uma conversa; entrar e acolher fecham um círculo | 4 | 4 | 5 | 5 | 5 | 3 | 5 | 3 | 2 |
| Atlas de pequenos saberes | Cidades contadas por perguntas cotidianas, com exploração editorial | 4 | 5 | 5 | 4 | 4 | 4 | 3 | 4 | 3 |
| O fio que fica | Uma linha liga chegada, pergunta, resposta e o gesto de acolher a próxima pessoa | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 3 | 2 |

Escolha: O fio que fica, com a presença humana de Endereço afetivo e o fechamento recíproco de Uma mesa a mais. A linha só tem função se conectar pessoas e ações; evitar um mapa decorativo ou promessa de cobertura numérica.

## Progressão

1. Entender em oito segundos: Muda a cidade. Fica a sua rede. Público, valor e convite visíveis.
2. Descobrir utilidade: escolher uma dúvida e ver a anatomia real da publicação, seu público e uma resposta ilustrativa.
3. Fazer parte: guia, serviços e comunidades ajudam a construir a rotina.
4. Retribuir: quem chegou pode compartilhar experiência. A cena de chegada encontra a mesa de convivência.
5. Decidir: perguntas sobre elegibilidade, cidade e independência institucional, então entrada.

## Direção de arte e comportamento

Fotografias geradas pela ferramenta integrada image_gen; a ferramenta não expõe a versão do modelo, portanto não certificamos a designação Image 2.5 do briefing. Cena 1: chegada com uma planta, vizinha e porta azul. Cena 2: café passado de uma pessoa a outra. Mesma luz, ocre, azul e ambiente brasileiro. São cenas ilustrativas, não membros ou depoimentos reais.

Fontes originais: `C:/Users/juana/.codex/generated_images/01a0a313-aa91-7563-8580-2c02bae70961/exec-af370c69-0106-4ed1-b745-79423ce03c3b.png` e `exec-9b17d821-0cb0-44ce-bd94-b61f343e861f.png`. Exportadas sem alteração semântica para WebP 1536×1024, 238820 e 152748 bytes. Next Image entrega tamanhos responsivos; somente a chegada tem prioridade. Não há imagem crítica remota.

Desktop: texto e encontro lado a lado, fio ultrapassa o recorte e alcança uma pergunta. Mobile: texto, CTA e fotografia em sequência, recorte recomposto, parallax removido. A demonstração usa PostPreview e MemberAvatar existentes com fixtures explícitas, sem requisição ou mutação de feed. Perguntas frequentes usam details/summary nativos.

Motion: progresso do scroll desenha o fio e desloca discretamente a fotografia; a escolha de pergunta muda o contexto da conversa. Reduced-motion entrega a linha completa e imagens estáveis. Conteúdo e CTAs não dependem de animação de entrada para aparecer.

Referências técnicas: [useScroll](https://motion.dev/docs/react-use-scroll), [useReducedMotion](https://motion.dev/docs/react-use-reduced-motion). Usamos LazyMotion para carregar somente os recursos DOM necessários.

## Avaliação

### Primeira versão (14/09, sessão interrompida por limite de uso)

Capturas `landing-v1-2026-09-14` (152 achados, 0 alto — quase todos tipografia abaixo de 13px e ausência de transição) e `landing-v2-2026-09-14` (5 achados, 0 alto, todos `nav-active`). Correções na sequência: piso de 13px na tipografia de apoio, enquadramento da fotografia a 100% para trazer quem acolhe, `sizes` e transições. A sessão terminou antes da verificação final; nenhum commit foi feito.

### Verificação independente (15/09, sessão de continuação)

- **Gate completo verde** (`npx pnpm@11.18.0 gate`): lint, typecheck, `next build`, 564 unitários, 189 de privacidade, 107 de escopo e varredura de segredos.
- **Captura própria** `.visual/landing-v4-2026-09-15/`: 5 achados, **0 alto**, identidade VALID, revisão `b9faf50` com árvore suja. Os cinco são `nav-active` na navegação de âncoras e na de links legais.
- **Prova interativa** (`.visual/landing-v4-2026-09-15/interaction-check.json`, script `verify-landing-interaction.cjs`): **46/46 PASS** — HTTP 200 e zero overflow em 375/768/1440, âncoras presentes, rótulo de demonstração visível, CTA acima da dobra no celular, três exemplos alternados por teclado, `/signup`, `/login`, `/privacidade` e `/codigo-de-conduta` respondendo 200, reduced-motion estável e nenhum erro de console.
- **Atalho de teclado em build de produção** (`.visual/landing-v3-2026-09-14/prod-tab-check.txt`): o primeiro Tab foca o atalho e Enter leva a `#conteudo`. Em `next dev` o primeiro Tab é o overlay `nextjs-portal`, artefato de desenvolvimento — foi o que produziu as duas falhas da primeira rodada; o script passou a registrar a trilha de foco e a tolerar o overlay.
- **Revisão adversarial independente** (agente distinto do executor; relatório em `.visual/landing-v4-2026-09-15/reviewer-report.md`): critérios 1, 2 e 4 satisfeitos; critério 3 passou a satisfeito com a prova de produção. Achados **H-2** (cadeia de prova do teclado), **L-1** (`sizes` superdimensionado) e **L-2** (aliases de token inexistentes) resolvidos — L-1 e L-2 corrigidos e re-checados no delta.

### Pendências registradas em card próprio

- **H-1 — OG em produção:** `openGraph.images` sem `metadataBase` emite `og:image` absoluto em `http://localhost:3000`. Exige a decisão do domínio canônico → card `WEB-OG-METADATABASE` (`blocked`).
- **M-2 — regra `nav-active`:** a regra exige item atual em nav que não navega por rota. A versão anterior só passava marcando `aria-current` falso no primeiro item, removido corretamente. Enquanto a regra não for escopada ou houver exceção adjudicada, a tela não fecha auditoria limpa → card `AUDIT-NAV-ATIVO-ANCORA` (`repo`).
- **M-1 e N-1 — fronteira do `PostPreview`:** o componente mantém o `aria-label` de compositor como nome acessível da demonstração e uma live region interna; o CSS esconde só o texto visível e depende do DOM interno. Corrigir pede variante no componente, fora dos caminhos deste contrato → card `FRONTEND-POSTPREVIEW-DEMO` (`next`).
- **Notas menores:** `L-3`, o `pnpm-lock.yaml` carrega também dependências mobile de outra sessão (cuidado ao commitar); `L-4`, a lista de exemplos usa `Button` com `aria-pressed` — migrar para `ToggleButton` seria troca de primitiva fora de escopo; `N-2`, o `<main>` não tem `tabIndex`, divergência do padrão do shell que não é defeito (o atalho funciona).

### O que não foi verificado

- **E2E e fluxos autenticados:** exigem a stack Supabase com seed. O redirect autenticado da raiz vive em `proxy.ts` (fora do diff) e a raiz segue pública para visitante anônimo, provado por HTTP 200.
- **Fidelidade contra a prancha de referência:** a auditoria declara `not assessed`; a comparação é de olho nas capturas, não contra o guia.
- **Leitor de tela:** o vazamento do `aria-label` e as regiões `aria-live` aninhadas não foram testados com AT.
- **OG e canonical em produção:** dependem do domínio canônico, ainda não decidido.
