# Bivaque — Rodada 41: folhas com alturas de parada

Data: 17/10/2026. Contrato: `docs/agents/tasks/HTML-041.task.yml` (R2). Base: `9397e840`.
Lote mobile 2. Maquete aprovada pelo usuário: "Sim, como na maquete" para a folha do bairro e
"Sim, mais sutil" para o fundo que encolhe. Referências: Vaul (pontos de parada e fundo que
encolhe); Swiggy e Mindtrip, no Mobbin.

**Veredito: PASS.**

## O que mudou

- **Folha do bairro sobre o mapa, no celular:**
  - tocar num marcador abre uma folha baixa, com uma linha compacta (foto, preço, título,
    quartos e área), e o mapa continua à vista e tocável;
  - o puxador (ou arrastar o topo da folha) leva à metade, com cartões, e à tela cheia, com
    grade de cartões;
  - arrastar a folha baixa para baixo fecha;
  - o marcador escolhido fica em destaque e o mapa o centraliza acima da folha;
  - outro marcador troca o bairro;
  - Esc, "Ver só este bairro na lista" e sair do mapa fecham a folha;
  - salvar um anúncio na folha atualiza o botão sem remontar o mapa.
- **Desktop e tablet:** continuam com o diálogo do bairro.
- **Fundo que encolhe:** no celular, enquanto uma folha que sobe de baixo está aberta, a página de
  trás encolhe um pouco (96,5%) e desce 8 px. Não vale para a gaveta de controles nem para a
  entrada em tela cheia, e com movimento reduzido acontece sem transição.
- **Defeito antigo corrigido (Rodada 31):** no celular, o enquadramento fixo do mapa deixava
  Ponta Negra fora da tela. Agora o mapa enquadra todos os bairros com anúncio ao carregar.

## Prova

| Prova | Resultado |
| --- | --- |
| Rodada 41 (5 verificações; 375 e 1440, claro) | PASS, 10/10 |
| Rodada 31 (mapa), adaptada para a folha do celular | PASS, 12/12 |
| Rodada 07 (movimento e diálogos) | PASS, 16/16 |
| Gate completo | PASS |

Capturas: `.visual/bivaque-html-round41/telas/`. Maquete: `.visual/bivaque-html-sheets/`.
