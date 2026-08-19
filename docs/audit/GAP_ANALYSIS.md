# Bivaque Community — gap analysis

> Data: 2026-08-19. Baseline analisado: `main@ce918f1`.

## 1. Diagnóstico executivo

O Bivaque Community não está travado por falta de features. Está travado por **fechamento de ciclos e ordem de dependências**.

A P0 fez a correção estrutural mais importante recente: produto nacional desde o cadastro, localidade como membership e Manaus como rollout, não fronteira. O próximo risco é voltar a construir horizontalmente e deixar capacidades pela metade.

A prioridade real é:

1. restaurar baseline/gates confiáveis;
2. executar T;
3. fechar D2;
4. executar E;
5. executar F;
6. instalar o piso de moderação necessário para abrir superfícies privadas/comerciais;
7. construir G;
8. fechar H e telemetria.

## 2. Gaps bloqueantes de engenharia

### GAP-E01 — CI não distingue regressão de dívida preexistente

`main` ainda carrega o BOM em `supabase/database.generated.ts`. O PR #24 prova que, ao removê-lo, o pipeline avança e revela um segundo problema em `family-invite-locality.sql`: fixture com UUID inválido e contagem de asserts inconsistente.

**Consequência:** Goal Mode/autonomous loop sobre esse baseline pode gastar tentativas “corrigindo” falhas que não pertencem à task.

**Fechamento:** gate completo verde e reproduzível antes de T.

### GAP-E02 — harness de review tem falso vermelho

O check Claude/DeepSeek pode terminar com sucesso e zero achados, mas falhar pelo teto de 40 turns. O problema é de julgamento do harness, não do código revisado.

**Fechamento:** separar “review produziu FAIL” de “infra do reviewer excedeu orçamento”. Não aceitar check vermelho ambíguo como juiz determinístico.

### GAP-E03 — `PRODUCT_STATUS.md` está temporalmente atrás da P0

A data global ainda é 15/08; commits de 17–19/08 mudaram localidade, membership, seed, E2E e auditoria visual.

**Fechamento:** nova reconciliação factual antes de usar o documento como contrato de execução.

## 3. Gaps de produto por domínio

### Entrada e confiança

- decisão manual de upload documental não existe;
- `pending` existe, mas o ciclo operacional ainda depende da D2;
- consentimento versiona o aceite, mas os textos não podem ser tratados como publicados enquanto os bloqueios humanos/jurídicos não fecharem;
- convite familiar ainda precisa fechar entrega/sad paths;
- waitlist geográfica virou código morto;
- transferência é alvo crítico de dezembro e ainda não começou.

### Comunidade

- camada de comunidade existe, mas a home ainda não executa completamente D48;
- fila de dono de comunidade ainda não é operação em lote completa;
- perfil alheio e convite de membro ainda não fecham aquisição/pertencimento;
- navegação/container ainda depende de E.

### Ciclo semanal e mensal

- respostas de indicação ainda não fecham retorno/notificação;
- server actions de grupo/evento têm risco de authz conhecido;
- RSVP é incompleto;
- evento recorrente não existe;
- fan-out de convite de evento não existe.

### Vitrine

Tudo o que define a experiência de prestador é `NOT STARTED`: identidade, admission, listing, search, dashboard, billing e alcance.

### Operação

Existe fila e ação sobre parte do conteúdo, mas não existe sistema operacional completo:

- `dm_reports` órfã;
- alvos novos não reportáveis;
- texto livre de denúncia pode carregar PII;
- suspensão de pessoa não existe;
- denunciante não recebe retorno;
- admissões não têm decisão;
- PostHog não existe.

## 4. Contradições/arestas que o roadmap atual não resolve sozinho

### C01 — G depende de H antes de H “começar”

O canon abre conversa membro↔prestador em G. Hoje denúncia de DM cai em uma tabela que nenhum painel lê e não existe suspensão de pessoa. Abrir a DM comercial antes de corrigir isso significa lançar um canal privado cujo principal sad path de segurança não fecha.

**Correção proposta:** H deve ter uma subfase **H0 — safety floor** antes do task de DM da G:

- denúncia unificada incluindo DM;
- motivo limitado/sanitizado;
- operador consegue agir;
- suspensão de escrita existe.

H continua fechando depois de G com admissões, feedback e PostHog.

### C02 — `PRODUCT_STATUS` diz que dashboard de prestador depende de PostHog

Essa dependência não é necessária. D37 pede “métrica”; D40 escolhe PostHog para métrica de produto. Misturar os dois torna dado apresentado ao prestador dependente de um terceiro de analytics e obriga H a preceder G inteira.

**Correção proposta:** a primeira métrica do dashboard é first-party e auditável: **conversas/contatos iniciados no contexto `provider`**, derivada do próprio banco. PostHog fica para analytics interno em H. Se no futuro houver page views no dashboard, decidir separadamente como medi-los.

