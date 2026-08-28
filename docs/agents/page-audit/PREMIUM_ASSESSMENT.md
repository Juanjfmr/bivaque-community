# Bivaque — Premium Maturity Assessment

Esta avaliação mede se o Bivaque transmite uma percepção Premium como comunidade digital. Ela é **transversal**: nenhum critério é considerado satisfeito apenas porque existe uma página ou componente correspondente.

## Resultado que queremos provar

Uma experiência Premium deve fazer o usuário perceber rapidamente três coisas:

1. **“É fácil encontrar o que preciso.”**
2. **“Vale a pena participar.”**
3. **“Este ambiente é confiável e bem cuidado.”**

Essas três percepções funcionam como gates qualitativos. Uma média numérica alta não substitui nenhuma delas.

## Pilares e pesos

| Pilar | Peso |
|---|---:|
| Visual e marca | 20% |
| Usabilidade e navegação | 25% |
| Engajamento e comunidade | 20% |
| Personalização e exclusividade | 20% |
| Confiança, acessibilidade e performance | 15% |

Os critérios têm peso igual **dentro do respectivo pilar** nesta baseline. Qualquer mudança de peso por critério deve ser explícita e justificada, não ajustada depois para melhorar o resultado.

## Escala por critério

- `0 — ABSENT`: capacidade/qualidade relevante ausente ou materialmente quebrada;
- `1 — WEAK`: existe apenas de forma rudimentar, confusa ou com dívida importante;
- `2 — FUNCTIONAL`: atende ao job básico, mas sem polimento ou diferenciação Premium;
- `3 — POLISHED`: solução consistente, clara, confiável e bem resolvida;
- `4 — PREMIUM`: execução diferenciada, integrada e acima do simples “funciona”.

Também são permitidos:

- `NOT_ASSESSED`: ainda não há evidência suficiente;
- `OUT_OF_SCOPE_INTENTIONAL`: existe decisão de produto explícita para não oferecer a feature/forma sugerida.

`OUT_OF_SCOPE_INTENTIONAL` não é um passe automático. O auditor deve verificar se o **resultado para o usuário** ainda é atendido por outra solução. Exemplo: ausência deliberada de um mecanismo social específico não deve ser penalizada se o objetivo de descoberta/networking é satisfeito por um padrão alternativo melhor alinhado ao Bivaque.

## Classificação agregada

Convenção de auditoria, não regra normativa do design system:

- `PREMIUM-CANDIDATE`: 85–100;
- `STRONG`: 70–84,99;
- `FUNCTIONAL`: 50–69,99;
- `BELOW-PREMIUM`: abaixo de 50;
- `NOT_ASSESSED`: evidência insuficiente para calcular.

A classificação `PREMIUM-CANDIDATE` só pode ser promovida para **Premium evidenciado** se todos os hard gates abaixo passarem.

## Hard gates

1. nenhum `BLOCKER` aberto em Page Readiness;
2. nenhum `HIGH` aberto que afete navegação principal, confiança/privacidade, acessibilidade ou performance dos fluxos centrais;
3. os três perception gates devem estar `PASS-EVIDENCED`;
4. cada pilar deve atingir pelo menos 70/100;
5. experiência mobile dos fluxos centrais deve estar comprovada;
6. estados de erro/loading/empty dos fluxos centrais não podem induzir falso estado, abandono sem orientação ou vazamento de erro cru;
7. moderação, denúncia e confiança precisam ser encontráveis e compreensíveis para os papéis aos quais se aplicam.

## 25 critérios

### P1 — Visual e marca · 20%

**PRM-001 — Identidade visual consistente**  
Paleta, tipografia, iconografia, espaçamento, hierarquia e linguagem visual formam um sistema coerente e reconhecível.

**PRM-018 — Microinterações e feedback visual**  
Loading, pending, confirmação, sucesso, erro e animação discreta deixam claro o que ocorreu sem excesso de movimento ou ruído.

**PRM-022 — Ausência de poluição visual**  
A interface prioriza conteúdo e ações relevantes, evita competição desnecessária por atenção e não depende de ornamentação para parecer Premium.

### P2 — Usabilidade e navegação · 25%

**PRM-003 — Navegação simples e previsível**  
Arquitetura de informação, menus, parent state, breadcrumbs quando necessários, back paths e acesso rápido às áreas principais são coerentes.

**PRM-008 — Busca avançada / descoberta**  
O usuário consegue localizar entidades e conteúdo relevantes — membros, publicações, eventos, grupos, documentos/recursos ou temas conforme a proposta real do produto.

**PRM-010 — Onboarding de alta qualidade**  
O primeiro acesso explica proposta, configura o mínimo necessário, coleta interesses relevantes e deixa claros os próximos passos.

**PRM-016 — Excelente experiência mobile**  
Fluxos principais funcionam confortavelmente em touch, sem reflow problemático, controles apertados ou perda de contexto.

