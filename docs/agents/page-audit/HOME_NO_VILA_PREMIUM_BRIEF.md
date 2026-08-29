# HOME sem vínculo de vila — brief de redesign Premium

## Objetivo

Redesenhar a variante de `/community` exibida para o membro autenticado que tem localidade atual e **não possui vínculo aprovado com uma vila/comunidade**.

**Esse estado é válido, completo e pode ser permanente.** Pertencer a uma vila é opcional. O redesign deve aumentar percepção de valor, confiança, clareza e participação sem transformar descoberta de vila em funil obrigatório.

O redesign deve respeitar D48: **cidade é referência, não feed municipal**.

A tela deve responder, em poucos segundos:

1. onde estou e qual é meu contexto;
2. o que existe de útil agora;
3. como posso participar usando as superfícies disponíveis;
4. onde encontro referências permanentes da cidade;
5. quais vínculos opcionais — vilas, grupos, eventos — fazem sentido explorar;
6. por que este ambiente parece privado, confiável e bem cuidado.

## Princípio de produto

**Vila é opcional, não progressão.**

A UI não deve:

- dizer que o usuário “ainda” não entrou numa vila;
- tratar ausência de vila como setup incompleto;
- usar entrada em vila como CTA principal universal;
- medir ativação ou maturidade do membro apenas por vínculo de vila;
- esconder ou degradar utilidade central para pressionar adesão.

A UI pode:

- explicar o que é uma vila;
- oferecer descoberta de vilas quando relevante;
- mostrar status de pedido/membership quando existir;
- sugerir uma vila apenas com regra transparente de relevância;
- permitir que o membro ignore completamente esse caminho e continue tendo uma experiência útil.

## Não objetivos

- Não criar timeline municipal.
- Não criar uma quinta aba “Home”.
- Não criar busca de pessoas.
- Não introduzir ranking, badge de patente, OM, endereço ou prestígio de verificação.
- Não transformar gamificação em requisito.
- Não adicionar publicidade ou cards patrocinados na home.
- Não duplicar o CTA `Publicar`.
- Não usar estética militar institucional, brasão, medalha, camuflagem ou linguagem de órgão oficial.
- Não transformar “Entrar numa vila” em objetivo obrigatório de UX.

## Princípio de composição

A home deve deixar de ser uma sequência de caixas de peso semelhante e passar a organizar **utilidade e participação**, não progresso de membership.

### Hierarquia proposta

1. **Contexto** — cidade/localidade atual e escopo real.
2. **Valor imediato** — próximo evento e/ou referência útil do guia.
3. **Descoberta utilitária** — guia e vitrine de prestadores.
4. **Participação** — eventos, grupos e outras superfícies aplicáveis, sem pressupor vila.
5. **Vilas opcionais** — descoberta contextual, abaixo das necessidades centrais ou em rail/atalho secundário.
6. **Confiança e ajuda** — regras, moderação/denúncia e suporte encontráveis sem ocupar o centro da experiência.

`Publicar` continua disponível no shell/composer, com audiência explícita antes do commit conforme `DS-002`. Ele não deve competir com outra ação primária idêntica na própria página.

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

Deve ser compacto, informativo e orientado a utilidade.

Conteúdo mínimo:

- `h1`: `Manaus` ou `Manaus, AM`;
- microcopy: cidade como referência de eventos, guia e prestadores;
- CTA primário contextual com dados reais — por padrão, `Ver próximos eventos` quando houver eventos próximos; caso contrário, `Abrir guia de chegada`;
- CTA secundário: `Abrir guia de chegada` ou outro destino utilitário não redundante.

Opcional:

- link discreto `Explorar vilas`;
- número de próximos eventos;
- quantidade de vilas disponíveis se a query for barata e semanticamente estável;
- nunca fabricar “membros online”, ranking ou urgência artificial.

A ausência de vila **não precisa ser anunciada como problema**. Só deve aparecer quando for necessária para explicar por que determinada superfície de vila não está presente.

### C. “Para agora”

Objetivo: reduzir a sensação de catálogo e mostrar valor em uma passada de olhos.

Dois slots, no máximo três:

1. **Próximo evento da cidade** — data, título, horário/local quando autorizado e CTA `Ver evento`.
2. **Referência útil de chegada** — item/tema do guia ou CTA para o guia quando não houver ranking confiável.
3. Opcional: atalho para grupos, recomendações ou outra superfície de participação quando houver evidência de relevância.

Não usar atividade cronológica municipal como conteúdo deste bloco.

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

### G. Participação além de vila

Objetivo: deixar claro que valor comunitário não depende de membership de vila.

Dependendo do que já existe e cabe no contrato, a home pode dar acesso contextual a:

- eventos;
- grupos;
- recomendações/indicações;
- publicação com audiência correta;
- outras superfícies de participação permitidas.

Não criar módulos artificiais só para “encher” a home. A inclusão depende de utilidade real e densidade suficiente.

### H. Vilas em Manaus — opcional

