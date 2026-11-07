---
id: ADR-20261107-recursos-inspirados-humhub
status: accepted
risk: R2
owner: Juan
approved_at: 2026-11-07 (decisão explícita do dono: "1 a 4 e 8 no lançamento")
expires_at:
linked_plan: docs/LANCAMENTO.md
critic_verdict: pass
critic_review: comparação com o HumHub (humhub/humhub, núcleo e módulos) feita pelo coordenador em 07/11
---

# Cinco recursos inspirados no HumHub entram no lançamento

## Problem

O dono pediu para listar o que dá para aproveitar do HumHub (rede social de código aberto, PHP/Yii, licença
dupla AGPL-3.0-only ou comercial) e decidir junto. O HumHub não pode ser copiado: o código AGPL obrigaria o
Bivaque a publicar o próprio código, e a pilha é outra (Next.js, React, Supabase). O que se aproveita são
modelos de produto e de regra, reescritos aqui.

## Decision

Entram no lançamento, como escopo autorizado:

1. **Painel do operador (LAN-OP)** no modelo da administração do HumHub: fila de verificação manual com
   aprovar ou recusar com motivo, decisão de denúncias (efeito e aviso sem revelar quem denunciou), suspensão
   (aplicar, efeito no app, encerrar) e registro das ações do operador.
2. **Resumo da cidade por e-mail**: perguntas novas da cidade, encontros da semana e respostas às perguntas
   do membro, com frequência escolhida nas preferências de aviso (desligado, diário, semanal), pelo outbox e
   respeitando os limites de envio.
3. **Avisos agrupados**: avisos do mesmo tipo sobre o mesmo alvo viram uma linha ("Fulano e mais 3 pessoas
   responderam"), com o destino do alvo.
4. **Grupos da cidade automáticos**: ao concluir a entrada, o membro passa a participar dos grupos oficiais
   da cidade marcados como padrão; os sugeridos continuam como sugestão. Ele pode sair depois.
5. **Tópicos nas perguntas da cidade**: etiquetas de uma lista fechada (por exemplo moradia, escola, saúde,
   serviços, transporte) escolhidas ao perguntar, usadas para filtrar a lista e a busca.

Ficam como cartões para depois do lançamento: menções, papéis de moderador no grupo, bloqueio dentro do grupo,
arquivar conteúdo, atualização ao vivo, tour de primeiro uso e novo aceite quando os termos mudarem.

Não entram: diretório de membros (expõe quem é militar; BLOCK-AFFILIATION), amizade e seguir pessoas,
enquetes (fora do LANCAMENTO), wiki (o Guia cumpre), campos de perfil configuráveis (ADR de perfil),
LDAP/SSO/API/importação/tradução.

## Alternatives

1. Adotar o HumHub como plataforma — rejeitado: outra pilha, AGPL e perderia o que já está ligado.
2. Copiar trechos — rejeitado: AGPL contamina o código do Bivaque.
3. Só os itens 1 e 2 — rejeitado pelo dono, que quis também 3, 4 e 8.
4. **Escolhida:** cinco recursos reescritos no molde das jornadas, sem código do HumHub.

## Risks and reversal

- O resumo por e-mail aumenta o volume de envio: respeita o limite global de envio e a preferência de canal;
  desligado por padrão até o membro escolher, ou semanal por padrão — decisão de implementação registrada no
  cartão (padrão sugerido: semanal, com descadastro em um toque).
- Grupos automáticos: o membro pode sair; nenhum grupo fechado entra no automático.
- Reverter qualquer item é desligar a funcionalidade; nenhum dado pessoal novo é coletado.
