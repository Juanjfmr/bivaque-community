---
id: ADR-20260815-guia-curadoria-ia
status: proposed
risk: R3
owner: Juan
approved_at:
expires_at:
linked_plan:
critic_verdict: pending
critic_review:
---

# Curadoria do Guia de Chegada por IA, com aprovação humana

## Problem

O Guia de Chegada é a superfície municipal com a propriedade que o feed não tem: referência
permanente. A resposta certa para "qual colégio aceita transferência no meio do ano" não
muda, e um feed enterra essa resposta em semanas.

A curadoria manual, porém, depende de um operador que leia respostas de indicação, extraia
nome, categoria, descrição e contato, e publique um por um. Em dezembro, com a transferência
das três forças, a demanda cresce junto com a chegada de pessoas; um operador solo é o
gargalo exato que o produto existe para eliminar.

A resposta da comunidade já é a matéria-prima: quem indica diz qual serviço, por quê, e
frequentemente deixa o contato. O trabalho de curadoria é **extração e conferência**, não
geração de conteúdo.

## Decision

Reabrir a D31 apenas para o Guia de Chegada e adotar o fluxo **IA sugere → operador aprova**.

1. As respostas de indicação passam a ser o gatilho da curadoria — quando a onda F existir.
2. Um modelo externo (`DeepSeek-V4-Flash`) recebe **somente o texto já tratado** e devolve
   JSON estruturado com `category`, `name`, `description`, `website_url`, `phone` e
   `confidence`.
3. A saída é gravada como **entrada pendente** do guia. Ela nunca aparece para os membros
   antes de um operador aprovar.
4. O operador revisa numa fila dedicada, aprova ou rejeita com nota, e a versão aprovada
   passa a ser a única leitura pública.
5. Nenhuma chamada externa acontece enquanto a governança LGPD e a chave/contrato do
   fornecedor não estiverem fechados. A base local (fila, parser, sanitização) pode ser
   construída antes.

## Alternatives considered

1. **Curadoria 100% manual.** Sem risco de modelo, mas escala zero e é a primeira coisa a
   ser abandonada na janela de dezembro.
2. **Regras determinísticas.** Baratas e auditáveis, mas não extraem nome de serviço e
   contato de texto livre em português; a qualidade da referência cai exatamente no que a
   torna valiosa.
3. **IA publica direto.** Máxima velocidade, e inaceitável: o guia é referência de saúde,
   escola e mudança, com consequência real; alucinação não pode sair sem um humano no meio.
4. **IA sugere, operador aprova** — a escolhida. Mantém escala e coloca a responsabilidade
   final no operador.

## Market or reference baseline

- Nextdoor e plataformas locais curam manualmente recomendações de negócios.
- Sistemas de moderação assistida (revisão humana sobre sugestão de modelo) são o padrão
  quando a saída tem efeito real: anúncios, conteúdo de saúde e listas públicas.
- Não há baseline público de curadoria automática sem revisão em produto comunitário de
  saúde e educação.

## Proposed divergence from baseline

Divergimos do Nextdoor ao usar extração de modelo sobre resposta de comunidade, e não apenas
formulário do prestador. Convergimos com o padrão de moderação assistida: o modelo reduz
custo, o humano detém a decisão.

## Evidence and sources

- D31 adia IA no `docs/BIVAQUE.md`.
- `docs/PRODUCT_STATUS.md` aponta o guia como rota já existente, com curadoria via
  `service_role`.
- `supabase/migrations/20260802001100_recommendations.sql` define
  `recommendation_replies`; a onda F precisa expor esse ciclo para que a curadoria tenha
  gatilho.
- Viabilidade técnica do modelo: adequado para extração estruturada com `temperature` baixa
  e contrato de saída JSON.

## Benefits

- O guia deixa de depender de curadoria manual em lote.
- A comunidade alimenta o ativo mais durável do piloto sem virar feed.
- O operador ganha uma fila auditável, com origem e confiança da sugestão.

## Risks

- **LGPD / dado para terceiro.** Texto de indicação pode conter CPF, endereço, e-mail e
  telefone de pessoa física. Enviar sem tratamento é transferência internacional de dado
  pessoal.
- **Alucinação.** Modelo inventa nome, telefone ou site. Mitigação: nunca publicar sem
  aprovação, validar URL/telefone e registrar `confidence`.
- **Prompt injection.** Texto da resposta é entrada do usuário. Mitigação: sanitizar,
  limitar comprimento e tratar o modelo como extrator, não como oráculo.
- **Dependência de fornecedor.** A D31 só reabre para este escopo; o resto de IA permanece
  adiado.
- **Qualidade da fonte.** Resposta de indicação pode ser vaga ou interessada. O operador é
  a segunda barreira.

## Reversal cost

Médio. Remover a fila não apaga itens aprovados; desligar a integração devolve a curadoria
ao manual. O custo real é o retrabalho de governança e a confiança se uma sugestão ruim for
publicada.

## Requisitos antes de aprovar a chamada externa

1. **Governança LGPD publicada** — controlador, finalidade, base legal, retenção,
   eliminação, direitos do titular, canal de contato e resposta a incidente.
2. **Contrato e chave do fornecedor** com retenção/treinamento declarados e endpoint fixo.
3. **Sanitização de PII** antes do envio e teste unitário que prove o que sai e o que não
   sai.
4. **Fila de aprovação operacional** com status, origem, `confidence`, revisor e nota.
5. **Onda F implementada** para que as respostas de indicação existam no produto, não só no
   banco.

## Success metric

Percentual de sugestões aprovadas sem edição e tempo do operador por item aprovado. Se o
índice de rejeição por alucinação passar de 20%, o modelo é recalibrado ou o fluxo volta a
manual.

## Reopen condition

Qualquer item falso publicado, qualquer incidente LGPD, mudança de política do fornecedor,
ou decisão do dono de encerrar o piloto de curadoria.

## Approval

Direção aprovada pelo dono em 2026-08-15. A **chamada externa** continua bloqueada até os
cinco requisitos acima. Este ADR permanece `proposed` até a aprovação explícita do critic e
o registro da data no frontmatter.
