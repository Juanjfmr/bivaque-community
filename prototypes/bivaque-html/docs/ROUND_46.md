# Bivaque — Rodada 46: blocos no resto do app

Data: 17/10/2026. Contrato: `docs/agents/tasks/HTML-046.task.yml` (R1). Base: `ce620405`.
Lote de volume. Maquete aprovada junto com a Rodada 45. Referência da busca: Nextdoor, no Mobbin.

**Veredito: PASS.**

## O que mudou

- **Em blocos de 24**, com a contagem e o carregamento ao rolar da Rodada 45:
  - Comunidade: indicações (o fim tem "Não achou sua dúvida? Perguntar") e a aba Negócios;
  - busca de grupos;
  - Conversas, Salvos (anúncios e negócios) e Meus anúncios.
- **Feed dos grupos em blocos de 10:** publicações são altas; "Mostrar mais 10".
- **Busca:**
  - em "Tudo", cada tipo mostra os primeiros (4 anúncios, 4 negócios, 5 indicações, grupos ou
    encontros) e termina em "Ver todos os N anúncios";
  - "Ver todos" filtra pelo tipo, e a lista filtrada vem em blocos;
  - nas indicações filtradas, o fim oferece "Perguntar".
- **Listas curtas** continuam iguais.

## Medida (cidade grande, celular médio)

| Tela | Antes do lote | Depois da R46 |
| --- | --- | --- |
| Comunidade | 2,4 s, 64 telas | 0,3 s, 5 telas |
| Busca "sofa" | 1,3 s, 45 telas | 0,25 s, 2,5 telas |
| Feed de um grupo | 57 telas | 5,6 telas |
| Conversas | 1,3 s | 0,46 s |
| Meus anúncios | 1,5 s | 0,8 s |
| Salvos | 0,7 s | 0,6 s |

## Prova

| Prova | Resultado |
| --- | --- |
| Rodada 46 (5 verificações; 375 e 1440, claro) | PASS, 10/10 |
| Rodadas 10, 44 e 04 (busca e Comunidade) | PASS, 24/24, 12/12 e 28/28 |
| Gate (lint, tipos, testes, segredos) | PASS |
