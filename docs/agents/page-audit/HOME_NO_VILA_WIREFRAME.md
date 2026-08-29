# HOME sem vínculo de vila — wireframe textual Premium

## Escopo

Variante de `/community` para membro autenticado e localizado, sem vínculo aprovado com uma vila.

**Esse é um estado de primeira classe.** O wireframe não trata ausência de vila como progresso incompleto e não exige adesão futura.

Este wireframe é **proposta de produto**, não contrato normativo. Ele respeita:

- vínculo de vila é opcional;
- D48: cidade é referência, não timeline;
- `DS-009/010`: tarefa e escopo não se confundem;
- quatro containers de navegação atuais enquanto `EXP-001` permanece aberto;
- sem busca de pessoas;
- sem badge de patente/OM/prestígio de verificação;
- um único CTA principal de publicação por viewport.

---

## Mobile — 375px

```text
┌───────────────────────────────────────┐
│ Bivaque                     ◇  ♢  (A) │  shell global
├───────────────────────────────────────┤
│ Manaus, AM                            │
│ Sua referência na cidade              │
│ Eventos, guia e prestadores para      │
│ resolver o que você precisa por aqui. │
│                                       │
│ [ Ver próximos eventos ]              │  CTA contextual
│ [ Abrir guia de chegada ]             │  secundário
├───────────────────────────────────────┤
│ PARA AGORA                            │
│ ┌───────────────────────────────────┐ │
│ │ Próximo evento                    │ │
│ │ 31 AGO · Piquenique das famílias  │ │
│ │ horário/local permitido           │ │
│ │                       Ver evento →│ │
│ └───────────────────────────────────┘ │
│ ┌───────────────────────────────────┐ │
│ │ Guia de chegada                   │ │
│ │ Referências permanentes para      │ │
│ │ escola, saúde, mudança e rotina.  │ │
│ │                         Abrir guia│ │
│ └───────────────────────────────────┘ │
├───────────────────────────────────────┤
│ PRÓXIMOS EVENTOS              Todos →│
│ 31 ago   Piquenique das famílias      │
│ 03 set   Torneio amistoso             │
│ 06 set   Oficina de leitura           │
├───────────────────────────────────────┤
│ VITRINE DE PRESTADORES                │
│ [ Buscar por nome................ ]   │
│ [ Todas as categorias ▼ ] [Buscar]   │
│                                       │
│ Climatiza Manaus                      │
│ Assistência técnica                   │
│                                       │
│ estado zero filtrado:                 │
│ “Nenhum prestador com esses filtros.” │
│ [ Limpar filtros ]                    │
├───────────────────────────────────────┤
│ PARTICIPE DO SEU JEITO                │
│ Eventos · Grupos · Indicações         │
│ caminhos de participação disponíveis  │
│ sem exigir vínculo de vila            │
├───────────────────────────────────────┤
│ VILAS EM MANAUS                       │
│ Se fizer sentido para você, conheça   │
│ vilas onde a conversa recorrente      │
│ acontece.                             │
│                                       │
│ [ Explorar vilas ]                    │  CTA secundário
├───────────────────────────────────────┤
│ CONFIANÇA E AJUDA                     │
│ Comunidade privada de acesso          │
│ controlado.                           │
│ Regras · Ajuda · Denunciar problema   │
├───────────────────────────────────────┤
│  Cidade      Comunidade    Grupos  Eu │  bottom nav
└───────────────────────────────────────┘
```

### Regras da primeira dobra mobile

- O usuário precisa enxergar `Manaus, AM` e valor imediato sem uma mensagem de déficit por não ter vila.
- O CTA principal deve levar a uma utilidade real disponível agora, não obrigatoriamente a uma vila.
- Não colocar seis eventos antes do guia e da vitrine.
- Não duplicar `Publicar` no header da página.
- Se `/community` continuar exibindo esta variante, o parent/selected state precisa ser resolvido explicitamente (PA-001). O wireframe não legitima a inconsistência atual.

---

## Tablet — 768px

```text
┌──────┬────────────────────────────────────────────────────┐
│ rail │ Manaus, AM                         utilidades      │
│      │ Sua referência na cidade                          │
│      │ [ Próximos eventos ] [ Abrir guia ]               │
│      ├────────────────────────────────────────────────────┤
│      │ PARA AGORA                                        │
│      │ ┌ Próximo evento ─────┐ ┌ Guia de chegada ──────┐ │
│      │ │ data/título/meta    │ │ referência permanente │ │
│      │ └─────────────────────┘ └────────────────────────┘ │
│      ├────────────────────────────────────────────────────┤
│      │ Próximos eventos                                  │
│      │ lista compacta de 3 + “Ver todos”                 │
│      ├────────────────────────────────────────────────────┤
│      │ Vitrine                                           │
│      │ busca + categoria persistentes                    │
│      ├────────────────────────────────────────────────────┤
│      │ Participe do seu jeito                            │
│      │ eventos / grupos / indicações                     │
│      ├────────────────────────────────────────────────────┤
│      │ Vilas em Manaus — descoberta opcional             │
└──────┴────────────────────────────────────────────────────┘
```

