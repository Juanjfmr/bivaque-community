# Roadmap para concluir o HTML — execução por ondas

| Rodada | Dominantes | Entrega / saída verificável | Dependência |
|---|---|---|---|
| 00 | X17 Arquitetura, X18 UI/UX auditor, X13 Frontend, X16 QA | baseline; extração segura; build HTML único; capturas e testes sem regressão | Inicial |
| 01 | D10 Início/Busca, X18 UI/UX, X13, X14 Motion | navegação, shell, busca, criar, menus, mobile e feedback de estados | 00 |
| 02 | D01 Acesso, D09 Perfil/Família/Movimentação, X15 Segurança | onboarding completo demo; estados de verificação e transferência identificados | 01 |
| 03 | D04 Desapegos, D05 Imóveis, D06 Negócios | publicar/ver/editar/salvar/interessar/encerrar; serviços e propostas | 01-02 |
| 04 | D02 Comunidades/Grupos, D03 Memória/Indicações | grupos, perguntas, respostas, origem, resolveu, Guia, moderação simulada | 01-02 |
| 05 | D07 Eventos, D08 Conversas/Notificações | criar/convidar/confirmar, thread contextual, avisos e retorno | 03-04 |
| 06 | D11 Monetização, X18, X13, X14, X16 e X15 | acabamento final, prova ampla, backlog de integração Supabase | 00-05 |

## Critérios de chegada ao 'HTML concluído'
- Todas as rotas e ações apresentadas como clicáveis respondem. Sem botões mortos ou ramos silenciosos.
- Telas principais e detalhe/edição/criação, estados vazios, carregamento, falha, sucesso e confirmação existem.
- Prova em largura 375, 768 e 1440; temas claro/escuro; teclado; redução de movimento. Corrigir card largo, cabeçalho alto ou desalinhamento quando houver evidência e decisão.
- Padrão visual Material Web e navegação HTML preservados ou mudados apenas mediante autorização explícita.
- Nenhuma credencial real, cobrança ou serviço real simulado fraudulentamente.
- Gerador reprodutível do HTML standalone e relatório de diff visual.
- Lista de adaptadores que precisarão ser conectados ao `bivaque-community` após congelar a UI.

## Cuidados de calendário
Não estabelecer prazo arbitrário. Encerrar cada rodada pelo critério de aceite, não pela contagem de telas. Se não houver navegador na execução, marcar bloqueio de validação visual.
