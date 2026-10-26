# Bivaque — etapa P1 do porte R72 para shadcn/ui

**Branch de trabalho:** `feat/port-r72-shadcn-p0-20261025`.
**Referência intocável:** `prototypes/bivaque-html/docs/VISUAL_BASELINE_R72.md` (SHA-256 da referência `7e7657c3652ce6daff450d8dfe5d9ce8d8eda8d6189bcd3f2317a2f25fb61d2d`).
**Escopo:** somente `prototypes/bivaque-next-shadcn/`; não fazer merge, promover versão, alterar produção ou tocar a base R72.

## Matriz de paridade

| Capacidade | P1 nesta branch | Limite de produto |
|---|---|---|
| Home e navegação | Preservada navegação de cinco destinos no mobile, Criar central; cores/tipografia oficiais | Não é homologação visual pixel a pixel do R72 |
| Busca | Busca multímódulo com cidade, páginas de detalhes e estados vazios | Somente fixtures locais; sem consultas reais |
| Criação | Rascunhos locais, editar, pausar/retomar e excluir, por cidade | Sem uploads, publicação, permissão ou backend |
| Entrada | `/acesso` com persona, apelido fictício, simulação de análise e aprovação | **Não autentica, não valida CPF, não confere vínculo ou documento e não libera privilégio** |
| Denúncias | Reportar pergunta/registro demonstrativo, `/painel` com fila, ocultar, dispensar e reabrir | Sem autenticação de moderador, revisão real ou auditoria de backend |
| Privacidade | Não solicita documentos ou senhas no laboratório de entrada; dados interativos em armazenamento local | Fotos ilustrativas podem ser carregadas de serviços externos; sem promessa de privacidade de rede absoluta |
| Regiões | Seleção de cidade isola pedidos, guia, vilas e imóveis demonstrativos | Sem catálogo nacional real e sem geocodificação homologada |
| Temas | Grafite/Papel/Brasa, Noto e checagem de contraste | Verificação de acessibilidade com tecnologias assistivas segue pendente |

## Testes automatizados

1. `bivaque-r72-shadcn-check.yml`: instala dependências, verifica tokens/contraste, executa build Next (TypeScript incluído), checks estáticos de rotas e regressões do P0/P1.
2. `bivaque-r72-browser-smoke.yml`: executa Chromium contra exportação estática local; confere responsividade 375, 768 e 1440 px, captura Início/Imóveis/Comunidade/Serviços, testa o fluxo P0 de criação/busca/cidade e os percursos P1 de entrada, edição/pausa, denúncia e reversão.
3. Capturas do Chromium são artefatos do workflow, não certificam correspondência visual ao HTML R72. Nenhuma ação de CI promove esta branch à produção.

## O que ainda impede declarar paridade completa

- Entrada real com convite familiar, verificação militar, CPF efêmero e revisão segura — requer backend e decisões sobre o tratamento de dados.
- Papéis e autorização administrativa, trilha de auditoria, moderação de todos os objetos/estados do R72 e bloqueios reais.
- Editor completo de anúncios e negócios com upload/galeria, publicar/editar/pausar/excluir persistidos no servidor e jornadas detalhadas.
- MapLibre e OpenFreeMap, distância por bairro e OM, mapas e filtros locais sem coordenadas inventadas.
- Avisos, comparações, compartilhamentos, gestos móveis, conversa, acessibilidade e os demais gates funcionais/visuais do R72.
- Comparação de screenshots lado a lado contra base R72 reconstruída, além do teste manual por dispositivo.

**Próximo critério de liberação:** matriz de jornada completa + teste funcional no navegador + auditoria visual e de acessibilidade, todos concluídos antes de considerar merge.
