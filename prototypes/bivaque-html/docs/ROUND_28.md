# Bivaque — Rodada 28: o que o selo "verificado" significa

Data: 16/10/2026. Contrato: `docs/agents/tasks/HTML-028.task.yml` (R1). Base: `2e602fc8`.
Último item do lote B. Referência do Mobbin: folha "Freshness guaranteed" da Glovo.

**Veredito: PASS.**

## O que mudou

O selo "Perfil verificado" do anúncio e a linha de verificação da página do negócio agora
abrem uma explicação, tanto pelo toque quanto pelo teclado. O texto segue o
ADR-20260816-forma-da-admissao:

- **Vínculo com as Forças conferido:** o Bivaque confere em fonte pública oficial (Portal da
  Transparência) que a pessoa é militar, veterana ou pensionista. Os dados consultados não
  ficam guardados; fica só o resultado.
- **O resto é declarado pela pessoa:** nome, cidade e bairro. O selo não confirma endereço.
- **O anúncio é de quem anuncia:** preço, estado do item e condições do imóvel são
  responsabilidade de quem publica. O selo não é garantia de negócio.
- **Combine com cuidado:** ver pessoalmente, em lugar movimentado, sem pagar adiantado, e usar
  "Denunciar".

A folha também avisa que, neste protótipo, a verificação é simulada. Ao fechar, o foco volta ao
selo.

## Prova

| Prova | Resultado |
| --- | --- |
| Rodada 28 (2 verificações; 375 e 1440, claro) | PASS, 4/4 |
| Gate completo | PASS |

Fecha o lote B. A revisão única, a bateria completa, a aprovação visual e o deploy vêm em
seguida.
