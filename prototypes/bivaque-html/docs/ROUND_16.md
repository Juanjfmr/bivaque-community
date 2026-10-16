# Bivaque — Rodada 16: comparar propostas lado a lado

Data: 15/10/2026. Contrato: `docs/agents/tasks/HTML-016.task.yml` (R3, ligado ao
ADR-20261015). Base: `5e4fc77a`. Terceiro item da ordem aprovada pelo usuário.

**Veredito: PASS.**

## O que mudou

No pedido de serviço de quem pediu, as propostas aparecem **lado a lado**:

- **Linhas alinhadas.** As mesmas linhas aparecem em todas as colunas e se alinham por
  subgrid:
  - empresa e indicações;
  - selos;
  - valor;
  - data disponível, execução e validade;
  - mensagem;
  - ações.
- **Selos.**
  - "Menor valor" marca o menor preço; numa faixa conta o mínimo, e "a combinar" fica
    de fora.
  - "Mais cedo" marca a data disponível mais próxima.
  - Só aparecem quando diferenciam: num empate total, nenhuma coluna ganha selo.
- **Ordenar por.** As opções são "Chegada" (o padrão), "Menor valor" (com "a combinar" no
  fim) e "Mais cedo". A ordenação vale só para o pedido em que foi escolhida e só aparece
  com o pedido ativo e mais de uma proposta. O ADR proíbe ranking pago (P6).
- **Ações.** Cada coluna tem "Escolher", "Ver empresa" e "Denunciar", com nomes acessíveis
  que incluem a empresa. Depois da escolha, a escolhida fica em destaque e as outras ficam
  tracejadas, sem perder contraste.
- **Celular.** Os cartões rolam para o lado e param um de cada vez.

O lado do prestador não muda.

## Revisão independente

Aprovada, sem CRITICAL ou HIGH.

- **MEDIUM corrigido:** num empate total, todas as colunas ganhavam o selo.
- **MEDIUM corrigido:** a ordenação escolhida num pedido valia também nos outros.
- **MEDIUM corrigido:** as colunas recusadas ficavam com opacidade 0,6, e os botões perdiam
  contraste. Agora só o fundo e a borda mudam.
- **LOW corrigidos:**
  - cada coluna tem nome para leitor de tela;
  - "Denunciar" diz de qual empresa é;
  - a área de rolagem tem nome e foco visível;
  - a sombra da escolhida não é mais cortada;
  - saiu uma variável sem uso.
- **Lacunas de prova fechadas:** empate total, ordenação vazando entre pedidos, pedido com uma
  proposta, pedido cancelado e texto com HTML.

## Prova

| Prova | Resultado |
| --- | --- |
| Rodada 16 (9 verificações; 375, 768, 1024 e 1440, claro e escuro) | PASS, 54/54 |
| Rodada 11 (pedido e propostas) | PASS, 78/78 antes da revisão; 13/13 depois |
| Rodadas 12 e 01 | PASS |
| Gate completo | PASS |

Candidato: `b975e08f…`. A bateria completa e o novo congelamento visual acontecem no
fechamento do lote.
