# Bivaque — Rodada 22: Desapegos e Imóveis com filtros próprios

Data: 16/10/2026. Contrato: `docs/agents/tasks/HTML-022.task.yml` (R2). Base: `7dbaf552`.
Pedido do usuário: cada mercado tem o que importa, e os dois não ficam juntos. Os esqueletos
de carregamento passam para a Rodada 23.

**Veredito: PASS.**

## O que mudou

- **Duas telas próprias**, Imóveis e Desapegos, sem a aba Tudo.
  - A Início leva para cada uma: "Ver desapegos" e "Ver imóveis".
  - A busca rápida (Ctrl K) tem as duas entradas.
  - O endereço antigo `#catalogo` abre Desapegos.
  - Voltar de um anúncio leva à tela do tipo dele.
- **Imóveis (aluguel):**
  - filtros principais: tipo (apartamento, casa, casa em condomínio, flat ou studio, kitnet),
    bairro, total por mês (aluguel + condomínio) e ordem pelo total;
  - mais filtros: quartos (1+ a 4+), vagas (1+, 2+), área mínima (40 a 100 m²+) e comodidades
    (mobiliado, aceita pets, ar-condicionado, varanda, piscina, academia, portaria 24h, área
    de lazer);
  - o cartão mostra o tipo na etiqueta, quartos, área, vagas e o total com condomínio;
  - o detalhe mostra a conta do aluguel mais condomínio e as comodidades.
- **Desapegos:**
  - filtros principais: categoria, bairro, preço e ordem;
  - mais filtros: estado de uso (novo, seminovo, usado, precisa de reparo) e retirada (já
    disponível, em até 30 dias);
  - o anúncio pode ter "retirada a partir de", opcional, pensado para quem vende antes de se
    mudar;
  - o cartão e o detalhe mostram estado, categoria e retirada.
- **Editor:** imóvel exige o tipo e tem as comodidades; desapego exige categoria e estado.
- **Mais filtros:** recolhidos no celular e no tablet, com o número de filtros ativos; sempre à
  vista no desktop, em uma linha.
- **Exemplos:**
  - entraram 4 imóveis (casa, kitnet, flat, casa em condomínio) e 3 desapegos, com as fotos que
    já existiam, sem peso novo;
  - sem foto adequada, o cartão mostra o ícone;
  - os 6 anúncios antigos ganharam os atributos;
  - os exemplos entram uma vez só: um exemplo apagado não volta.
- **Cartões:** em linhas com cartões de alturas diferentes, o conteúdo agora começa no topo.
  Antes, a foto descia.

## Defeitos achados na rodada

- O botão "Mais filtros" é um componente Material que repassa o `aria-expanded` para o botão
  interno. O código passou a usar a propriedade `ariaExpanded`.
- A prova antiga da Rodada 10 esperava "Qualquer preço". Desapegos manteve esse texto; Imóveis
  diz "Qualquer valor", porque o filtro é o total do mês.
- A prova da Rodada 21 usava as abas Tudo, Desapegos e Imóveis. Ela passou para os filtros da
  Comunidade e de Salvos.

## Prova

| Prova | Resultado |
| --- | --- |
| Rodada 22 (9 verificações; 375 e 1440, claro) | PASS, 18/18 |
| Rodada 21, refeita sem as abas antigas | PASS, 10/10 |
| Rodada 10, slider de preço | PASS, 24/24 |
| Gate completo | PASS |

As provas antigas que contam anúncios ou abrem `#catalogo` com as abas rodam na bateria
completa do fechamento do lote, junto com a revisão independente. Candidato: `3a5d5fd4…`.
