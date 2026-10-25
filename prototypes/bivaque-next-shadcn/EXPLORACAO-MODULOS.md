# Bivaque — Laboratório de módulos shadcn/ui

## Escopo

Exploração visual separada do protótipo HTML R72 e do aplicativo conectado ao Supabase. Objetivo: manter a composição visual da imagem experimental e conectar jornadas de módulos do Bivaque a componentes shadcn/ui/Radix, com comportamento navegável no navegador.

## Rotas

| Rota | Módulo | Ações disponíveis no protótipo |
|---|---|---|
| `/inicio` | Início | Descoberta, cards, navegação, salvamento, busca e atalhos |
| `/busca` | Busca global | Consulta conjunta de imóveis, serviços, desapegos, perguntas e grupos; abre detalhes |
| `/imoveis` | Imóveis | Categoria, filtros, preço, quartos, animais, mobiliado, referência OM, detalhes, favoritos e contato |
| `/desapegos` | Desapegos | Busca por categoria, anúncio demonstrativo, favoritos, detalhes e contato contextual |
| `/servicos` | Serviços/Negócios | Catálogo, filtros, fichas, benefício fictício e solicitação contextual |
| `/comunidade` | Comunidade | Perguntas, respostas, marcar resolução, gesto de utilidade e pesquisa |
| `/grupos` | Grupos | Participação simulada, conteúdo protegido, publicações e reações locais |
| `/conversas` | Conversas | Inbox contextual, abertura de threads e mensagens locais persistidas |
| `/guia` | Guia da Cidade | Bairros, escola, documentação, rede de serviços e conexões com outros módulos |
| `/movimentacao` | Movimentação | Checklist persistido, OM de referência, moradia, prestadores e grupos de chegada |
| `/pedidos` | Pedidos de serviço | Criar pedido, receber propostas fictícias, comparar, entrar em contato, concluir |
| `/agenda` | Encontros | Agenda, presença local e criação de evento fictício |
| `/vilas` | Vilas | Solicitar acesso fictício, modo demonstração restrito e visão de administração simulada |
| `/clube` | Clube de benefícios | Categorias, parceiros fictícios, copiar códigos explicitamente sem valor comercial |
| `/talentos` | Banco de Talentos (futuro) | Buscar por área, perfis, contatos simulados, criação de perfil |
| `/caronas` | Caronas (acessório futuro) | Buscar deslocamentos, registrar interesse e oferecer carona demonstrativa |
| `/voce` | Você | Salvos, meus anúncios, privacidade de demonstração, restauração dos dados |

## Persistência

- `localStorage`: estado `bivaque-shadcn-modules-lab-v1`, favoritos e cidade selecionada.
- Nenhum formulário envia dados a terceiros. Nenhuma credencial militar é verificada.
- Os exemplos foram criados especificamente para o laboratório. Perfis, empresas, preços, avaliações, eventos, códigos e condições são fictícios.
- Alterações podem ser revertidas em Você > Privacidade > Restaurar demonstração (salvos separados podem precisar ser removidos individualmente).

## Fluxos de teste sugeridos

1. Escolha Brasília, acesse Imóveis, filtre por características, abra um imóvel e inicie a conversa contextual.
2. Acesse Comunidade, abra uma pergunta, responda e registre que a indicação ajudou.
3. Acesse Grupos, participe de um grupo aberto, abra-o e publique algo.
4. Acesse Movimentação, marque itens do checklist; saia e retorne para verificar a persistência.
5. Acesse Pedidos, abra um pedido, compare propostas e inicie uma conversa.
6. Acesse Vilas e confirme que o conteúdo privado fica atrás do portão; entre exclusivamente no modo de demonstração.
7. Acesse Clube e copie um código fictício — ele não deve ser tratado como desconto válido.
8. Abra a busca global e procure `mudança`, `apartamento` ou `escola`.
9. No celular, teste o menu lateral, os cartões horizontais e a navegação inferior.

## Limites conhecidos

Esta entrega é um **protótipo de alta cobertura navegável**, não o Bivaque em produção. Ainda não inclui Supabase Auth, verificação militar, permissões do servidor, geocodificação homologada de OM, pagamentos, alertas enviados, uploads reais, integração de provedores, moderação backend ou reservas/contratações verdadeiras. A prova técnica é o build do Next.js/TypeScript na Vercel; testes visuais end-to-end com capturas de navegador e análise de regressão ainda são necessários antes de alegar paridade completa com o R72 ou com a imagem exploratória.

Branch dedicada: `feat/bivaque-shadcn-complete-modules-20261025`. Não alterar `main` nem a referência HTML R72 sem nova autorização.
