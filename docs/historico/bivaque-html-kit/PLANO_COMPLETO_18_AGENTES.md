# Bivaque — Plano de Agentes Especializados e Conclusão do HTML

**Base visual obrigatória:** `Bivaque_Material_Web.html` (13/10/2026).  
**Backend de referência:** `Juanjfmr/bivaque-community`; **não** utilizar o visual atual do Next.js ou do Figma.  
**Objetivo desta fase:** HTML visualmente pronto e com todas as jornadas demonstráveis, sem implementar uma segunda lógica de backend.  
**Regra de prioridade:** P0 = bloqueia fechamento do protótipo; P1 = necessária para experiência completa; P2 = posterior.

## 1. Estrutura de governança

O repositório possui `docs/agents/AGENT_ARCHITECTURE.md` e `docs/agents/TASK_CONTRACT.md`, que já definem os papéis técnicos (explorer, implementer, reviewer, runtime-verifier, security-auditor, visual-designer, experiment-judge) e a verificação independente. Os agentes abaixo são uma **camada de competência de produto**, não substitutos desses sete papéis técnicos. Uma especialidade pode operar como contexto/skill para um implementador, sem confundir execução e revisão.

### Contrato comum de cada especialista

1. Auditar o que existe no HTML e registrar lacunas com evidência (função, rota ou ação).
2. Desenhar jornada de entrada → ação → resultado → retorno, incluindo estados de erro, vazio e carregamento.
3. Buscar padrões de referência do domínio sem copiar outra identidade visual; o HTML continua soberano.
4. Propor mudanças de UX, dados demonstrativos e comportamento **sem** reimplementar backend.
5. Trabalhar somente nos arquivos autorizados; mudanças no shell, tokens e navegação exigem revisão do Frontend Premium.
6. Entregar implementação acompanhada de testes, captura mobile/desktop e registro do que permanece simulado.
7. Não fechar uma tarefa com base apenas na existência de código, screenshot estático ou declaração do executor.

### Princípios de segurança e produto

- Não criar uma segunda autenticação, mecanismo de RLS, pagamentos, mensagens ou moderação persistente dentro do protótipo.
- Não importar telas, estilos, componentes ou navegação do frontend Next.js; usar a fonte visual HTML.
- Modo demonstração deve estar explícito. Dados, contagens e aprovações fictícios jamais devem ser apresentados como operação real.
- Não guardar CPF, documentos ou outras informações sensíveis reais no `localStorage`.
- Regras de autorização são especificadas por contrato para integração posterior; não tratar `readonly()`, `mine` ou `verified` do cliente como segurança real.
- Preservar modo claro/escuro, acessibilidade e preferência `prefers-reduced-motion`.

## 2. Agentes de domínio

| ID | Especialidade | Escopo de responsabilidade | Entregas no HTML |
|---|---|---|---|
| D01 | Acesso e Onboarding | Identidade, cadastro, elegibilidade, convite, consentimento, vínculo, primeira sessão | Jornada visual completa: entrada, login/cadastro, elegibilidade, análise documental, pendência, rejeição, convite familiar, localidade, confirmação, retomada; sem CPF real |
| D02 | Comunidades e Grupos | Comunidade local, grupos temáticos, feed, filiação, moderação, administração | Descobrir, criar, pedir entrada, aguardar, aprovar, sair, moderar, post, comentário, enquete, regras, convites e estados vazios |
| D03 | Memória e Indicações | Perguntas, respostas, referência durável, Guia e negócio indicado | Pesquisa anterior à pergunta, detalhe, resposta, marcação de solução, origem, seguidos/salvos, Guias e curadoria demonstrativa |
| D04 | Desapegos e Mercado | Vender, comprar, itens usados, negociação, estado do anúncio | Busca e filtros, detalhe, galeria, publicação, edição, favoritos, oferta, contato, reserva/venda/encerramento, minhas publicações |
| D05 | Imóveis e Moradia | Aluguel/venda, filtros de habitação, visita e localização | Formulário completo, detalhes, mapa demonstrativo sem posição sensível, galeria, visitas, agendamentos e continuidade em conversas |
| D06 | Negócios e Serviços | Página comercial, catálogo, prestação de serviço, orçamento, propostas | Criação/edição, contato condicional, descontos, indicar, solicitar orçamento direto/aberto, comparação de propostas, resposta e conclusão |
| D07 | Encontros e Eventos | Calendário, organização de atividades, presença, convites | Agenda, detalhe, criar/editar/cancelar, comparecimento, vagas, convite, pergunta ao organizador e meus encontros |
| D08 | Conversas e Notificações | Inbox, mensagens originadas em ações, alertas e preferências | Conversas contextualizadas por item/negócio/pergunta, enviar/ler, falha/retomada, avisos, notificações e links de retorno |
| D09 | Perfil, Família e Movimentação | Dados pessoais, filhos/dependentes, vínculos, mudança de cidade | Perfil, edição, salvos, histórico, convites, configurações, cidade atual/origem/destino, plano de chegada e saída |
| D10 | Início, Busca e Descoberta | Primeiro contato, navegação por intenção, descoberta de conteúdo | Home útil para conta nova e veterana, busca global, filtros por domínio, resultados, histórico, recomendações e continuidade |
| D11 | Monetização e Crescimento | Adesão do prestador, páginas comerciais, assinaturas, destaques | Planos simulados honestos, espaços patrocinados rotulados, diferença grátis/pago, CTA de negócio, limites e métricas demonstrativas identificadas |

