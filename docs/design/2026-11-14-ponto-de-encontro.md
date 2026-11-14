# Início como ponto de encontro da cidade — 14/11/2026

Base: 29e5c2d4. Pedido do dono: redesenhar a experiência do produto existente, preservando regras e integrações. Fontes confrontadas: AGENTS.md, LANCAMENTO.md, identidade das peças, LAN-F02, adapters de início/eventos/perguntas/grupos, navegação e telas em apps/app. Trabalho isolado na branch codex/bivaque-descoberta-1114.

## Decisão de produto

O começo da experiência reúne três necessidades: encontrar uma resposta, contribuir com conhecimento local e encontrar pessoas. Perguntas ocupam a primeira seção. Grupos e agenda dão contexto de participação; moradia, desapegos, serviços e guia continuam acessíveis, em listas proporcionais ao conteúdo disponível. Não há novo feed social, ranking, checkout ou painel de métricas.

Foram consideradas: manter a vitrine (prioriza transações), transformar tudo em feed (mistura intenções) e organizar por conversa, participação e utilidade. A terceira é a decisão deste lote, dentro da delegação do AGENTS.md. A navegação aprovada e as peças existentes são preservadas.

## Escopo fechado

- Início: hierarquia, textos, arte da família existente e destinos reais.
- Perguntar no Início abre o compositor já existente da Comunidade, com rascunho, revisão, gravação e detalhe.
- Explorar grupos chega à seção Grupos; a seção fica na entrada do histórico e retorna com Voltar.
- Abrir um encontro e alterar presença são ações distintas. A resposta do servidor determina o estado exibido; falha não confirma presença.
- Sessão vencida, acesso recusado, erro recuperável, carregamento e vazio continuam distintos.
- Removidos do Início o salvar volátil e as recomendações sem evidência na resposta da API.

Fora deste lote: refazer todas as jornadas do lançamento, migrações de tela antiga, autenticação, RLS, endpoints, contratos, bibliotecas novas e publicação.

## Arquitetura e alcance da mudança

Inicio.tsx compõe as peças de src/pecas e os componentes existentes, usando os mesmos adapters. inicio.css só organiza essa tela. Comunidade.tsx lê sua seção do histórico existente. Fixtures e specs de Início afetados pela substituição da vitrine acompanham a mudança. Nenhuma identidade, cidade, permissão ou autoria passa a ser confiada ao cliente.

Refino após revisão independente: o diálogo existente foi extraído para DialogoDePergunta e é usado no Início e na Comunidade, mantendo a tela de origem ao fechar. A seção de grupos é enviada como filtro inicial da navegação, numa única escrita de destino. As regras antigas do Início foram removidas de styles.css, incluindo a redução indevida dos links de seção para 12 px. O ramo de grupos inalcançável foi eliminado; o vazio real permanece no Diretório.

## Referências e orientação

Nextdoor não retornou resultados nas buscas Mobbin iOS e web em 14/11. Referência observada para a legibilidade de perguntas e separação por assunto: [Brainly](https://mobbin.com/screens/1a73bf08-a309-4f08-af15-fd2679d23387). Não adotamos os padrões de feed retornados por Reddit e Facebook.

A pedido do dono, consultado [GoogleChrome/modern-web-guidance-src](https://github.com/GoogleChrome/modern-web-guidance-src), revisão 5e5cd33a7738f21281e3027732bcbd58cfa82bf1. Guias responsive-design, form-factor-adaptation e css-layout: consultas pelo espaço disponível no container, tracks flexíveis, dimensões lógicas, mídia com proporção reservada, ordem visual igual à ordem do DOM e alvos de toque. Recursos usados são Baseline amplamente disponíveis; text-wrap degrada para quebra normal.

## Plano e prova

1. Compor o Início usando as portas atuais, sem alterar servidor.
2. Reutilizar o compositor e restaurar a seção de grupos pelo histórico.
3. Ajustar os testes que exigiam a vitrine removida.
4. Executar build, tipos, testes do app, percursos com APIs simuladas, acessibilidade automática e capturas nos dois temas.
5. Registrar falhas e limites no LAN-F02. Não marcar a jornada inteira como pronta sem banco local, gate completo e revisão independente.

As evidências deste lote ficam em .visual/discovery. Resultados finais no cartão LAN-F02.
