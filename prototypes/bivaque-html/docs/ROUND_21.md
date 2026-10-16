# Bivaque — Rodada 21: filtros com indicador deslizante

Data: 16/10/2026. Contrato: `docs/agents/tasks/HTML-021.task.yml` (R1). Base: `7545bcfa`.
Oitavo item da ordem aprovada. Referência: Animated Tabs, do 21st.dev.

**Veredito: PASS.**

## O que mudou

- **Pílula deslizante** nos filtros de escolha única: desapegos e imóveis, negócios,
  comunidade, grupos, salvos, meus anúncios e busca.
  - O fundo do filtro escolhido vira uma pílula única, que desliza do filtro anterior para o
    novo em 0,32 s.
  - Com movimento reduzido, a pílula salta direto.
  - Sem JavaScript, ou antes de medir, o chip escolhido mantém o próprio fundo.
  - Seleção, check e leitura do leitor de tela continuam no chip; a pílula fica oculta para o
    leitor.
  - A pílula acompanha mudanças de largura.
- **Teto de tamanho:**
  - o limite agora vale para o que o celular baixa (gzip, como a Vercel entrega), com 2 MB;
  - antes valia para o arquivo bruto, com 3 MB, um número escolhido na Rodada 13 sem pedido do
    usuário;
  - hoje são 2,98 MB brutos e cerca de 1,80 MB transferidos;
  - a trava do pacote Material continua igual.

## Defeito achado pela prova

A pílula saltava em vez de deslizar: o observador de tamanho avisa uma vez ao começar e
reposicionava sem animação. Agora ele só reposiciona quando a medida muda.

## Prova

| Prova | Resultado |
| --- | --- |
| Rodada 21 (5 verificações; 375 e 1440, claro) | PASS, 10/10 |
| Rodada 09, peso e pacote Material | PASS |
| Gate completo | PASS |

Pelo método enxuto, a revisão independente e as provas antigas rodam no fechamento do lote.
Candidato: `18ea2670…`.