## 3. Agentes transversais (incluindo X18 UI/UX)

| ID | Papel | Regra de atuação |
|---|---|---|
| X12 | Diretor de Produto / Orquestrador | Define a ordem das ondas e os contratos; resolve conflitos; registra decisões; aprova integração no HTML mestre |
| X13 | Frontend e Acabamento Premium | Único responsável por shell, Material Web, design tokens, responsividade, tipografia, grid e consistência visual; valida toda alteração visual dos domínios |
| X14 | Motion e Microinterações | Define e implementa transições, gestos, entrada/saída de modal, estados ativos, reordenação, microfeedback, carregamento e redução de movimento |
| X15 | Segurança e Privacidade | Revisor independente; rejeita fluxo que exponha dados, invente verificação, automatize aprovação ou contradiga os contratos de acesso |
| X16 | QA e Experiência | Revisor/verificador independente; cobre jornadas completas, ações mortas, regressões visuais, teclado, screen reader, 375/768/1440, tema claro/escuro |
| X17 | Arquitetura e Integração | Separa código-fonte do HTML em módulos para concorrência segura, mapeia contratos do backend sem integrá-lo nesta fase e gera HTML final independente |
| X18 | UI/UX Especialista | Arquitetura da informação, jornadas, microcopy, hierarquia, acessibilidade e mobile-first; define experiência antes do código, sem substituir visual HTML nem implementar CSS em paralelo |

## 4. Organização técnica para permitir agentes simultâneos

**Problema atual:** o protótipo é um único HTML de cerca de 2,7 MB, com HTML, CSS, JavaScript e dados demonstrativos incorporados. Agentes editando simultaneamente o mesmo arquivo geram conflitos, regressões e perda de trabalho.

**Etapa obrigatória antes de paralelizar:**

1. Congelar uma cópia imutável do HTML original e capturas de referência em 375, 768 e 1440 pixels, com temas claro e escuro.
2. Extrair fontes em módulos sem mudar o resultado visual:

```text
prototype/
  reference/Bivaque_Material_Web.html        # versão congelada
  src/
    shell/                                    # topbar, navegação, FAB, rotas
    material/                                 # tokens, componentes, responsividade
    motion/                                   # transições, gestos, feedback
    domains/
      onboarding/ communities/ memory/
      marketplace/ housing/ businesses/
      events/ messaging/ profile/ discovery/ plans/
    data/                                     # fixtures de teste; adapter de dados
    assets/                                   # imagens e ícones existentes
  tests/                                      # visual, acessibilidade e jornada
  dist/Bivaque_Material_Web.html             # gerado, não editado diretamente
```

3. Construir processo reprodutível que gere um HTML único. Provar equivalência funcional e visual antes de novos recursos.
4. Dar a cada agente domínio de arquivos; alterações de shell ou tokens passam pelo X13. O X17 é dono do empacotamento e resolução de integração.
5. Usar branches/worktrees independentes para alterações paralelas. **Não** executar dois agentes de escrita no mesmo HTML monolítico.

## 5. Lacunas concretas no HTML atual

