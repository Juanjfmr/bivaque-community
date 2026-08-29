# HOME sem vila — wireframe textual Premium

## Escopo

Variante de `/community` para membro autenticado e localizado, porém sem vila aprovada.

Este wireframe é **proposta de produto**, não contrato normativo. Ele respeita:

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
│ Você ainda não está em uma vila.      │
│                                       │
│ Sua referência na cidade              │
│ Eventos, guia e prestadores enquanto  │
│ você escolhe onde participar.         │
│                                       │
│ [ Encontrar uma vila ]                │  CTA primário
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
│                                       │
│ [ Ver todos os eventos ]              │
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
│ VILAS EM MANAUS                       │
│ A vila é onde a conversa recorrente   │
│ acontece. Você pede entrada e o dono  │
│ aprova.                               │
│                                       │
│ Vila Ajuricaba                        │
│ contexto útil · [Solicitar entrada]   │
│                                       │
│ Vila X                                │
│ contexto útil · [Solicitar entrada]   │
│                                       │
│ [ Ver todas as vilas ]                │
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

- O usuário precisa enxergar `Manaus, AM`, o estado “sem vila” e o CTA `Encontrar uma vila` rapidamente.
- Não colocar seis eventos antes do guia e do caminho de pertencimento.
- Não duplicar `Publicar` no header da página.
- Se `/community` continuar exibindo esta variante, o parent/selected state precisa ser resolvido explicitamente (PA-001). O wireframe não legitima a inconsistência atual.

---

## Tablet — 768px

```text
┌──────┬────────────────────────────────────────────────────┐
│ rail │ Manaus, AM                         utilidades      │
│      │ Você ainda não está em uma vila.                  │
│      │ [ Encontrar uma vila ] [ Abrir guia ]              │
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
│      │ Vilas em Manaus                                   │
│      │ 2–3 itens ou CTA de descoberta                    │
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
│ Cidade       │ Manaus, AM                        │ SEU PRÓXIMO PASSO │
│ Comunidade   │ Você ainda não está em uma vila.  │                   │
│ Grupos       │                                   │ Entre numa vila   │
│ Eu           │ [ Encontrar uma vila ]            │ para participar   │
│              │ [ Abrir guia ]                    │ do ciclo local.   │
│              │                                   │ [Ver vilas]       │
│              │ PARA AGORA                        │                   │
│              │ ┌ evento ─────┐ ┌ guia ────────┐ │ CONFIANÇA         │
│              │ └──────────────┘ └──────────────┘ │ Regras             │
│              │                                   │ Ajuda              │
│              │ PRÓXIMOS EVENTOS                  │ Denúncia           │
│              │ 3 linhas compactas + Todos        │                   │
│              │                                   │                   │
│              │ VITRINE                           │                   │
│              │ busca + filtro + resultados       │                   │
│              │                                   │                   │
│              │ VILAS EM MANAUS                   │                   │
│              │ itens de descoberta               │                   │
├──────────────┴───────────────────────────────────┴───────────────────┤
```

### Right rail

O rail não deve ser preenchido apenas para eliminar espaço vazio (`DS-031`). Ele existe porque duas informações permanentes merecem persistência durante a rolagem:

1. próximo passo de pertencimento;
2. acesso a confiança/ajuda.

Se isso não melhorar tarefa/scan em teste, o rail deve desaparecer em vez de virar decoração.

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
Quando membros das vilas indicarem prestadores de confiança,
eles aparecem nesta vitrine.
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
Ainda não há uma vila disponível para sua entrada.
Você pode continuar usando eventos, guia e prestadores da cidade.
[ Como funcionam as vilas ]
```

Não converter ausência de vila em feed municipal.

### Solicitação de entrada pendente

```text
Vila Ajuricaba
Pedido enviado
[ Pendente ]
```

O estado persiste até mudança real (`DS-028`).

---

## Conteúdo e copy

### Preferir

- “Você ainda não está em uma vila.”
- “Encontre uma vila para participar das conversas recorrentes.”
- “Sua referência em Manaus.”
- “Eventos, guia e prestadores da cidade.”

### Evitar

- “Sua comunidade de Manaus” para conteúdo municipal;
- “os melhores”, “elite”, “exclusivo para poucos”, “verificado premium”;
- linguagem institucional das Forças Armadas;
- números sociais sem função de decisão;
- claims de personalização (“escolhido para você”) quando só houve ordenação genérica.

---

## Ordem de implementação

1. corrigir PA-001 a PA-005;
2. implementar hero contextual + prioridade `Encontrar uma vila`;
3. reduzir eventos para preview orientado à decisão;
4. corrigir vitrine e no-results;
5. melhorar descoberta de vilas;
6. adicionar confiança/ajuda;
7. validar 375/768/1440;
8. só então experimentar personalização P2.

O wireframe deve ser julgado pelos três perception gates do `PREMIUM_ASSESSMENT.md`, não por fidelidade a uma estética específica.
