---
id: ADR-20261022-localizacao-padrao-de-mercado
status: accepted
risk: R3
owner: Juan
approved_at: 2026-10-22
accepted_at: 2026-10-22
expires_at:
linked_plan: docs/AUDITORIA_ADERENCIA_2026-10-19.md (seção 6, lote 7)
critic_verdict: PASS
critic_review: Decisão do dono em 22/10/2026, depois da comparação com OLX, Zap, VivaReal, QuintoAndar e iFood. Desenho e fornecedor aprovados na mesma conversa.
---

# Localização no padrão de mercado: o rigor do Bivaque fica na entrada

## Problem

O Bivaque proibia guardar CEP e coordenada (Lote Bairros, R66 a R68) e o endereço residencial do membro
(`AGENTS.md`). A localização ficava só no nome do bairro. Isso custa cinco coisas:

1. A "Distância de mim" é aproximada: vai de centro de bairro a centro de bairro, e erra 2 a 3 km nos bairros
   grandes.
2. O mapa mostra bairro, não o imóvel.
3. O bairro escolhido não é conferido.
4. Não existe "perto da minha unidade".
5. A demanda só é vista por bairro.

O dono decidiu, em 22/10/2026, que **o rigor de segurança do Bivaque está na entrada**: só entra quem tem o vínculo
confirmado. Lá dentro, entre membros verificados, o produto funciona no padrão de mercado.

## Decision

1. **Anúncio de imóvel.**
   - O CEP é obrigatório. Cidade e bairro vêm dele, validados, e o membro pode corrigir o bairro para um vizinho.
   - O imóvel ganha coordenada (latitude e longitude), geocodificada a partir do CEP e, se houver, do endereço que
     o anunciante publicar (ADR-20260925-endereco-por-escolha).
   - O anunciante escolhe como aparece no mapa: **local exato** ou **aproximado**. O aproximado é a coordenada
     arredondada para cerca de 300 a 500 m.
   - O endereço continua sendo escolha do anunciante.
2. **Anúncio de desapego.** O CEP é opcional. Com CEP, ele ganha coordenada aproximada para a distância e o mapa.
   Sem CEP, aparece na cidade e no bairro escolhido.
3. **Pedido de serviço.** O CEP é opcional e serve para a distância até o prestador e para o atendimento por
   bairro.
4. **Perfil do membro.**
   - O CEP é opcional e serve de origem para a "Distância de mim".
   - A coordenada do perfil é guardada **só no banco**, para o cálculo, e **nunca é mostrada a ninguém**.
   - Os outros membros veem, no máximo, o bairro, conforme a chave "Mostrar meu bairro".
5. **Unidade militar declarada, para distância.**
   - O membro pode declarar a sua unidade (OM). Ela vem de um catálogo de unidades com localização pública e serve
     de segunda origem para a distância: "perto da minha unidade".
   - A unidade é usada **só para os cálculos da própria pessoa**. Mostrá-la aos outros continua sendo a decisão
     pendente da exposição da afiliação (`BLOCK-AFFILIATION` e ADR-20260811-om-declarada).
6. **Operação.** Mapas de calor e demanda por região, com agregação mínima por área (sem ponto individual), para o
   painel do Bivaque.
7. **Geocodificação.**
   - Primeiro a **BrasilAPI (CEP v2)**, que é grátis.
   - Quando ela não tiver a coordenada, o **Google Maps Geocoding**.
   - A chave fica só no servidor, e a chamada parte do servidor.
   - O resultado é guardado junto do item para não repetir a consulta.
8. **Catálogo de bairros.** A malha oficial de bairros do IBGE (Censo 2022), carregada uma vez, substitui a lista
   feita à mão. Ela alimenta o filtro e o mapa por bairro.

**O que continua proibido:** guardar o CPF bruto, o retorno do Portal, posto e os documentos de identidade fora do
fluxo de verificação, como diz o `AGENTS.md`.

Este ADR substitui:

- a regra "CEP e coordenadas nunca são gravados" do Lote Bairros (R66 a R68) e do
  ADR-20261022-fundacao-dados-bairros-ocultar-chamados, seção 1.4;
- a parte "residential address" do `AGENTS.md`, que passa a permitir o CEP e a coordenada do perfil para cálculo,
  sem exibição.

## Alternatives considered

- **Manter só o bairro.** Rejeitada pelos cinco problemas acima.
- **Coordenada do imóvel sem a do perfil.** Rejeitada: a "Distância de mim" continuaria aproximada na ponta de
  quem procura.
- **Geocodificar só com Google.** Rejeitada no início, pelo custo; ele entra como reserva.

## Market or reference baseline

- **OLX:** pede o CEP no anúncio e mostra bairro e cidade.
- **Zap e VivaReal:** guardam o endereço e a coordenada, e o anunciante escolhe mostrar o local exato ou só a
  região.
- **QuintoAndar:** mapa com localização aproximada.
- **iFood:** guarda o endereço e a coordenada do cliente.

## Proposed divergence from baseline

Nenhuma, salvo a coordenada do perfil, que nunca é exibida.

## Evidence and sources

- Conversa de 22/10/2026 com o dono.
- `prototypes/bivaque-html/src/shell/hood-picker.js`.
- ADR-20261016-mapa-de-bairros (MapLibre, OpenFreeMap e a malha do IBGE).

## Benefits

- Distância e mapa precisos.
- Bairro validado.
- "Perto da unidade".
- Leitura de demanda para a operação.

## Risks

- **A localização do perfil é dado pessoal.** Por isso ela fica fora de toda leitura de outro membro, com grant por
  coluna e prova pgTAP, e sai na exclusão da conta.
- **Custo do Google se a BrasilAPI falhar muito.** É medido no piloto, e há cache por CEP.
- **Precisão do aproximado.** O arredondamento é de cerca de 300 a 500 m, nunca menos.

## Reversal cost

Médio. Colunas novas e dados geocodificados; apagar volta ao bairro.

## Success metric

- A "Distância de mim" tem erro abaixo de 300 m no imóvel com local exato.
- Nenhuma leitura de outro membro devolve a coordenada ou o CEP do perfil (pgTAP).

## Reopen condition

Reabrir se houver incidente com localização, ou se o custo da geocodificação passar do previsto.
