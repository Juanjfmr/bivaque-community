# Síntese da Fase 2 — Red Team de Produto

Consolidação dos relatórios `lote-1-*` e `lote-2-*`, produzidos em
2026-08-10. Esta síntese não substitui os relatórios por domínio; ela extrai
as causas raiz e a arquitetura recomendada.

## Números

- **151 findings** documentadas.
- **22 P0** identificadas.
- 12 relatórios de domínio + Camada 0.
- Nenhum código de produto alterado; entregas são documentais.

## P0 por domínio

| Domínio | P0 |
|---|---|
| Âncoras | F5 |
| Onboarding | F15, F27 |
| Feed/Publicação | F31, F42 |
| Grupos | F60 |
| Eventos | F80 |
| Mensagens | F98 |
| Notificações | F109, F110, F112 |
| Indicações | F119, F120, F121 |
| Moderação | F160, F161, F162, F165, F173 |
| Admin | F177, F180, F182 |

## Causas raiz

### R1 — `service_role` em superfície de usuário sem reaplicar a policy

O padrão aparece em detalhe de grupo, detalhe de evento e destinos de
notificação: páginas voltadas ao usuário leem com privilégio elevado e não
reaplicam `can_access_*`. Resultado: objetos privados ficam acessíveis por
deep link ou por notificação residual.

Findings: F60, F80, F109, F110.

**Regra arquitetural:** nenhum Server Component/route de usuário usa
`service_role` para renderizar objeto de domínio sem chamar explicitamente o
helper de acesso correspondente e negar antes de montar a UI.

### R2 — Escopo existe no banco, mas a UI publica/lê sem modelo mental

Posts e eventos têm `locality_id`, `group_id`, `community_id`, mas a UI fala
genericamente em “comunidade” e não dá controle claro de audiência. O risco
principal é o usuário achar que publica para 20 e publicar para Manaus inteira.

Findings: F31, F32, F78, F79, F150-F155.

**Regra arquitetural:** toda criação de conteúdo deve mostrar explicitamente o
escopo antes do submit. Se não houver seletor de escopo, a UI precisa dizer
“visível para membros verificados de Manaus”.

### R3 — Capacidade de banco sem superfície completa

Comunidades, convites de evento, replies de indicações, bookmarks de
indicações, DM por evento/família/recommendation, e várias operações de
moderação existem parcial ou totalmente no schema, mas sem ciclo de usuário.

Findings: F10, F11, F115-F124, F150-F155, F160-F174.

**Regra arquitetural:** capability em migration não entra em produto até ter:
entrada → ação → feedback → acompanhamento → sad path principal.

### R4 — Affordance fraud sistêmico

Elementos clicáveis ou promessas visuais existem sem comportamento real:
“Manter conectado”, “Esqueci minha senha”, sino, chevron de localidade,
foto/enquete no composer, “0 de 3 passos” do grupo, comentários de evento,
preferências de notificação, aba Convidado sem envio.

Findings: F1, F2, F6-F9, F38-F39, F71-F73, F89, F112.

**Regra arquitetural:** UI só mostra affordance se o fluxo fecha hoje. Caso
contrário, remover até implementar.

### R5 — Privacidade declarada não bate com comportamento

CPF em `sessionStorage`, selo público de “Membro verificado”, perfil `hidden`
visível a co-membros de comunidade, preferências de notificação ignoradas,
PII livre no motivo de denúncia.

Findings: F5, F14, F42, F49-F50, F112, F173.

**Regra arquitetural:** copy de privacidade é contrato. Se o comportamento
técnico precisar divergir, a copy muda antes do piloto; se a copy for a
promessa, o comportamento muda.

### R6 — Operação existe, mas não permite decisão sob pressão

Admin e moderação têm painel, mas ainda não entregam contexto, ação segura,
feedback, recurso e governança suficientes. Admissions observa, mas não age;
reports consome só parte dos alvos; probes podem dar falso verde.

Findings: F164-F174, F175-F184.

**Regra arquitetural:** painel operacional precisa responder: o que aconteceu,
quem é afetado, qual decisão posso tomar, qual o risco, que efeito minha ação
terá e como desfazer/registrar.

### R7 — Comunicação privada ainda não é produto fechado

DM existe, mas sem realtime, sem unread, sem notificação, com autorização que
persiste após perda de contexto, e bloqueio contornável pelo bloqueador via
Data API. Denúncias de DM caem em fila invisível.

Findings: F90-F103, F100, F102, F98.

**Regra arquitetural:** DM só deve permanecer se o produto aceitar o custo de
abuso: notificação, bloqueio enforceado no banco, denúncia consumida, perda de
contexto, rate limit e operação.

## Arquitetura recomendada

### KEEP

- Modelo Supabase com schema `private` para confiança/verificação.
- Manaus como localidade piloto.
- Feed municipal simples, desde que audiência fique explícita.
- Grupos, desde que detalhe volte a respeitar RLS e o ciclo de entrada/admin
  seja fechado.