O atual card `Entrar numa vila` deve ser tratado como **descoberta opcional de um tipo de vínculo**, não como etapa seguinte da jornada.

P0:

- explicar em uma frase o que é uma vila;
- copy do tipo: `Se fizer sentido para você, conheça as vilas disponíveis em Manaus.`;
- CTA secundário `Explorar vilas` / `Ver vilas disponíveis`.

P1:

- mostrar até 3 vilas quando isso melhorar descoberta;
- nome, contexto, estado de entrada e metadata útil;
- `Solicitar entrada`, `Pendente` e `Membro` devem refletir consequência real conforme `DS-028`;
- não ordenar por pagamento;
- não apresentar adesão como sinal de maior legitimidade ou completude do membro.

### I. Confiança e suporte

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

- `PRM-003`: corrigir parent state Cidade/Comunidade para um modelo que funcione também para membros sem vila;
- `PRM-008`: busca de prestadores recuperável;
- `PRM-016`: primeira dobra mobile com contexto + utilidade imediata;
- `PRM-023`: empty e no-results distintos.

### P3 — Engajamento e comunidade

- `PRM-007`: mostrar caminhos reais de participação sem transformar vila em requisito;
- `PRM-012`: evento como participação real, não só lista;
- grupos e demais superfícies entram quando houver utilidade e densidade reais.

### P4 — Personalização e exclusividade

- `PRM-002`: home orientada à localidade, intenção e uso, não à ausência de vila;
- `PRM-015`: priorização baseada em localidade/estágio/interesses quando transparente;
- `PRM-011`: explicitar valor do acervo curado e dos diferentes vínculos comunitários sem paywall artificial.

### P5 — Confiança, acessibilidade e performance

- `PRM-017`: preservar semântica, targets e focus;
- `PRM-019`: confiança visível sem exagerar verificação;
- `PRM-020`: ajuda encontrável;
- `PRM-021`: módulos independentes e recoverable;
- `PRM-025`: regras/denúncia/moderação encontráveis.

## Fases de implementação sugeridas

### P0 — Correção de contrato, antes do redesign visual

1. resolver PA-001 (parent/landed state considerando membership de vila opcional);
2. resolver PA-002 (retry de eventos/vitrine);
3. resolver PA-003 (no-results preserva busca);
4. remover duplicação PA-004;
5. decidir/alinhar PA-005 com a rubrica de header.

Esses itens devem ir em PR(s) de runtime próprios, citando os Finding IDs.

### P1 — Home Premium com dados já existentes

- hero contextual orientado à cidade, sem copy de déficit por não ter vila;
- prioridade para evento/guia conforme conteúdo disponível;
- preview compacto de próximos eventos;
- guia de chegada com prioridade visual adequada;
- vitrine com busca resiliente;
- caminhos de participação que não dependam de vila;
- descoberta de vilas em posição opcional/secundária;
- bloco de confiança/ajuda;
- reorganização responsiva 375 / 768 / 1440.

### P2 — Personalização real

Somente depois de P1 funcionar:

- ranking transparente de eventos por interesses;
- categorias do guia relevantes ao contexto do membro;
- grupos/vilas sugeridos por contexto permitido;
- preferências e notificações relevantes.

Nenhuma personalização pode depender de perfilamento opaco ou contrariar decisões de privacidade.

## Critérios de aceite

### Findability

- em 375px, o usuário entende localidade + valor imediato sem precisar interpretar ausência de vila como problema;
- `Guia`, `Eventos`, `Prestadores`, `Grupos` e `Vilas` têm caminhos previsíveis quando aplicáveis;
- selected/parent state corresponde ao conteúdo exibido;
- no-results e erro nunca removem o caminho de correção.

### Participation value

- a tela demonstra pelo menos um caminho concreto de participação sem exigir vila;
- eventos e outras superfícies aplicáveis são apresentados como oportunidades reais de uso;
- vila aparece como opção adicional de pertencimento, não como progressão obrigatória;
- nenhum feed municipal é introduzido.

### Trust and care

- erros têm recovery;
- publicação mantém audiência explícita;
- regras/ajuda/moderação são encontráveis;
- não há cue de prestígio militar/verification badge indevido;
- visual não contém duplicação de CTA ou ruído desnecessário.

## Métricas de validação

A validação de Premium não deve depender apenas de preferência visual nem usar entrada em vila como métrica universal. Medir ao menos:

- tempo/ações até alcançar a informação buscada na cidade;
- taxa de clique/uso de guia, eventos e prestadores;
- participação em eventos/grupos ou outras superfícies permitidas, quando mensurável e pertinente;
- taxa de recuperação após erro/no-results em busca de prestador;
- retorno à home de membros com e sem vínculo de vila;
- exploração voluntária de vilas como métrica específica do módulo, nunca como ativação global;
- PG-01/02/03 em teste de tarefa qualitativo curto.

O objetivo é provar que a nova composição aumenta **findability, participation value e trust** para qualquer membro, com ou sem vila.