### C03 — G tem dois produtos escondidos no mesmo nome

“Vitrine” reúne:

1. marketplace gratuito funcional;
2. monetização/amplificação paga.

O segundo depende de CNPJ, pricing e webhook Asaas; o primeiro não.

**Correção proposta:** executar G em duas subfases:

- **G1 — Vitrine Core:** prestador, ficha, catálogo, portfólio, busca, dashboard básico, contato seguro;
- **G2 — Amplificação:** entitlement, checkout Asaas, webhook, alcance pago, sinalização de alcance.

G1 pode entregar valor e validar oferta mesmo com G2 bloqueada externamente.

### C04 — DM entre membros está adiada, mas a UI ainda cria DM entre membros

`/messages` tem `Nova conversa` e lista membros de grupos compartilhados. O canon mantém a superfície de DM apenas porque a máquina será reutilizada para prestador; não autoriza reabrir member↔member.

**Correção proposta:** em G, remover/desabilitar a criação genérica de conversa entre membros e permitir criação nova somente pela ficha de prestador. Conversas históricas podem continuar legíveis conforme as policies vigentes.

### C05 — bloqueio da DM é assimétrico

O pgTAP atual considera positivo que o bloqueador continue enviando para quem bloqueou. Isso é incompatível com a expectativa de “bloqueio” e permite assédio unilateral.

**Correção proposta:** bloqueio fecha escrita nos dois sentidos; desbloqueio só pelo bloqueador reabre.

### C06 — pagamento e ordenação precisam ser independentes

D27–D29 permitem pagar por amplificação e proíbem pagar por ordenação. Implementar “plano pago” como peso de ranking violaria o canon mesmo que a cobrança esteja tecnicamente correta.

**Correção proposta:** billing gera **entitlement de visibilidade/alcance**, nunca score de ordenação. Dentro do conjunto elegível, ordenação permanece não financeira.

### C07 — suspensão precisa entrar em todas as policies de escrita de uma vez

D38 é explícita. Adicionar uma coluna `suspended` primeiro e “aplicar nas policies depois” abre uma janela de bypass e repete o padrão de scope/policy que já produziu vazamentos.

**Correção proposta:** uma única migration cria o estado, helper e altera todas as policies de INSERT/UPDATE/DELETE. Scope test deve garantir que novas policies não esqueçam o helper.

### C08 — H unifica reports, mas novos alvos chegam em F/G

Se H esperar G terminar, recomendação, evento, provider profile/catalog e provider DM podem nascer sem alvo de denúncia.

**Correção proposta:** o report model de H0 nasce extensível antes da DM de G e aceita a taxonomia completa conhecida. Cada feature nova só entra se registrar seu alvo de report no mesmo todo.

## 5. Bloqueios humanos que não devem virar “todo de agente”

1. definição/revisão do veículo jurídico;
2. CNPJ para Asaas/Cloud API;
3. conta Resend + domínio + DKIM/SPF;
4. número WhatsApp dedicado;
5. revisão jurídica da política de privacidade;
6. assinatura/aceite do código de conduta;
7. decisão de pricing e produtos de alcance antes de ativar G2;
8. aprovação R3/critic PASS para pagamentos, novas fronteiras de prestador e suspensão/moderação.

Agente pode preparar código atrás de feature/config gate quando o plano permitir; não pode declarar produção pronta sem esses fatos.

## 6. Decisões que precisam ficar explícitas antes de executar G/H

### G

- convite de prestador deve ser single-use e vinculado ao e-mail-alvo? **Recomendado: sim**;
- unidade grátis é a comunidade que indicou o prestador? **Recomendado: sim**, coerente com D28;
- alcance pago pode ser por comunidade e/ou localidade? **Recomendado: modelar entitlement genérico para ambos, sem inventar preço**;
- busca exibe apenas provider publicado e alcançável pelo container atual;
- catálogo não reutiliza `recommendation_category` porque aquele domínio contém `outros`, proibido pela regra da vitrine.

### H

- suspensão bloqueia escrita, não leitura, conforme D38;
- motivo/ação ficam em log de moderação, não como texto mutável no perfil;
- retorno ao denunciante confirma análise sem revelar sanção ou dado do denunciado;
- eventos do PostHog são allowlist e nunca carregam texto de post, DM, busca, denúncia, nome, CPF, OM, endereço ou documento.

## 7. Critérios para reabrir o roadmap

Replanejar a ordem se qualquer um ocorrer:

- T exigir mudança estrutural que altere o conceito de container usado por E/G;
- E trocar o modo de pertencimento da vila ou o shell de prestador;
- F mudar a máquina de DM/recommendation de forma incompatível com provider context;
- parecer jurídico impedir a linha de monetização D27/D28;
- H0 mostrar que a máquina de DM atual é mais cara de corrigir do que substituir;
- segundo rollout de cidade exigir entitlement geográfico diferente do previsto.