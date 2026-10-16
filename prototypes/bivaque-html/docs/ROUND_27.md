# Bivaque — Rodada 27: anúncio de imóvel em etapas

Data: 16/10/2026. Contrato: `docs/agents/tasks/HTML-027.task.yml` (R2). Base: `8ff985ac`.
Terceiro item do lote B. Referência do Mobbin: fluxo "Listing a product" do eBay, com uma
decisão por tela e revisão antes de publicar. Para o desapego, a referência foi o Depop, que
fica numa página só.

**Veredito: PASS.**

## O que mudou

- **Imóvel novo em 5 etapas:**
  1. o imóvel: tipo, título, bairro, quartos, área e vagas;
  2. valores e disponibilidade: aluguel, condomínio e data, com a nota de que quem procura vê
     o total do mês;
  3. comodidades e descrição;
  4. fotos;
  5. revisão.
- **Navegação entre as etapas:**
  - barra de progresso e "Etapa 2 de 5 · Valores e disponibilidade", anunciada ao leitor de
    tela;
  - "Continuar" só avança com a etapa válida, e o foco vai para o campo que falta;
  - "Voltar" preserva o que foi digitado.
- **Revisão:**
  - prévia do cartão exatamente como quem procura vai ver, com o total do mês, os detalhes,
    as comodidades e as fotos;
  - "Editar" em cada parte leva de volta à etapa certa.
- **Publicar e salvar rascunho:**
  - "Salvar rascunho" funciona em qualquer etapa, e o rascunho de imóvel reabre nas etapas;
  - publicar com algum campo inválido leva à etapa onde ele está.
- **Fora das etapas:** editar um imóvel já publicado e anunciar desapego continuam numa página
  só, que é mais rápido para quem só quer mudar um campo ou vender algo simples.
- Os campos e o que é salvo não mudaram.

## Provas antigas ajustadas

As Rodadas 03, 22 e 23 publicavam imóvel preenchendo todos os campos de uma vez. Agora elas
passam pelas etapas com um ajudante comum (`scripts/bivaque-html/wizard-helpers.mjs`). A
Rodada 03 também prova que a etapa 1 sem quartos e área não deixa seguir.

## Prova

| Prova | Resultado |
| --- | --- |
| Rodada 27 (7 verificações; 375 e 1440, claro) | PASS, 14/14 |
| Rodadas 03, 22 e 23, ajustadas | PASS: 36/36, 12/12, 28/28 |
| Gate completo | PASS |