Tablet usa rail conforme o shell atual/contrato. O conteúdo não vira simplesmente o mobile esticado; “Para agora” pode usar duas colunas quando o measure permitir.

---

## Desktop — 1440px

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Bivaque                         Indicações  Notificações  Perfil      │
├──────────────┬───────────────────────────────────┬───────────────────┤
│ SIDEBAR      │ MAIN                              │ RIGHT RAIL        │
│              │                                   │                   │
│ Cidade       │ Manaus, AM                        │ ATALHOS ÚTEIS     │
│ Comunidade   │ Sua referência na cidade          │ Próximo evento    │
│ Grupos       │                                   │ Guia de chegada   │
│ Eu           │ [ Próximos eventos ]              │ Grupos            │
│              │ [ Abrir guia ]                    │                   │
│              │                                   │ CONFIANÇA         │
│              │ PARA AGORA                        │ Regras             │
│              │ ┌ evento ─────┐ ┌ guia ────────┐ │ Ajuda              │
│              │ └──────────────┘ └──────────────┘ │ Denúncia           │
│              │                                   │                   │
│              │ PRÓXIMOS EVENTOS                  │ VILAS              │
│              │ 3 linhas compactas + Todos        │ Explorar vilas     │
│              │                                   │ se quiser          │
│              │ VITRINE                           │                   │
│              │ busca + filtro + resultados       │                   │
│              │                                   │                   │
│              │ PARTICIPAÇÃO                      │                   │
│              │ grupos/eventos/indicações         │                   │
├──────────────┴───────────────────────────────────┴───────────────────┤
```

### Right rail

O rail não deve ser preenchido apenas para eliminar espaço vazio (`DS-031`). Ele só permanece se melhorar tarefa/scan. Conteúdo elegível:

1. atalhos úteis do contexto atual;
2. confiança/ajuda;
3. descoberta opcional de vila.

Não usar o rail para dizer que “entrar numa vila” é o próximo passo necessário.

---

## Estados obrigatórios

### Loading

- shell e contexto `Manaus` permanecem estáveis;
- cada módulo usa fallback proporcional ao conteúdo que aguarda;
- não bloquear toda a home porque eventos ou vitrine estão carregando.

### Evento vazio

```text
Próximos eventos
Nenhum evento próximo na cidade.
[ Ver calendário completo ]  (se houver utilidade real)
```

Não inventar urgência ou conteúdo de outra cidade para preencher o vazio.

### Evento com erro

```text
Próximos eventos
Não foi possível carregar os eventos agora.
[ Tentar novamente ]
```

### Catálogo de prestadores realmente vazio

```text
Vitrine de prestadores
Ainda não há prestadores cadastrados por aqui.
Quando houver indicações com alcance para a cidade,
elas aparecem nesta vitrine.
```

A busca pode ser omitida neste **empty estrutural** se não existe universo pesquisável.

### Busca sem resultado

```text
Vitrine de prestadores
[ climatiza................ ]
[ Saúde ▼ ] [ Buscar ]

Nenhum prestador encontrado com esses filtros.
[ Limpar filtros ]
```

Query e filtros permanecem visíveis (`DS-019`).

### Prestadores com erro

```text
Vitrine de prestadores
Não foi possível carregar a vitrine agora.
[ Tentar novamente ]
```

### Nenhuma vila disponível

```text
Vilas em Manaus
Não há vilas disponíveis para entrada neste momento.
Eventos, guia, grupos e prestadores continuam disponíveis normalmente.
[ Como funcionam as vilas ]
```

A ausência de vila não degrada a experiência principal e não cria feed municipal.

### Solicitação de entrada pendente

```text
Vila Ajuricaba
Pedido enviado
[ Pendente ]
```

O estado persiste até mudança real (`DS-028`). Isso é específico de quem optou por solicitar entrada; não é estado global do membro.

---

## Conteúdo e copy

### Preferir

- “Sua referência em Manaus.”
- “Eventos, guia e prestadores da cidade.”
- “Participe do seu jeito.”
- “Se fizer sentido para você, explore as vilas disponíveis.”
- “Vilas são um dos espaços de convivência do Bivaque.”

### Evitar

- “Você ainda não está em uma vila.”
- “Complete sua experiência entrando numa vila.”
- “Seu próximo passo é entrar numa vila.”
- “Sua comunidade de Manaus” para conteúdo municipal;
- “os melhores”, “elite”, “exclusivo para poucos”, “verificado premium”;
- linguagem institucional das Forças Armadas;
- números sociais sem função de decisão;
- claims de personalização quando só houve ordenação genérica.

---

## Ordem de implementação

1. corrigir PA-001 a PA-005;
2. implementar hero contextual orientado à utilidade da cidade;
3. reduzir eventos para preview orientado à decisão;
4. corrigir vitrine e no-results;
5. tornar participação sem vila explicitamente sustentável;
6. reposicionar descoberta de vilas como opcional;
7. adicionar confiança/ajuda;
8. validar 375/768/1440;
9. só então experimentar personalização P2.

O wireframe deve ser julgado pelos três perception gates do `PREMIUM_ASSESSMENT.md`, não por fidelidade a uma estética específica nem por taxa de adesão a vila.
