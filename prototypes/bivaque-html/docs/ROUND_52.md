# Bivaque — Rodada 52: Negócios e planos, Pessoas e equipe

Data: 17/10/2026. Contrato: `docs/agents/tasks/HTML-052.task.yml` (R2: guarda o nome de quem é
convidado). Base: `ee09174a`. Lote do painel do dono.

**Veredito: PASS.**

## O que mudou

- **Negócios e planos** (`#dono/negocios`):
  - planos pagos, receita do mês, patrocinados e pedidos de orçamento, por cidade;
  - "Vencem em 7 dias", com "Lembrar" (fica no registro; nenhuma mensagem real sai);
  - todos os negócios, com plano, indicações e situação ("Com responsável" ou "Aguardando
    responsável"); o nome abre a página do negócio no app.
- **Receita coerente:** a da visão geral e a de Negócios e planos saem do mesmo cálculo (planos
  dos negócios do protótipo e os de exemplo das outras cidades): R$ 4.870 em todas, R$ 978 em
  Manaus.
- **Pessoas e equipe** (`#dono/equipe`):
  - moderação com a carga de cada um (o que você assumiu nas filas aparece aqui);
  - embaixadores por cidade e convites enviados;
  - "Convidar moderador", com nome e cidade.
- **"O que mudou"** leva às páginas: planos vencendo → Negócios e planos; Brasília → Cidades.

## Prova

| Prova | Resultado |
| --- | --- |
| Rodada 52 (5 verificações; 375 e 1440, claro) | PASS, 10/10 |
| Rodadas 49 a 51 | PASS, 14/14, 8/8 e 8/8 |
| Gate (lint, tipos, testes, segredos) | PASS |

Capturas: `.visual/bivaque-html-round52/telas/`.

## Fechamento do lote do Painel do Bivaque (rodadas 49 a 52)

Duas revisões para o lote todo: a própria e uma independente do GPT (via Codex, só leitura), e a
bateria completa (375 claro, 768 claro e 1440 escuro).

### Correções das revisões

| Origem | Severidade | Problema | Correção |
| --- | --- | --- | --- |
| Própria | Alta | Anúncio ou pergunta removidos ainda abriam por Salvos e pelo endereço | Página "removido pela moderação"; somem de Salvos |
| Própria | Alta | Decisão presa ao conteúdo: denúncia nova do mesmo anúncio nunca voltava | Grupos só com denúncias abertas; decidir fecha o grupo |
| GPT | Alta | Id da denúncia vinha do relógio: com o tempo andando, Revisar e Assumir falhavam | Id vem da denúncia mais antiga do grupo |
| GPT | Alta | Pergunta removida ainda aparecia em Minhas perguntas e nas origens do negócio | Filtrada nos dois lugares |
| Própria | Média | Remover sem efeito em proposta, pedido e página | Remover só onde há efeito; o resto, dispensar |
| Própria | Média | Aba vazia presa; foco perdido depois de decidir; carga da equipe errada; números de exemplo contraditórios; avisos diziam "enviado" | Corrigidos; avisos dizem "registrado (modo teste)" |
| GPT | Média | Desfazer uma dispensa antiga reabria denúncia de conteúdo já removido | Bloqueado com aviso |
| GPT | Média | Filtro por cidade recriava perguntas paradas já tratadas | Decisão e responsável por cidade |
| GPT | Média | Proposta e pedido denunciados sem contexto | Mostram o conteúdo e abrem o pedido |
| GPT | Média | Pedidos de orçamento iguais em toda cidade; catálogo de planos diferente do app; plano ativado no app ignorado | Por cidade; catálogo e preços do app; plano do app conta |

### Pego pela bateria

- R03: sem resultado (coincidiu com a geração de uma maquete); passou sozinha.
- R50: a prova usava o limite de 720 px; o console troca a navegação em 1024 px.

Base visual nova em [VISUAL_BASELINE_R52](VISUAL_BASELINE_R52.md).
