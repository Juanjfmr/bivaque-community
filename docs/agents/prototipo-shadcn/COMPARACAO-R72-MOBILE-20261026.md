# Bivaque — lacunas reais do porte mobile: HTML R72 × React/shadcn

**Data:** 26/10/2026. **Veredito:** paridade móvel ainda **NÃO** atingida. **Não mesclar** o PR #116 por causa deste parecer.

## Prova nova, não somente auditoria histórica

- [Execução Playwright com pares reais](https://github.com/Juanjfmr/bivaque-community/actions/runs/40392528423) — **PASS**.
- [Baixar artefato com as 24 imagens pareadas e manifesto de origem](https://github.com/Juanjfmr/bivaque-community/actions/runs/40392528423/artifacts/12684582401).
- Gatilho: `node scripts/app/capturar.mjs --mobile-r72`.
- **Fonte esquerda**: HTML R72 histórico reconstituído pela rotina `round13Baseline`, **SHA-256 validado**: `7e7657c3652ce6daff450d8dfe5d9ce8d8eda8d6189bcd3f2317a2f25fb61d2d`.
- **Fonte direita**: `apps/app` do PR #116 sobre `codex/app`, sem modo de prova.
- Escopo: **Início, Busca, Comunidade, Imóveis × 320/375/430 × claro/escuro**. Total **24 pares**; erro de runtime **zero**. Os PNGs do mesmo enquadramento foram usados sem reconstruções por IA.
- Capturas da **primeira dobra**, não de jornadas completas; os blocos abaixo marcados 'código/histórico' não foram novamente pareados.

## Lacunas das quatro telas capturadas

| ID | Prioridade | Onde | Evidência da R72 vs React | Ação requerida |
|---|---|---|---|---|
| M01 | P0 | Início | R72 possui **carrossel horizontal** de serviços e descobertas; React empilha cartão grande, mostrando quase só um item na dobra | Recuperar o carrossel com 1 cartão e prévia do seguinte, snap/toque/teclado |
| M02 | P0 | Busca | Grade **Explorar em Manaus** com oito categorias (2 colunas) está totalmente ausente; sugestões ganharam linhas enormes | Recuperar descoberta, contagens e sugestões compactas |
| M03 | P0 | Imóveis | Sumiram **Filtros, Tipo, Total por mês, ordenar, alternar visualização** | Restaurar controles funcionais e estados preservados |
| M04 | P0 | Comunidade | Botão **Perguntar**, exibido no cabeçalho R72, não aparece no React | Recuperar CTA contextual com fluxo real |
| M05 | P1 | Comunidade | Perguntas R72 são cartões com avatar, metadados e seta; React tem texto solto e autor truncado | Reaproveitar anatomia de linha/cartão aprovado com título multiline |
| M06 | P1 | Imóveis | No React faltam condomínio, quartos, área, vagas e disponibilidade, presentes no cartão R72 | Expor resumo tipado sem inventar dados |
| M07 | P1 | Imóveis | Falta **Anunciar imóvel** no topo; R72 demo apresenta 6 imóveis, React demo 2 | Repor CTA; reconciliar fixtures sem inventar imóveis reais |
| M08 | P1 | Home/Busca | Primeira dobra do React é consumida por subtítulos e espaçamentos adicionais; menor descoberta | Otimizar densidade mobile sem sacrificar alvo de 44px |

**Exemplo de evidência:** arquivos `inicio-375-light-par.png`, `busca-320-dark-par.png`, `comunidade-320-dark-par.png`, `imoveis-375-light-par.png` no artefato.

## Lacunas fora da matriz recente — confirmadas pelo código ou auditoria anterior

| ID | Prioridade | Onde | Evidência / próximo passo |
|---|---|---|---|
| M09 | P1 | Detalhe anúncio | `apps/app/src/telas/Anuncio.tsx` ainda passa `fonte={null}` para a capa; verificar/recuperar CTA persistente do detalhe |
| M10 | P1 | Conversa, Grupo, Entrada | Auditoria histórica V07/V09/V10 registra compositor/contexto, pertencimento/regras e fluxo de entrada incompletos; **recapturar** estas rotas antes de fechar |
| M11 | P2 | Perfil | `apps/app/src/telas/Voce.tsx` usa `grid-cols-4` para indicadores no celular; referência usa 2×2 |
| M12 | P2 | Bases shadcn | Reuso de Command, DropdownMenu/AlertDialog, galerias/blocos permanece parcial; revisão S01–S03 histórica |

## O que **não** é defeito

O ADR posterior autoriza a barra inferior **Início / Comunidade / Criar / Mercado / Você** e cidade/conversas no topo, em vez da barra antiga R72; não restaurar o menu antigo para imitar pixels. Datas e contagens diferentes no cenário demo não provam falhas de produto reais. Os dados das 6 propriedades da R72 não podem ser tratados como anúncios reais da produção.

## Correção sequencial

1. **M01 + M02 + M04** — primeira dobra e descoberta: Home carrossel, Busca exploratória, Perguntar e linhas de Comunidade;
2. **M03 + M06 + M07** — listagem de imóveis com filtros, metadados, ordenação e anúncio;
3. **M09 + M10 + M11** — detalhes/conversa/grupo/entrada/perfil e nova comparação para essas rotas;
4. Consolidar componentes shadcn sem comprometer a identidade Bivaque, função dos botões, histórico, acessibilidade ou a R72 congelada.

**Critério de encerramento:** pares atualizados, inspeção visual por rota, Playwright touch/keyboard e aprovação do proprietário. O PASS do gerador de screenshots valida captura/fonte, **não** aprovação estética.