O roteador atual `render()` possui telas para `inicio`, `catalogo`, `negocios`, `comunidade`, `anuncio`, `negocio`, `pergunta`, `grupo`, `publicacao`, `evento`, `agenda`, `voce`, `salvos`, `meus-anuncios`, `minhas`, `conversas`, `conversa`, `busca` e `guia`. Onboarding é gerado por formulário/modal, não por uma arquitetura própria de rotas.

Estão presentes dados simulados em `SOURCE`, estado derivado por `initial()`, mutações locais e o roteamento por hash; isso não torna as jornadas completas. Entre as ações emitidas pela interface que exigem fechar ou conectar o tratamento estão, conforme inspeção estática: `send-message`, `open-thread`, `thread-origin`, `thread-menu`, `create-event`, `edit-event`, `delete-event`, `attend-event`, `new-invite`, `remove-invite`, `copy-invite`, `report`, `submit-report`, `saved`, `my-ads`, `notices`, `plan`, `plan-check`, `plan-go`, `share`, `copy-share`. A lista deverá ser revalidada automaticamente no código, pois a detecção de handlers é estática.

Inconsistência demonstrativa: a ação `join-group` simula aprovação de grupo fechado após 4,5 segundos. Substituir por estado pendente e resolução explicitamente demonstrativa controlada, sem insinuar aprovação real.

## 6. Ordem de execução — ondas de conclusão do HTML

### Onda 0 — Fundação e isolamento de escrita (X17 + X13 + X16)

- [ ] Snapshot imutável do HTML e baseline de capturas e navegação.
- [ ] Extrair módulos com montagem de um único HTML final, sem regressão visual.
- [ ] Mapear todas as rotas, CTAs, ações, caixas de diálogo, formulários e estados.
- [ ] Criar checagem automática de ação referenciada sem tratamento, com allowlist mínima e justificada.
- [ ] Registrar fonte da verdade visual e regras de colaboração nos contratos.

**Aceite:** HTML gerado equivale ao original; desenvolvimento por módulo é isolado; a equipe consegue identificar botão morto objetivamente.

### Onda 1 — Shell, busca e acabamento estrutural (D10 + X13 + X14)

- [ ] Preservar e corrigir navegação desktop/mobile, botão Criar, menus, breadcrumbs, retorno, rolagem e histórico.
- [ ] Home personalizada para morador, chegando, saindo e cidade diferente.
- [ ] Busca unificada com filtros, sugestões, resultados, nenhum resultado e histórico.
- [ ] Carrosséis, cards e galerias utilizáveis em 375/768/1440.
- [ ] Temas claro/escuro, gestos, transições e acessibilidade.

**Aceite:** usuário alcança e retorna de todas as rotas sem perder contexto; nenhuma mudança arbitrária no shell.

### Onda 2 — Entrada, perfil e contexto (D01 + D09 + X15)

- [ ] Jornadas de login/cadastro demonstrativo, consentimento, verificação, pendência, reprovação, convite e boas-vindas.
- [ ] Telas e estados de Família, preferências, configurações, salvos e minhas atividades.
- [ ] Transferência declarada e plano de chegada/saída com estados de progresso realistas no modo demonstração.
- [ ] Privacidade de informações militares/familiares e controle visual de exposição.

**Aceite:** cada perfil demonstrativo sabe por que pode agir, por que foi impedido e o próximo passo.

### Onda 3 — Transações locais (D04 + D05 + D06)

- [ ] Desapegos: anúncio, fotos, edição, filtro, salvar, interesse, oferta, encerrar.
- [ ] Imóveis: tipo/negócio, filtros, detalhes, endereço condicional, visita, contato.
- [ ] Negócios: página, catálogo, indicações, descontos, orçamentos, propostas e resultado.
- [ ] Reutilizar um único componente de contato/contexto, sem inventar chats separados.

**Aceite:** duas personas demonstrativas conseguem completar a jornada ponta a ponta sem botão inerte.

### Onda 4 — Conhecimento e participação (D02 + D03)

- [ ] Grupos: descobrir, entrar, solicitar, gerir, postar, responder, votar, moderar, sair.
- [ ] Memória: procurar resposta, perguntar, acompanhar, aceitar solução, ver origem, salvar.
- [ ] Guia: ler, sugerir, aprovar/rejeitar em demonstração e reencontrar conteúdo.
- [ ] Estados vazios realistas para primeira pessoa, primeira cidade e primeiro grupo.

**Aceite:** é possível aprender e contribuir; a informação resolvida reaparece em uma busca posterior.