**PRM-023 — Estados vazios bem trabalhados**  
Empty states explicam por que não há conteúdo e indicam a ação seguinte adequada, sem mascarar erro de backend como vazio legítimo.

### P3 — Engajamento e comunidade · 20%

**PRM-004 — Perfis de membros completos**  
Perfil comunica identidade, contexto útil, interesses/competências e sinais de participação na medida apropriada à privacidade do Bivaque.

**PRM-005 — Reputação e reconhecimento**  
Contribuições úteis podem ser reconhecidas sem criar competição nociva ou falsa autoridade.

**PRM-006 — Feed de comunidade bem estruturado**  
Publicações, comentários, reações e organização do conteúdo permitem acompanhar e contribuir sem sobrecarga.

**PRM-007 — Grupos ou espaços temáticos**  
Segmentação por interesse, tema, projeto, localidade ou acesso cria contexto e pertencimento claros.

**PRM-012 — Eventos integrados**  
Descoberta, detalhe, presença, lembrete/estado e histórico relevante formam um ciclo coerente conforme o escopo do produto.

**PRM-013 — Mensagens e networking**  
O produto ajuda a encontrar e acionar pessoas relevantes de forma coerente com as decisões de privacidade e segurança. A ausência deliberada de DM tradicional não é falha automática.

### P4 — Personalização e exclusividade · 20%

**PRM-002 — Homepage/Dashboard personalizado**  
A superfície inicial prioriza novidades, conteúdo, eventos, contexto local e ações relevantes ao usuário, em vez de um dashboard genérico.

**PRM-009 — Notificações inteligentes**  
Central, preferências, relevância e redução de ruído ajudam o usuário a saber o que merece atenção.

**PRM-011 — Conteúdo ou benefícios exclusivos**  
Existem experiências, conhecimento, acesso, recursos ou benefícios que reforçam por que pertencer ao Bivaque tem valor diferenciado.

**PRM-014 — Gamificação elegante**  
Se houver progressão, badges, desafios ou recompensas, eles reforçam comportamentos úteis. A ausência de gamificação é aceitável quando ela não serve ao produto.

**PRM-015 — Personalização**  
Interesses, localidade, papel e comportamento relevante melhoram recomendações e organização sem produzir surpresa ou opacidade indesejada.

**PRM-024 — Métricas e progresso do membro**  
Quando útil ao produto, o membro recebe sinais significativos de participação, contribuição ou trajetória — não vanity metrics por padrão.

### P5 — Confiança, acessibilidade e performance · 15%

**PRM-017 — Acessibilidade**  
Contraste, leitura, keyboard, focus, labels, semântica, non-color cues e compatibilidade assistiva atendem ao contrato aplicável.

**PRM-019 — Segurança e confiança**  
Privacidade, escopo, denúncia, bloqueio quando aplicável, papéis, regras e consequências de ações transmitem ambiente protegido e previsível.

**PRM-020 — Suporte Premium**  
Ajuda, FAQ, orientação, contato e escalonamento de suporte são proporcionais à proposta e deixam claro como obter ajuda.

**PRM-021 — Performance**  
Carregamento, transições, estabilidade, imagens, fetches e falhas percebidas preservam fluidez e confiança.

**PRM-025 — Moderação profissional**  
Regras, denúncia, sinalização, ferramentas de moderador e transparência de ações de moderação formam um sistema compreensível e responsável.

## Perception gates

### PG-01 — Findability

**Pergunta:** o usuário consegue encontrar rapidamente o que veio buscar?  
Evidência deve cruzar entrada, navegação, busca/descoberta, mobile e estados vazios.

### PG-02 — Participation value

**Pergunta:** o usuário entende por que vale a pena voltar, contribuir e participar?  
Evidência deve cruzar feed, grupos, eventos, conhecimento, pessoas relevantes, personalização e exclusividade.

### PG-03 — Trust and care

**Pergunta:** o ambiente parece confiável, protegido e bem cuidado?  
Evidência deve cruzar identidade, privacidade, moderação, acessibilidade, erros, suporte e performance.

## Relação com as 40 páginas

A avaliação Premium não exige uma página dedicada para cada critério. Critérios podem ser:

- `page-local` — comprovados principalmente em uma tela;
- `journey` — dependem de várias páginas de um fluxo;
- `cross-cutting` — exigem amostra representativa do produto inteiro;
- `capability-level` — dependem também de decisões de produto, backend, preferências ou operação.

Toda evidência deve citar Page IDs quando houver impacto visível em tela e Finding IDs quando houver defeito.

## Regra anti-feature-checklist

Esta avaliação mede **resultado e qualidade**, não clonagem de features de outras comunidades. Não penalizar automaticamente o Bivaque por não possuir ranking, DM, cursos, tema customizável ou outro recurso listado como exemplo. Penalizar apenas quando:

1. o resultado é relevante à promessa Premium do Bivaque;
2. não existe solução equivalente adequada;
3. a ausência ou má execução reduz findability, participation value, exclusividade ou confiança.
