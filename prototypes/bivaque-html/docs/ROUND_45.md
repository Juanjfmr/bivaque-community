# Bivaque — Rodada 45: listas longas em blocos

Data: 17/10/2026. Contrato: `docs/agents/tasks/HTML-045.task.yml` (R1). Base: `797eb83f`.
Lote de volume. Maquete aprovada: "Sim, como na maquete", com blocos de 24. Referências:
Etsy, Nextdoor e Airtasker, no Mobbin.

**Veredito: PASS.**

## Por que

A sonda de volume (`.visual/bivaque-html-volume/probe.mjs`) multiplica os dados de exemplo só no
navegador do teste. Numa cidade grande (1.200 anúncios, 300 negócios), com o processador 4 vezes
mais lento para imitar um celular médio, Imóveis levava 9,0 s e Desapegos 9,5 s para abrir, porque
todas as listas eram desenhadas de uma vez.

## O que mudou

- **Blocos de 24** em Imóveis, Desapegos e Negócios (os patrocinados continuam à parte):
  - abaixo do bloco, "Mostrando 24 de 654 desapegos", uma barra de progresso e "Mostrar mais 24";
  - 600 px antes do fim, o próximo bloco entra sozinho, com dois cartões de espera;
  - o botão fica como reserva para teclado, leitor de tela e navegador sem o observador de rolagem;
    pelo botão, o foco vai ao primeiro cartão novo;
  - o bloco novo é acrescentado sem redesenhar a tela.
- **Memória por lista e filtro:** voltar de um anúncio devolve a mesma quantidade e a mesma
  posição; trocar filtro, ordenação, cidade ou a busca de Negócios recomeça do primeiro bloco.
- **Fim da lista:** "Você viu os 654 desapegos" e um cartão para quem não achou: "Filtrar" sem
  filtros, "Avise-me" com filtros e sem alerta e, em Negócios, "Pedir" orçamento.
- **Listas curtas** (até 24) ficam como estavam: sem contagem nem cartão de fim.

## Medida (cidade grande, celular médio)

| Tela | Antes | Depois |
| --- | --- | --- |
| Imóveis | 9,0 s | 0,28 s |
| Desapegos | 9,5 s | 0,54 s |
| Salvar um anúncio em Desapegos | 5,4 s | 0,77 s |

Negócios ainda leva 1,3 s porque a sonda marca 1 em cada 17 negócios como patrocinado (18 cartões
fora dos blocos); Comunidade, busca, grupos, Conversas e Salvos ficam para a Rodada 46.

## Prova

| Prova | Resultado |
| --- | --- |
| Rodada 45 (8 verificações; 375 e 1440, claro) | PASS, 16/16 |
| Sonda de volume | Imóveis e Desapegos abaixo de 1,5 s |
| Gate completo | PASS |

Capturas: `.visual/bivaque-html-round45/telas/`. Maquete: `.visual/bivaque-html-volume/`.