### Onda 5 — Encontros, conversas e notificações (D07 + D08)

- [ ] Criar/editar/cancelar evento, calendário, RSVP, vagas e pergunta ao organizador.
- [ ] Conversa iniciada por contexto (anúncio, negócio, orçamento ou evento), enviar e retornar à origem.
- [ ] Inbox, notificações com destinos válidos e preferências de recebimento.
- [ ] Erros, reenvio e retomada demonstrativa honesta.

**Aceite:** o fluxo não termina em uma tela estática; o usuário reencontra a ação realizada.

### Onda 6 — Planos, finalização premium e qualidade (D11 + X13 + X14 + X15 + X16)

- [ ] Planos e destaques visualmente consistentes com monetização aprovada; nenhuma concessão de plano baseada em `localStorage` como se fosse real.
- [ ] Revisar todos os modais, formulários, menus, ações de deslizar, estados visuais, tipografia, espaçamentos e imagens.
- [ ] Executar todos os cenários entre duas ou mais personas simuladas.
- [ ] Testar teclado, navegação assistiva, tema claro/escuro, reduced motion e 375/768/1440.
- [ ] Inventário final com contratos para migração: tela → ação → payload → backend existente → pendência.

**Aceite:** versão demonstrável que pode ser usada para aprovação do produto sem desculpas de protótipo inacabado.

## 7. Padrão de contrato por tarefa (exemplo)

**ID:** `HTML-GRP-001`  
**Especialista de domínio:** D02 Comunidades e Grupos  
**Responsáveis de execução:** agente implementador com arquivos limitados ao módulo de grupos  
**Revisor:** X13 (visual) + X15 (se afetar privacidade)  
**Verificador:** X16 (independente)  
**Objetivo:** o pedido de acesso a grupo fechado tem estados *não participante → pendente → aprovado ou recusado*; nunca é aprovado automaticamente sem ação de operador de demonstração.  
**Escopo permitido:** `prototype/src/domains/communities/**`, testes e fixtures relacionados.  
**Proibido:** reescrever shell, alterar tokens globais, reutilizar tela Next.js/Figma, criar tabela ou autenticação real.  
**Prova:** jornada Playwright com duas personas, capturas 375/1440 claro/escuro, teste de estado pendente e de aprovação demonstrativa.  
**Pronto quando:** CTA, resposta, retorno e todos os estados funcionam, com documentação explícita das simulações.

## 8. Protocolo de integração entre agentes

1. Orquestrador seleciona um item do backlog; define baseline, escopo e critério de pronto.
2. Especialista faz análise e propõe fluxo; mudanças de produto relevantes passam pelo dono.
3. Implementador trabalha em branch/worktree e no caminho autorizado.
4. Gate automático (tests + lint/syntax + ação órfã + screenshot) precisa passar.
5. Revisor independente inspeciona código sem depender da narrativa do implementador.
6. Segurança revisa fluxos sensíveis; diretor de UI valida invariantes visuais.
7. Runtime verifier roda cenário; se falhar, item continua aberto.
8. Orquestrador integra e atualiza o catálogo de telas/ações e o mapa para backend.

**Paralelismo recomendado:** duas ou três frentes de domínios independentes e uma frente transversal de validação. Motion e Frontend Premium validam lotes para evitar drift. Sem concorrência sobre o HTML compilado.

## 9. O que deliberadamente fica fora desta etapa

- Configurar Supabase de produção; executar migrações; criar sistema de autenticação paralelo.
- Implementar envio real de mensagens, notificação, cobrança ou verificação militar dentro do HTML.
- Recriar o frontend Next.js como referência visual.
- Acrescentar funções por inspiração sem aprovar sua pertinência ao escopo de Bivaque.

**Critério final da etapa HTML:** todas as telas essenciais e variantes estão presentes; todas as ações produzem resposta coerente; mobile e desktop estão completos e consistentes; simulações são identificadas; componentes estão isolados para execução paralela; o mapa de integração tem cobertura integral. Após isso, integração progressiva no Next.js e no Supabase existentes.


## Complemento do kit Codex — 13/10/2026

Foi adicionado X18 UI/UX, com atribuições e entregáveis completos em `docs/UI_UX.md`. Os 18 agentes são perfis disponíveis; não executar todos ao mesmo tempo. O arquivo HTML original continua sendo a referência visual.