- Admin, como painel próprio, desde que deixe de ser apenas observacional.

### MODIFY

1. **Entrada/onboarding**
   - Fechar open redirect do callback (F15).
   - Aplicar gate de verificação no shell, não apenas sessão+cookie (F16).
   - Remover armazenamento de CPF ou alterar copy (F5).
   - Separar CPF inválido de inelegibilidade (F19).
   - Corrigir waitlist: coletar localidade desejada, não gravar Manaus como
     “outras localidades” (F24).
   - Convite familiar: entregar token, validar e-mail-alvo, tratar expirado,
     usado, encaminhado e sessão perdida (F26-F28).

2. **Shell/perfil/privacidade**
   - Remover affordances mortas (F1, F2, F6-F9).
   - Resolver semântica de `hidden` antes de lançar Comunidades (F14/F50/F154).
   - Implementar perfil alheio ou remover destinos que fingem existir (F45-F46).
   - Preferências de notificação só aparecem se os triggers as respeitarem
     (F53/F112).

3. **Feed/publicação**
   - Corrigir escritas centrais e autoria obrigatória (F30).
   - Mostrar audiência antes de publicar (F31).
   - Remover selo público de verificação (F42).
   - Remover foto/enquete até funcionarem (F38-F39).
   - Dar destino para salvos ou remover salvar (F34).

4. **Grupos/eventos**
   - Remover `service_role` sem policy nos detalhes (F60/F80).
   - Permitir abrir detalhes a partir das listas (F61/F76).
   - Fechar gestão de grupo: cancelamento, rejeição, remoção, exclusão,
     ownership seguro (F63-F70).
   - Eventos: edição/cancelamento/conclusão coerentes, RSVP funcional,
     validação de data e escopo (F77-F89).

5. **Mensagens/notificações**
   - Corrigir criação de DM por ordenação UUID (F92).
   - Enforce de bloqueio no banco para ambos os lados (F98).
   - Decidir se DM permanece; se sim, adicionar unread/realtime/notificação,
     rate limit e denúncia consumida (F95-F103).
   - Notification fan-out deve respeitar preferências (F112).

6. **Moderação/admin**
   - Unificar targets de denúncia e painel consumidor (F160-F162).
   - Ocultação precisa esconder de fato cada target (F165-F166).
   - Sanitizar/limitar motivo de denúncia contra PII (F173).
   - Admissions precisa agir, não só observar (F175-F176).
   - Probes não podem dar falso verde nem confundir key inválida com rejeição
     de elegibilidade (F180-F183).

### REMOVE até implementar

- “Manter conectado” e “Esqueci minha senha”.
- Chevron de localidade.
- Foto/enquete no composer.
- “0 de 3 passos” do grupo.
- Comentários de evento “Em breve”.
- Aba Convidado se não houver envio + notificação.
- “Salvar” onde não há destino recuperável.
- Qualquer preferência de notificação ignorada por triggers.

### MERGE / SPLIT

1. **Comunidades** — decisão principal.
   - SPLIT: virar entidade real (“Vilas/Turmas”) com descoberta, entrada,
     aprovação, feed, moderação, saída e aviso de privacidade.
   - MERGE: absorver no conceito de Grupo/Localidade e não operar
     `community_id` no piloto.

2. **Indicações**
   - Hoje mistura descoberta de grupos/eventos, pedido de recomendação e
     salvos. Separar “Explorar” de “Pedir indicação”, ou assumir que
     Indicações é um produto próprio com resposta, moderação e privacidade.

3. **DM**
   - Ou vira canal real com custo de abuso, ou é removido/deferido para depois
     do piloto. Meio canal privado é pior que nenhum canal privado.

## Decisões que precisam voltar ao dono

1. O que significa **perfil oculto** com Comunidades?
2. Comunidade é entidade de produto ou resíduo de arquitetura?
3. DM é necessário no piloto?
4. Indicações é discovery, pedido de recomendação ou ambos?
5. Consentimento precisa de trilha auditável no aceite ou só gate de UX?
6. Convite de evento merece existir agora?
7. Preferências de notificação são compromisso real ou seção prematura?
8. Qual é o nível de operação/moderação aceitável para o piloto Manaus?

## Ordem recomendada de saneamento

1. **Privacidade/segurança P0**: F5, F15, F27, F42, F60, F80, F98, F109,
   F110, F112, F160-F162, F165, F173, F177, F180, F182.
2. **Remoção de affordance fraud**: retirar elementos mortos para reduzir
   promessa falsa antes de qualquer redesign.
3. **Decisões Balde B estruturais**: Comunidades, perfil hidden, DM,
   Indicações, consentimento.
4. **Reabrir MAP**: várias áreas marcadas Corrigida não se sustentam sob
   Red Team (feed/publicação, perfil, grupos, eventos, notificações,
   mensagens, moderação/admin).
5. **Nova arquitetura do produto**: depois das decisões B, transformar os
   fluxos mantidos em ondas implementáveis com teste positivo/negativo.
