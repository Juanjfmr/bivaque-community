# HOME sem vila — brief de redesign Premium

## Objetivo

Redesenhar a variante de `/community` exibida para o membro autenticado que tem localidade atual, mas ainda **não pertence a uma vila aprovada**.

O redesign deve aumentar percepção de valor, pertencimento, confiança e clareza sem violar D48: **cidade é referência, não feed municipal**.

A tela deve responder, em poucos segundos:

1. onde estou e qual é meu contexto;
2. o que devo fazer agora;
3. o que existe de útil nesta cidade;
4. como entro no ciclo comunitário real do Bivaque;
5. por que este ambiente parece privado, confiável e bem cuidado.

## Não objetivos

- Não criar timeline municipal.
- Não criar uma quinta aba “Home”.
- Não criar busca de pessoas.
- Não introduzir ranking, badge de patente, OM, endereço ou prestígio de verificação.
- Não transformar gamificação em requisito.
- Não adicionar publicidade ou cards patrocinados na home.
- Não duplicar o CTA `Publicar`.
- Não usar estética militar institucional, brasão, medalha, camuflagem ou linguagem de órgão oficial.

## Princípio de composição

A home sem vila deve deixar de ser uma sequência de quatro caixas de peso semelhante e passar a ter uma hierarquia baseada no **estado do membro**.

### Hierarquia proposta

1. **Contexto + próximo passo** — “Você está em Manaus e ainda não entrou numa vila”.
2. **Ação primária de pertencimento** — encontrar/entrar numa vila.
3. **Valor útil imediato** — próximo evento e guia de chegada.
4. **Descoberta utilitária** — vitrine de prestadores com busca resiliente.
5. **Confiança e ajuda** — regras, moderação/denúncia e suporte encontráveis sem ocupar o centro da experiência.

`Publicar` continua disponível no shell/composer, com audiência explícita antes do commit conforme `DS-002`. Ele não deve competir com o CTA de pertencimento na própria página.

## Estrutura funcional

### A. Header do shell

Objetivo: reconhecimento de produto + utilidades globais.

- marca Bivaque à esquerda, conforme Visual Guide;
- Indicações;
- Notificações;
- avatar/perfil;
- uma única entrada global de publicação, se a decisão corrente for mantê-la no header;
- não usar o header como substituto do título/contexto da página.

### B. Hero contextual — “Sua referência em Manaus”

Deve ser compacto, informativo e orientado a próxima ação.

Conteúdo mínimo:

- `h1`: `Manaus` ou `Manaus, AM`;
- estado: `Você ainda não está em uma vila.`;
- microcopy: a cidade serve como referência de eventos, guia e prestadores enquanto o usuário escolhe onde participar;
- CTA primário: `Encontrar uma vila`;
- CTA secundário: `Abrir guia de chegada`.

Opcional com dado real já disponível:

- número de próximos eventos;
- quantidade de vilas disponíveis se a query for barata e semanticamente estável;
- nunca fabricar “membros online”, ranking ou urgência artificial.

### C. “Para agora”

Objetivo: reduzir a sensação de catálogo e mostrar valor em uma passada de olhos.

Dois slots, no máximo três:

1. **Próximo evento da cidade** — data, título, horário/local quando autorizado e CTA `Ver evento`.
2. **Referência útil de chegada** — item/tema do guia ou CTA para o guia quando não houver ranking confiável.
3. Opcional: **vila sugerida** apenas quando houver regra transparente de relevância; caso contrário, mostrar `Vilas em Manaus` sem alegar personalização.

Não usar atividade cronológica como conteúdo deste bloco.

### D. Eventos

- mostrar 2–3 próximos eventos, não seis linhas iguais no primeiro viewport;
- item deve expor metadata decisória conforme `DS-032`;
- link `Ver todos os eventos`;
- loading mantém geometria do módulo;
- erro com retry;
- vazio verdadeiro explica ausência sem parecer falha.

### E. Guia de chegada

Transformar o bloco em superfície de alta utilidade, não apenas texto + botão.

P0 com dados atuais:

- título;
- explicação curta;
- CTA `Abrir guia de chegada`.

P1 se houver dados confiáveis:

- categorias úteis disponíveis;
- itens salvos/recentes do próprio membro;
- “atualizado em” quando houver freshness confiável.

### F. Vitrine de prestadores

- busca deve permanecer visível mesmo com zero resultado filtrado;
- diferenciar catálogo inicial vazio de no-results;
- filtros preservam estado;
- no-results oferece limpar filtros;
- erro oferece retry;
- mostrar contexto de categoria e alcance suficiente para decisão, sem transformar indicação em anúncio.

### G. Vilas em Manaus

Este bloco substitui o atual card genérico `Entrar numa vila` por uma descoberta de pertencimento mais útil.

