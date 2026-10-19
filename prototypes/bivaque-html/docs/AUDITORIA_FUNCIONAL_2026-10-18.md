# Bivaque — auditoria funcional do protótipo antes do back-end

Data: 18/10/2026. Base congelada: Rodada 56 (`19df283b…`). Pedido do usuário: identificar caminhos
sem saída, páginas órfãs e o que deveria funcionar e não funciona, tirando o que depende do back-end.

## Como foi feita

- **Varredura no navegador** (`scripts/bivaque-html/audit-crawl.mjs`): todas as rotas (inclusive o
  Painel do dono e as etapas da entrada sem login), cada ação da tela e, um nível abaixo, cada ação
  dos diálogos que ela abre, sempre partindo do mesmo estado. 375 e 1440 px: 1.372 cliques.
  Relatórios em `.visual/bivaque-html-audit/audit-375.json` e `audit-1440.json`.
- **Leitura do código pelo Codex (GPT)**, com o mesmo pedido.
- A segunda leitura pelo OpenCode não foi possível: as contas DeepSeek e OpenCode Go estão sem saldo,
  o Kimi K3 da Nvidia foi descontinuado em 15/10 e a chave do Google é inválida.
- Os achados abaixo foram conferidos no navegador ou no código. Ficaram de fora os falsos positivos
  (formulário vazio mostra "Preencha este campo."; aba já selecionada; ações de deslizar).

## O que está bem

Nenhum erro de JavaScript, nenhum diálogo sem saída (todos fecham com Esc ou botão), nenhum link
para "Página indisponível". Anúncios têm publicar, editar, encerrar e excluir completos.

## A. Caminhos quebrados ou sem saída (conferidos)

1. **Aviso de proposta não abre o pedido.** `noticeDestination` (`features/profile/demo-actions.js:29`)
   não conhece `pedido` nem `pedidos`; o aviso criado por `simulateProposals`/`requestDeclinedNotice`
   (`features/requests/model.js:28-30`) não leva a lugar nenhum. A varredura também não alcançou a
   página `pedido` por nenhum caminho.
2. **"Confirmado" no próprio encontro não faz nada**, sem aviso (`app/handlers.js:31`, `e.mine`).
3. **Interesse no próprio anúncio** pelo menu de toque longo cria conversa consigo mesmo e conta como
   interessado (`contact()` em `features/messaging/actions.js` não recusa `mine`).
4. **Política de privacidade e Código de conduta** são exigidos no cadastro, mas são texto sem link
   (`features/entry/account.js`, `login.js`); não há tela para lê-los.
5. **Pedido de serviço trava depois da escolha:** sem concluir, desistir ou reabrir
   (`features/requests/handlers.js:22`); proposta vencida ainda pode ser escolhida (`validUntil` não é
   conferido).
6. **"Ocultar" uma pergunta** mostra "removida pela moderação" e não tem como desfazer
   (`motion/gestures.js:38`, `features/community/question.js:2`).
7. **Pedido de entrada em grupo fechado** não pode ser cancelado (`features/groups/views.js:88`).

## B. A tela promete e o app não cumpre

8. "Mostrar meu bairro" é salvo e nada usa (`showHood`).
9. "Permitir oferta de negócio de membro" no grupo não muda o publicador (`allowOffers`).
10. Planos (Destaque de momento etc.) mudam o nome, mas não aplicam benefício nem limite.
11. A busca diz "Indicações e respostas", mas não procura no texto das respostas.
12. O contador de Salvos em Você conta anúncio removido; a lista não mostra.
13. Em outra cidade, filtro de bairros e mapa usam os bairros e o centro de Manaus.

## C. Jornadas essenciais que faltam

| Jornada | Situação |
| --- | --- |
| Editar e excluir perguntas, respostas, publicações e comentários de grupo | falta (anúncios têm) |
| Bloquear pessoa; denunciar mensagem, resposta, comentário, publicação | falta |
| Painel: consequência para denúncia de negócio, pedido e proposta | só "Dispensar" |
| Encerrar grupo (administrador) | falta |
| Pausar ou excluir página de negócio | falta |
| Apagar a conta | falta (obrigação da LGPD no app real) |
| Ajuda e contato com o suporte | falta |

## D. Limites já registrados

- Conta nova no mesmo aparelho herda anúncios, conversas e grupos da anterior: limite do protótipo,
  decidido em 18/10 (o perfil já começa do zero; separar dados por conta é do back-end).

## E. Limpeza

- Rota `catalogo` só abre pelo endereço (legado de antes de Desapegos e Imóveis).
- Ações sem botão: `catalog-filter`, `search-from-home` (`app/handlers.js:37`, `:51`).
