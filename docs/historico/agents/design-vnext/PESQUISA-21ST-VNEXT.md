# Pesquisa 21st.dev para Design vNext — 10/11/2026

> **Estado:** shortlist de metadados consultados via MCP 21st.dev, **não** componentes aprovados, instalados, executados ou auditados em código.  
> **Stack-alvo:** `apps/app` React SPA/Vite/Tailwind 4/shadcn/Radix; biblioteca `src/pecas/`. Landing `apps/web` tem fronteira própria.

## Procedimento e limites da consulta

Foram consultados `get_usage`, `list_bookmarks` e buscas de inspiração para carrossel, busca/filtros, threads e calendário. O MCP retornou **`contextApplied: false`** mesmo quando recebeu descrição do projeto: **a ordenação não é prova de aderência ao Bivaque**. A conta sinalizou catálogo pesquisável e acesso a componentes; `aiGenerationEnabled: false` — não pressupor geração de UI hospedada.

O uso correto é:
1. buscar metadados gratuitamente;
2. comparar candidatos com `src/pecas/` e `apps/app/components/ui/`;
3. recuperar **somente** o código do candidato selecionado com `get_component(id)` (pode consumir uso do plano);
4. auditar licença, versão exata, dependências transitivas, bundle, ícones, motion, semântica e acessibilidade;
5. adaptar para tokens, Material Symbols, temas e regras do Bivaque, testar em laboratório isolado; 
6. **não** aplicar `get_theme` para substituir paleta aprovada.

## Shortlist verificada no catálogo

| Jornada | Candidato / autoria | Evidência de interesse | Veredito inicial |
|---|---|---|---|
| F02 Home | [Carousel — shadcn](https://21st.dev/@shadcn/components/carousel) (`id=813`) | Embla; interação por swipe, base compatível | **ADAPTAR se não houver equivalente existente**; primeiro verificar versão local shadcn |
| F02 descoberta | [Snap Carousel — ddoemonn](https://21st.dev/@ddoemonn/components/snap-carousel) (`id=23559`) | snap, momentum, *peek* do próximo cartão e teclado | **REFERENCIAR**; código/acessibilidade e peso ainda não auditados |
| F06 anúncios | [Carousel Cards — kokonutd](https://21st.dev/@kokonutd/components/carousel-cards) (`id=19168`) | cartões de listagem com foto e conteúdo escaneável | **REFERENCIAR**; retirar estrela, preço/curtida quando não suportados |
| F02/F06 filtros | [Filter Token Bar — laziekiki](https://21st.dev/@laziekiki/components/filter-token-bar) (`id=26824`) | filtro composto, navegação por teclado e carregamento assíncrono declarados | **REFERENCIAR** para desktop; no mobile, sheet mais simples pode vencer |
| F02 busca | [Command Menu with Global Search — ephraimduncan](https://21st.dev/@ephraimduncan/components/command-menu-04) (`id=27378`) | seções por tipo e recentes | **REFERENCIAR**; não copiar busca global irrestrita ou outras categorias de produto |
| F04 respostas | [Comments — efferd](https://21st.dev/@efferd/components/comments) (`id=4340`) | respostas, autor e movimento no exemplo | **REFERENCIAR**; auditar framer-motion e semântica de moderação |
| F04 respostas | [Comment Thread — rmahammad](https://21st.dev/@rmahammad/components/comment-thread) (`id=26900`) | envio otimista com pendente, enviado, falhou e tentar novamente | **REFERENCIAR** para estados, não assumir todas as reações/menções |
| F05 agenda | [Calendar — wensity](https://21st.dev/@wensity/components/calendar) (`id=31350`) | calendário com pontos de eventos e modos de seleção | **REFERENCIAR**; confirmar se melhora eventos sem virar agendamento de consulta |
| Clubes (escopo separado) | [Booking Slot Calendar — bidyut10](https://21st.dev/@bidyut10/components/booking-slot-calendar) (`id=34576`) | faixa semanal e slots disponíveis | **REFERENCIAR** no laboratório Clubes, não misturar com F05 |

**Triagem anterior:** `docs/historico/agents/prototipo-shadcn/21ST-TRIAGEM-2026-10-26.md` já propôs Command oficial, Property Preview Card, pesquisa de filtro e compositor. Não duplicar instalação ou considerar o documento histórico autorização vigente.

## Rejeições preventivas

- **Autoplay Image Carousel** (bundui, `id=27694`): autoplay não é requisito; movimento e atenção têm custo — **DESCARTAR como default**.
- **Linear Carousel 3D** (animbits, `id=20150`), **Zoom Slider** (hyperiux, `id=26047`): efeito 3D/infinito/hover predominante sem ganho comprovado para uso frequente — **DESCARTAR para primeira rodada**.
- **Interactive Globe Explorer** (`id=28448`): globo 3D de escritórios não resolve mapa local Bivaque — **DESCARTAR**.
- **Booking Call Calendar** (`id=38035`): jornada de consulta comercial não corresponde automaticamente a F05 Eventos — **DESCARTAR para F05**.
- **Reddit Nested Thread Reply** (`id=5621`): votos/ranking não pertencem ao modelo aprovado — **DESCARTAR como pacote fechado**.

## Matriz de avaliação antes de instalar

Para cada componente candidato registrar:
- **Necessidade:** problema de jornada demonstrado em screenshot/fluxo.
- **Baseline:** componente ou experiência existente com a mesma fixture.
- **Função:** ganho observável (ex.: item seguinte visível, filtro restituído, erro recuperável), não “mais bonito”.
- **Dependências:** resultado de `get_component`, versão instalada e tamanho; não confiar apenas no texto de catálogo.
- **A11y:** toque ≥44, foco, leitor de tela, teclado, reduced-motion, estado desativado e contraste nos dois temas.
- **Domínio:** dados verdadeiros/fixtures marcadas, sem rating inventado, checkout, presença, escopo global, foto de IA apresentada como pessoa.
- **Integração:** primeiro aproveitar shadcn/peças existentes; componente novo entra na galeria da biblioteca, não em CSS isolado.
- **Prova:** par de capturas e fluxo real, 320/375/430/768/1440 com tema claro/escuro.

A ferramenta **não resolve sozinha** qualidade editorial, fotografia, UX, segurança ou identidade. `search` e `get_inspiration` entregam possibilidades; `get_component` entrega código; revisão e decisão continuam no processo Bivaque.

## Ferramentas de revisão

- **Impeccable** ([pbakaus/impeccable](https://github.com/pbakaus/impeccable), consulta 10/11): `init`, `document`, `critique`, `audit`, `shape`, `layout`, `adapt`, `polish`; detector determinístico de *slop*; nenhum comando foi executado neste lote remoto de docs.
- **Taste Skill** ([Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill), consulta 10/11): orientações para websites, direção de arte, fotografias licenciadas e inspeção real no browser; não importar seu hero/section grid para jornadas do app.
- **21st.dev**: busca e metadados consultados nesta análise; **nenhuma instalação, geração ou importação de código realizada**.
