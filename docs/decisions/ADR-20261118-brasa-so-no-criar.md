# ADR-20261118 — Brasa só no Criar; concluir é ardósia

- Status: Aceito
- Data: 18/11/2026
- Decide: o coordenador, sob o mandato do lançamento (02/11)

## Contexto

A revisão às cegas de F09 e F10 (18/11) apontou a Brasa em ações que não são criar: "Enviar",
"Enviar denúncia", "Tentar de novo", "Mudar de cidade" e um chip selecionado. Duas fontes vivas se
contradizem:

- [IDENTIDADE-DAS-PECAS.md](../agents/regua-nextdoor/IDENTIDADE-DAS-PECAS.md), alinhada ao
  [ADR da paleta fria](ADR-20261102-paleta-fria.md): concluir é ardósia (`--acao`), uma vez por tela;
  Brasa só no "começar a criar" (FAB e Criar da barra, `--pc-criar`); seleção é tinta.
- Comentários e a galeria em `apps/app/src/pecas/` (`pecas.css`, `pecas.tsx`, `GaleriaDePecas.tsx`):
  "Brasa só na ação principal da tela", texto anterior à paleta fria. O token `--pc-acao` já aponta
  para `--acao` (ardósia); a Brasa volta à tela pelas variantes `brasa` de `components/bivaque/botao.tsx`
  e `components/ui/button.tsx` e por usos diretos.

## Opções

1. **Seguir a IDENTIDADE: Brasa só no Criar, concluir em ardósia (escolhida).** É a regra mais nova,
   amarrada ao ADR da paleta, igual ao Nextdoor (verde só no Post) e já é o valor de `--pc-acao`.
2. Reescrever a IDENTIDADE para "Brasa na ação principal de cada tela". Mantém o código como está, mas
   espalha a cor de marca por toda tela e contradiz o ADR da paleta.
3. Deixar as duas regras e julgar caso a caso. Mantém o revisor e o executor sem critério.

## Decisão

Brasa aparece só no começar a criar (FAB e Criar da barra). A ação de concluir de cada tela é ardósia
(`--pc-acao`), uma vez por tela; seleção é tinta; erro e "tentar de novo" seguem a peça de aviso, sem
Brasa. Os textos de `apps/app/src/pecas/` e da galeria passam a dizer o mesmo no lote que troca as
variantes nas telas. Nenhuma tela nova usa a variante `brasa` fora do Criar.

## Consequências

- O lote de correção de F09/F10 troca a Brasa pela ardósia nas telas apontadas e corrige os textos das
  peças; uma varredura de teste impede a variante `brasa` fora da casca do Criar.
- Não é R3: não entra em RATIFICACAO.md.