P0:

- explicar em uma frase o que é uma vila;
- CTA `Ver vilas disponíveis`.

P1:

- mostrar até 3 vilas disponíveis, com nome, contexto/localidade, estado de entrada e metadata útil;
- `Solicitar entrada`, `Pendente` e `Membro` devem refletir consequência real conforme `DS-028`;
- não ordenar por pagamento;
- não usar contagem de membros como prova de autoridade se ela não ajuda a decisão.

### H. Confiança e suporte

Bloco discreto no fim ou no rail desktop:

- `Como funciona a comunidade` / regras;
- `Denunciar um problema` quando aplicável;
- `Ajuda` / FAQ / suporte;
- texto curto sobre acesso controlado e privacidade, sem badge de prestígio.

## Premium criteria priorizados

### P1 — Visual e marca

- `PRM-001`: devolver assinatura de marca ao shell;
- `PRM-018`: estados e feedback claros;
- `PRM-022`: reduzir duplicação e competição visual.

### P2 — Usabilidade e navegação

- `PRM-003`: corrigir parent state Cidade/Comunidade;
- `PRM-008`: busca de prestadores recuperável;
- `PRM-016`: primeira dobra mobile com contexto + próximo passo;
- `PRM-023`: empty e no-results distintos.

### P3 — Engajamento e comunidade

- `PRM-007`: tornar entrada em vila uma ação concreta e compreensível;
- `PRM-012`: evento como participação real, não só lista.

### P4 — Personalização e exclusividade

- `PRM-002`: home orientada ao estado “sem vila”;
- `PRM-015`: priorização baseada em localidade/estágio e, futuramente, interesses quando transparente;
- `PRM-011`: explicitar valor exclusivo do acervo curado e das vilas, sem paywall artificial.

### P5 — Confiança, acessibilidade e performance

- `PRM-017`: preservar semântica, targets e focus;
- `PRM-019`: confiança visível sem exagerar verificação;
- `PRM-020`: ajuda encontrável;
- `PRM-021`: módulos independentes e recoverable;
- `PRM-025`: regras/denúncia/moderação encontráveis.

## Fases de implementação sugeridas

### P0 — Correção de contrato, antes do redesign visual

1. resolver PA-001 (parent/landed state);
2. resolver PA-002 (retry de eventos/vitrine);
3. resolver PA-003 (no-results preserva busca);
4. remover duplicação PA-004;
5. decidir/alinhar PA-005 com a rubrica de header.

Esses itens devem ir em PR(s) de runtime próprios, citando os Finding IDs.

### P1 — Home Premium com dados já existentes

- hero contextual “sem vila”;
- CTA principal `Encontrar uma vila`;
- preview compacto de próximos eventos;
- guia de chegada com prioridade visual maior;
- vitrine com busca resiliente;
- bloco de confiança/ajuda;
- reorganização responsiva 375 / 768 / 1440.

Não exigir novo backend além de consultas já existentes, salvo a listagem de vilas se ainda não estiver disponível no componente.

### P2 — Personalização real

Somente depois de P1 funcionar:

- ranking transparente de eventos por interesses;
- categorias do guia relevantes ao estágio do membro;
- vilas/grupos sugeridos por contexto permitido;
- preferências e notificações relevantes.

Nenhuma personalização pode depender de perfilamento opaco ou contrariar decisões de privacidade.

## Critérios de aceite

### Findability

- em 375px, o usuário entende cidade + estado “sem vila” + CTA principal sem scroll excessivo;
- `Encontrar uma vila`, `Guia`, `Eventos` e `Prestadores` têm caminhos previsíveis;
- selected/parent state corresponde ao conteúdo exibido;
- no-results e erro nunca removem o caminho de correção.

### Participation value

- a tela deixa claro que entrar numa vila é o passo para participar da conversa recorrente;
- existe pelo menos um convite concreto a participação (vila ou evento) na primeira porção da tela;
- nenhum feed municipal é introduzido.

### Trust and care

- erros têm recovery;
- publicação mantém audiência explícita;
- regras/ajuda/moderação são encontráveis;
- não há cue de prestígio militar/verification badge indevido;
- visual não contém duplicação de CTA ou ruído desnecessário.

## Métricas de validação

A validação de Premium não deve depender apenas de preferência visual. Medir ao menos:

- tempo/ações até abrir `Ver vilas disponíveis` ou solicitar entrada;
- taxa de clique em guia/evento a partir da home;
- taxa de recuperação após erro/no-results em busca de prestador;
- retorno à home de membros ainda sem vila;
- PG-01/02/03 em teste de tarefa qualitativo curto.

O objetivo é provar que a nova composição aumenta **findability, participation value e trust**, não apenas que parece mais sofisticada.
