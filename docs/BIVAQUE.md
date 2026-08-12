# Bivaque — visão e decisões

> **Fonte de verdade sobre o que o produto deve ser.** Visão, papéis, princípios, modelo de
> comunidade, monetização, limites e roadmap.
>
> **Não descreve o que está construído.** Para o estado implementado, com evidência
> arquivo-linha, ver [`PRODUCT_STATUS.md`](PRODUCT_STATUS.md). Confundir os dois é o defeito
> que este documento existe para corrigir: o mapa anterior marcava linha como pronta porque
> a migration existia, e o produto não entregava.
>
> Consolidado em **2026-08-11**.

| Onde procurar | Documento |
|---|---|
| o que o produto **deve** ser | este arquivo |
| o que o código **faz** hoje | [`PRODUCT_STATUS.md`](PRODUCT_STATUS.md) |
| decisões R3, com risco e reversão | [`decisions/`](decisions/) e a régua em [`RISK_MATRIX.md`](decisions/RISK_MATRIX.md) |
| comandos, armadilhas, contratos de teste | [`../AGENTS.md`](../AGENTS.md) |
| linguagem visual e rubrica | [`agents/DESIGN_SPEC.md`](agents/DESIGN_SPEC.md), [`agents/VISUAL_GUIDE.md`](agents/VISUAL_GUIDE.md) |
| implementação da camada de comunidade | [`superpowers/specs/2026-08-05-comunidade-design.md`](superpowers/specs/2026-08-05-comunidade-design.md) |
| evidência dos 151 achados | [`red-team/`](red-team/) |

---

## 1. O que é

### 1.1 O problema

A comunidade militar de Manaus já se organiza — em grupos de WhatsApp de centenas de
pessoas, onde anúncio de peixe, pergunta sobre mudança e horário dos Correios disputam a
mesma tela. O resultado observável é que **as pessoas silenciam o grupo**, e quem silencia
deixa de ver o que importa.

A dor não é falta de canal. É que o canal existente **obriga a escolher entre ruído e
cegueira** — e destrói tudo que deveria durar: a resposta boa de março não serve ninguém em
novembro, e a informação permanente acaba enfiada na descrição do grupo.

### 1.2 A proposta

Uma comunidade local de **acesso controlado** para militares federais, veteranos e
pensionistas de Manaus. O que o WhatsApp não pode dar: elegibilidade conferida na entrada,
fluxos separados por escopo, e acervo que fica e é buscável.

### 1.3 Quem entra, e como

| Papel | Como entra | Elegibilidade conferida por | O que acessa |
|---|---|---|---|
| **Membro** — militar federal, veterano, pensionista | verificação de CPF; ou upload de documento como exceção | o Estado, via Portal da Transparência | tudo do seu escopo: localidade, comunidades e grupos de que participa |
| **Dependente** | convite do titular, vinculado ao e-mail-alvo | o titular, cujo vínculo já foi verificado | igual ao membro, com conta própria e independente |
| **Prestador civil** | indicação de membro verificado | a comunidade que o indicou | **apenas a própria ficha de vitrine.** Não lê feed, nem perfil, nem grupo |
| **Operador** | designação | quem administra o produto | painel de moderação e admissões |
| **Dono de comunidade** | designado ao provisionar a vila | operador | governa a própria comunidade: aprova, remove, delega |

Não é correto dizer que todo mundo ali passou por verificação de CPF: o dependente entra
por vínculo familiar confirmado, e o prestador não é membro. **A promessa exata é acesso
controlado com elegibilidade conferida** — cada papel por quem consegue atestá-lo (§4.1).

### 1.4 O que não é

Não é rede social genérica, não é ERP, não é app de desconto, não é meio de pagamento, e
não é canal oficial das Forças Armadas — é comunitário, sem vínculo institucional.

### 1.5 Relação com o Bivaque original

O produto-mãe (`Juanjfmr/Bivaque`, privado) é maior: multi-tenant desde o dia 1, 74 decisões
soberanas, 19 features, regime formal de ADR e benchmark obrigatório por domínio. Essa
governança é o que impediu o lançamento.

**Este é um fork deliberado**: a menor fatia viável que consegue ir ao ar, para depois
incorporar as features do projeto-mãe. **O canon é referência, não lei.** Onde ele já
resolveu melhor, adotamos — verificação dual-path, versionamento de consentimento,
reputação sem ranking público. Onde é grande demais para lançar, ficamos com a fatia.

---

## 2. Mercado

| Produto | Onde | Verifica | Recorte |
|---|---|---|---|
| [RallyPoint](https://www.rallypoint.com/) | EUA | e-mail militar | nacional, afiliação por unidade |
| [The Military App](https://www.militaryapp.org/) | Reino Unido | status verificado, regimentos | nacional; encontro presencial recorrente; [cobra das organizações](https://www.militaryapp.org/policies/app-terms-and-conditions), não dos membros |
| [weServed](https://weserved.com/) | Reino Unido | certificado do MOD | nacional |
| [Digital Veteran Card](https://www.defenceonline.co.uk/2025/10/23/digital-veteran-card-launches/) | Reino Unido | GOV.UK One Login | prova estatal de status |
| [Veteranos do Brasil](https://veteranosdobrasil.com.br/), [VetMil](https://vetmil.com.br/) | Brasil | associativa | nacional |
| SVPM+, EBChat | Brasil | institucional | app de serviço, não comunidade |
| [Nextdoor](https://about.nextdoor.com/) | global | endereço | local, sem credencial |

**A lacuna:** os concorrentes militares são nacionais e organizados por afiliação; o
Nextdoor é local e organizado por endereço. O cruzamento **local + credencial** não foi
encontrado ocupado nos três mercados pesquisados em 2026-08-11.

**Sobre o teto da categoria.** RallyPoint foi fundado em 2012, levantou cerca de US$ 21,5
milhões e declarou 1 milhão de membros em 2017. Números de estágio de investimento e receita
por membro circulam em agregadores (Tracxn, CB Insights, Crunchbase) e **não foram
confirmados em fonte primária** — a única fonte primária localizada é um Form D de 2024 no
[EDGAR da SEC](https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=1565538&type=D),
que registra a oferta e não sustenta receita. Tratar como sinal direcional, não como
referência de modelagem: rede só-militar cresce devagar mesmo no maior mercado do mundo.

**O que copiar do Nextdoor:** [ficha de negócio gratuita](https://business.nextdoor.com/en-us/getting-started/business-page)
com upgrade pago; indicação positiva por construção; moderação em camadas; prazo público de
resposta a denúncia.

**O que não copiar:** dependência de push agressivo, moderação por voluntário sem regra
escrita, e a deriva do feed para queixa e vigilância.

---

## 3. O modelo de comunidade

### 3.1 Três níveis, pertencimento aditivo

| Nível | Exemplo | Quem está | Conteúdo |
|---|---|---|---|
| **Localidade** | Manaus | todos os membros | eventos da cidade, assuntos das três forças, guia para quem chega |
| **Comunidade** | Vila Ajuricaba + Flores | um subconjunto, que **também** está em Manaus | prestador que atende ali, churrasco, dia dos pais, corrida da vila |
| **Grupo** | dentro da comunidade | recortes temáticos | conversa específica |

Ninguém sai de um nível para entrar no outro. Você está em Manaus **e**, além disso, em
Ajuricaba.

### 3.2 A regra que decide o que é comunidade

> **Se o pertencimento é por interesse, é grupo. Se é por circunstância, é comunidade.**

Vila e turma de formação são circunstância — o fato existe fora do app. "Corrida de rua em
Manaus" é interesse. Essa linha mantém o conjunto de comunidades limitado pelo mundo real e
torna o provisionamento manual sustentável indefinidamente.

**O modelo de dados não grava "vila".** A entidade é comunidade genérica; "Vila" é rótulo de
tela. Quando aparecer o próximo eixo — turma, coorte de transferência de dezembro — ele
entra sem migration.

### 3.3 Público é relativo ao container

Um grupo público **dentro** de uma comunidade é visível aos membros daquela comunidade, não
à cidade. Sem essa regra, grupo público na vila vira porta dos fundos para Manaus inteira.

### 3.4 Por que três níveis

A hierarquia é o remédio para a dor do §1.1: uma sala indiferenciada já é insuportável em
630 pessoas e inutilizável em milhares. Cada nível existe para ter densidade suficiente sem
virar ruído.

**Premissas de mercado, não contagem de membros.** Nenhum destes números é população atual
do produto:

| Base | Valor | Origem |
|---|---|---|
| Militares federais na ativa em Manaus | 8 a 15 mil | estimativa a partir de CMA/12ª RM, VII COMAR e 9º DN, todos sediados em Manaus. Não conferido em fonte oficial |
| Inativos e pensionistas na cidade | 9 a 13 mil | estimativa por razão nacional inativo+pensionista por ativo, ajustada para baixo |
| Alcance morno imediato | milhares | um único grupo de WhatsApp de duas vilas tem **630 membros** — número observado, não estimado |
| Endereçável total | 15 a 28 mil | soma das faixas acima; as estimativas do painel divergiram nessa banda |

Regra de densidade adotada, derivada do Nextdoor e ajustada para a homofilia muito maior
deste público: um feed precisa de algo em torno de **30 a 40 pessoas ativas por semana** para
não parecer parado. É isso que a hierarquia protege — e a validação é medição, não cálculo.

---

## 4. Confiança e verificação

### 4.1 Cada fato é atestado por quem consegue atestá-lo

| Fato | Quem atesta | Como |
|---|---|---|
| "é militar, veterano ou pensionista" | o Estado | CPF contra o Portal da Transparência |
| "é dependente de um titular" | o titular verificado | convite vinculado ao e-mail-alvo |
| "é de Ajuricaba" | o dono da comunidade | aprovação explícita — o Portal não sabe e nunca vai saber |
| "é bom prestador" | a comunidade | indicação de membro verificado |

### 4.2 Verificação — alvo

Caminho primário: CPF → Portal da Transparência, server-side, chave em variável de ambiente.
Caminho de exceção: upload de documento por canal auditado, storage privado, TTL curto,
decisão humana na fila de admissões.

**Anti-enumeração obrigatória:** resposta genérica e idêntica para CPF inexistente,
não-militar, falha de API e hash divergente. O cliente nunca sabe por quê. Limite de 3
consultas por hora por usuário.

**`pending` precisa ter produtor real.** Timeout e instabilidade do Portal devem produzir
`pending`, nunca um erro que devolve a pessoa ao formulário sem memória. Sob entrada em lote
(§5.1) isso deixa de ser refinamento e vira requisito de sobrevivência do lançamento.

### 4.3 Privacidade

**Nunca persistir:** CPF em claro, payload do Portal, endereço residencial, documento além
do TTL, e selo público de verificação. Numa rede onde a elegibilidade é conferida na
entrada, selo é redundante.

**Perfil oculto sai do produto** — um estado só, visível aos membros. Isso remove o único
controle de visibilidade que o membro tinha, e por isso carrega uma pré-condição: verificar
se existe perfil real com `hidden` antes de qualquer migration, e **nunca virar a chave em
silêncio**. Ver `PRODUCT_STATUS.md` §3.

**Afiliação declarada — decisão pendente.** Permitir que o membro declare força, situação,
OM e turma contradiz `AGENTS.md:205`, que proíbe persistir organização militar. Isso é R3 e
está em [`ADR-20260811-om-declarada`](decisions/ADR-20260811-om-declarada.md), com cinco
requisitos antes de aprovar: threat model de enumeração, proteção além de rate limit, tela
de consentimento, tratamento dos perfis `hidden` existentes, e governança LGPD publicada.
**Enquanto o ADR estiver `proposed`, o contrato vigente é a proibição.**

### 4.4 Governança LGPD — a escrever

Falta publicar: controlador, finalidade de cada tratamento, base legal, prazo de retenção,
processo de eliminação, exercício dos direitos do titular, canal de contato e plano de
resposta a incidente. A ANPD orienta medidas técnicas e administrativas mesmo para agente de
pequeno porte, e explicita os direitos de acesso, correção e eliminação.
[Guia da ANPD](https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-sobre-seguranca-da-informacao-para-agentes-de-tratamento-de-pequeno-porte) ·
[direitos dos titulares](https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados-1/direito-dos-titulares).

É pré-requisito do ADR da OM e do lançamento, não item de backlog.

---

## 5. Entrada

### 5.1 A vila chega inteira

A unidade de aquisição é a **comunidade**, não a pessoa. O operador provisiona a comunidade
e nomeia como dono o administrador do grupo de WhatsApp existente; ele compartilha o link no
grupo; a vila entra.

**Um tiro por vila.** O link vai para centenas de pessoas de uma vez. Se o app estiver
quebrado naquele dia, não se perde um usuário — perde-se a vila, e a notícia chega nas
outras em vinte e quatro horas, porque os administradores se conhecem.

### 5.2 Dois níveis, duas concessões

| Nível | Concessão |
|---|---|
| **Manaus** | automática após verificação — é fato que o Estado atesta |
| **Vila** | aprovação explícita do dono da comunidade |

O link **não concede** a vila. Herdar uma lista de WhatsApp acumulada em vinte meses
significaria confiar numa checagem que ninguém fez — e o CPF prova que a pessoa é militar,
não que mora ali.

Três ganhos: link vazado vira inofensivo, porque gera pedido e não acesso; a rajada contra a
API do Portal se espalha pelos dias em que o dono trabalha a fila; e a aprovação fica
registrada com autor, virando ato com dono em vez de carimbo.

**Requisito:** a fila é de **lote**, com seleção múltipla e afiliação visível — não um
diálogo por pessoa —, e o dono delega a moderadores.

### 5.3 O que o dono da comunidade ganha

Fluxos separados, busca que funciona, ficha de prestador que não rola para cima, controle de
quem entra e sai, e mural permanente. Se a primeira versão não melhorar a vida **dele**, ele
não manda o link.

### 5.4 Convites — duas semânticas que o código não pode confundir

| | Convite de membro | Convite familiar |
|---|---|---|
| Para quem | outro militar, veterano ou pensionista | dependente sem vínculo militar próprio |
| Verificação | **obrigatória**, sem exceção | **é** a via alternativa — concede sem CPF |
| Carrega | quem convidou **e** para qual comunidade | vínculo com o titular |
| Cota | por membro | cinco ativos |

O convite familiar exige que o aceite confira o e-mail-alvo. Sem isso, link encaminhado
provisiona quem abrir — e esta é a única via que concede acesso sem verificação de CPF.

---

## 6. A experiência-alvo

A tela inicial é **pedidos abertos e próximo encontro**, não uma linha do tempo. Feed exige
centenas de pessoas para não parecer deserto; lista de pedidos funciona com dezenas.

O ciclo semanal é **pedir e responder**: alguém pergunta, alguém responde, o autor é avisado
por e-mail, marca como resolvido, e quem respondeu acumula isso no perfil. É o menor ciclo
que fecha, e é exatamente o que o WhatsApp destrói.

O ciclo mensal é o **encontro presencial recorrente** — o que deu identidade ao Military App
e o que uma rede nacional não entrega.

Sustentando os dois: verificação na porta, diretório buscável, vitrine de prestador,
moderação que age, e e-mail transacional como único canal de retorno.

O estado de cada uma dessas superfícies está em [`PRODUCT_STATUS.md`](PRODUCT_STATUS.md).

---

## 7. Monetização

### 7.1 A linha

- **Acesso** — existir, participar, perguntar, responder, ter ficha na própria vila.
  **Nunca se cobra.**
- **Amplificação** — alcançar além do que se alcançaria naturalmente. **Aqui se cobra.**

A regra é sobre **papel, não sobre pessoa**: o ser humano, como membro, nunca paga; o
negócio dele, como negócio, pode pagar. Escrita ao contrário — "militar nunca paga" —
criaria uma vitrine de duas classes, onde o vendedor civil paga e o militar não, competindo
lado a lado.

### 7.2 Linhas de receita

| Linha | Como |
|---|---|
| Ficha na própria vila | **grátis, sempre**, completa; ordenação por relevância e reputação, nunca por dinheiro |
| Alcance além da vila | pago — aparecer em outras vilas e no nível Manaus |
| Ferramenta | agendamento, catálogo maior, estatística da própria página. Não afeta ninguém |
| Patrocínio de momento | a corrida da vila patrocinada pela academia. Delimitado e declarado |
| Organização | associação, clube e condomínio pagam por ferramenta de gestão da própria vila |

Referência de faixa: o Nextdoor cobra
[US$ 32 a 150 por mês por CEP](https://powerdigitalmarketing.com/blog/nextdoor-advertising-cost/)
em patrocínio de bairro, e o gasto típico de pequeno negócio fica entre US$ 100 e 500 por
mês.

### 7.2.1 Categorias da vitrine

Lista fechada. Categoria primária é o sinal mais forte de descoberta, e é o que faz filtro e
busca funcionarem — sem ela a vitrine é uma lista que ninguém percorre.

**Alimentação** · **Casa e reformas** · **Assistência técnica** · **Mudança e transporte** ·
**Imóveis** · **Documentação e finanças** · **Saúde e bem-estar** · **Beleza** ·
**Educação e aulas** · **Automotivo** · **Eventos e festas** · **Pets**

Baseada em GetNinjas e OLX, com três desvios deliberados do padrão de mercado:

- **Alimentação** não existe como categoria de serviço em nenhuma das duas, e é o caso
  demonstrado no grupo de classificados da vila — peixe, marmita, bolo.
- **Documentação e finanças** é específica deste público: pensão, inventário, transferência,
  despachante, seguro.
- **Assistência técnica** fica separada de Casa e reformas porque ar-condicionado em Manaus
  é, na prática, uma categoria própria.

Três regras que sustentam a lista:

1. **Não existe "Outros".** Vira depósito, chega a metade das fichas e mata o filtro. O que
   não couber é sinal para criar categoria por decisão — nunca por usuário.
2. **Categoria só se divide** quando passar de ~15 fichas ativas. Começar largo e dividir sob
   pressão é reversível; abrir com doze categorias vazias não é.
3. **Produto e serviço convivem na mesma taxonomia.** O catálogo do WhatsApp Business já
   prova que o mesmo formato — item com foto, descrição e preço — serve para corte de peixe e
   para "Limpeza Pós-Obra". A ficha não precisa de tipo separado.

A granularidade da vitrine tem o mesmo problema de densidade do feed (§3.4): categoria demais
com prestador de menos faz tudo parecer vazio ao mesmo tempo.

### 7.3 Proibido

1. **Intermediar o pagamento do serviço entre membro e prestador.** O dinheiro do corte de
   cabelo, do conserto ou do peixe nunca passa pelo Bivaque — nem interesse do produto, nem
   superfície que um fundador solo sustente, porque meio de pagamento traz regulação,
   obrigação fiscal e disputa de estorno.
   > **Isto não proíbe a plataforma de cobrar pelos próprios produtos.** Impulsionamento,
   > ferramenta e assinatura de organização são receita do Bivaque e são permitidos (§7.2).
   > A fronteira é entre "ser o caixa da transação alheia" e "vender o que é seu".
2. **Cobrar para não ser enterrado.** É vender proteção. Numa comunidade onde todos se
   conhecem, a percepção circula em dias.
3. **Ordenar indicação por dinheiro.** Mata o único ativo do produto.
4. **Anúncio no meio do feed.**
5. **Crédito consignado militar.** O anunciante mais lucrativo e mais predatório para
   exatamente esse público.

### 7.4 O filtro para qualquer ideia futura

1. Se ninguém pagasse, o produto ainda serviria bem a todos? Se não, é proteção.
2. O que o pagante comprou está declarado como pago, visivelmente? Se não, é engano.
3. A resposta a uma pergunta de confiança muda por causa de dinheiro? Se sim, o ativo morreu.

### 7.5 Ordem de grandeza — hipótese, não projeção

| Premissa | Faixa | Confiança |
|---|---|---|
| Prestadores pagando alcance | 50 a 100 | nenhuma — não há prestador cadastrado |
| Preço mensal por prestador | R$ 40 a 80 | ancorado na faixa do Nextdoor, ajustado para baixo |
| Churn mensal | não estimado | **lacuna** — muda o resultado materialmente |
| Eventos patrocinados por ano | 12 a 20 | nenhuma |
| Preço por patrocínio | R$ 300 a 800 | nenhuma |
| Organizações pagantes | 3 a 5 | nenhuma |
| Preço por organização | R$ 150 a 300/mês | nenhuma |
| Custo de operação | não estimado | **lacuna** |
| **Resultado bruto** | **R$ 35 a 130 mil/ano** | hipótese a validar, não meta |

As duas lacunas — churn e custo — impedem chamar isto de projeção. O número serve para uma
coisa só: dimensionar a ambição. Isto é **negócio de um fundador**, não startup financiável.

### 7.6 Veículo jurídico — pendente de assessoria

**O fundador não é a cabeça do Bivaque.** O
[Art. 29 da Lei 6.880/80](https://www.planalto.gov.br/ccivil_03/leis/l6880compilada.htm)
restringe ao militar da ativa comerciar e gerir sociedade comercial, com exceção prevista
para acionista ou quotista sem gerência. Qual arranjo satisfaz isso — associação existente,
sociedade com terceiro na gerência, ou outra forma — **é questão jurídica e exige parecer
profissional**, não redação interna. O que está decidido é o princípio: quem consta decide e
administra de fato, e um arranjo nominal não resolve o que se propõe a resolver.

Isso também é força estrutural: um produto cuja cabeça não depende da lotação do fundador
sobrevive à transferência dele.

---

## 7.7 Stack e infraestrutura

O que já existe: **Next 16** em runtime de servidor na **Vercel**, React 19, **Supabase**
(`ssr` + `js`), **HeroUI v3** como única biblioteca de componentes, Tailwind 4, Biome, pnpm
11.18 com `apps/web` mais `packages/{contracts,domain,tokens}`. PWA com manifest e service
worker. Cinco camadas de teste: unit e privacy em Vitest, scope em `node --test`, pgTAP e
Playwright.

O que as decisões de 2026-08-11 acrescentam:

| Necessidade | Escolha | Por quê |
|---|---|---|
| E-mail transacional | **Resend** | feito para transacional em stack JS; domínio e DKIM são trabalho humano, não de agente |
| Segundo canal de retorno | **WhatsApp não-oficial agora, Cloud API ao escalar** | ver §7.8 — carrega risco assumido |
| Rate limit e circuit breaker | **Upstash Redis** | um mecanismo só para os quatro limites; não põe escrita no banco primário a cada requisição, o que importa em 50 mil membros |
| Agendamento | **pg_cron** | vive junto do dado, entra por migration, versionado como o resto do schema |
| Disparo de notificação | **tabela `outbox` + worker no pg_cron** | sobrevive a queda do provedor, permite retentativa, deixa rastro, e é onde a preferência e o descadastro são verificados |
| Rastreamento de erro | **Sentry** | com filtro de PII obrigatório antes do envio |
| Produto e métrica | **PostHog** | responde as perguntas de 90 dias sem escrever SQL. Sai dado comportamental para terceiro: exige base legal declarada na governança LGPD |
| Cobrança da plataforma | **Asaas** | Pix e boleto nativos, que é como prestador pequeno brasileiro paga. Checkout hospedado; o cartão nunca toca o Bivaque |
| Migration para produção | **GitHub Action no merge para `main`** | credencial de produção como secret do CI, nunca no laptop — é o que a Task 8 do plano de observabilidade pede |
| Busca de prestador | **filtro exato + `pg_trgm` no nome** | nativo do Postgres, aguenta muito além de 50 mil, sem serviço novo onde dado pessoal passe a viver |

**Sem ambiente de staging.** A Action leva a migration direto para produção. O CI roda
`db:reset` mais pgTAP contra banco limpo em todo PR, o que pega erro estrutural mas **não
pega erro de migração sobre dado real**. Risco aceito conscientemente.

**Sem modo escuro.** Verificado em 2026-08-11: `globals.css` tem apenas
`[data-theme="bivaque"]`, nenhum `prefers-color-scheme`, e nenhum token de dark. Não entra no
piloto.

### 7.8 O canal de WhatsApp — risco assumido e como sobreviver a ele

O Cloud API oficial exige **CNPJ**, site público com domínio batendo com o nome, endereço e
telefone conferindo com o registro, e número dedicado. Está acoplado ao veículo jurídico do
§7.6, que depende de parecer. Até lá, o canal é não-oficial.

O que isso custa, para constar: viola os termos explicitamente, o banimento é **permanente e
sem recurso**, e os sinais de detecção descritos pela Meta — baixa taxa de resposta, mensagem
para quem está longe no grafo de contatos, temporização robótica, tráfego de datacenter —
descrevem exatamente este caso de uso. Relatos de banimento em 2 a 8 semanas.

Requisitos que tornam a decisão sobrevivível, e que são obrigatórios:

1. **Número descartável e dedicado.** Nunca o do fundador, nunca o de um administrador de
   vila. O que se perde num banimento tem que ser um chip.
2. **Canal abstraído no `outbox`.** Coluna de canal e adaptadores no worker. Migrar para o
   Cloud API depois é adaptador novo, não reescrita.
3. **Degradar, não quebrar.** Falha ou banimento cai para e-mail automaticamente.
4. **Reduzir sinal:** só para quem optou, só para quem está na comunidade, com jitter e
   volume baixo. O tráfego de datacenter é inevitável na Vercel e no Supabase.
5. **Opt-out com "PARE"**, verificado no worker antes de cada envio.

### 7.9 O limite do Portal da Transparência

| Janela | Limite |
|---|---|
| 00:00 às 06:00 | 700 requisições/minuto |
| Demais horários | 400 requisições/minuto |
| APIs restritas | 180 requisições/minuto |
| **Ultrapassar** | **token suspenso por 8 horas** |

Fonte: [página da API de Dados](https://portaldatransparencia.gov.br/api-de-dados) e o
[Swagger](https://api.portaldatransparencia.gov.br/swagger-ui/index.html) — confirmar antes
de codificar, porque não sabemos se o endpoint de servidores conta como API restrita.

**O risco não é o volume, é a punição.** Uma vila de 630 pessoas cabe em minutos mesmo no
limite mais baixo, e o teto de 3 consultas por hora por usuário espalha muito mais que isso.
Mas um retry em laço, ou um bug, mata a admissão por 8 horas no meio do lançamento. Portanto:

- **throttle global no servidor**, com teto bem abaixo de 180/min;
- **circuit breaker no Upstash**: ao receber 429, parar de chamar e mandar todos para
  `pending` — é isto que torna a D08 crítica;
- **proibido retry automático em laço.**

Com os três, a entrada por link aberto é segura.

## 8. Fora e adiado

**Fora por decisão:** publicação anônima, vídeo, escopo nacional, alerta por push e SMS.

**Adiado, não proibido:** IA, app nativo, outras cidades, mensagem direta.

Anúncio merece distinção, porque as duas menções neste documento parecem se contradizer e
não se contradizem: **anúncio de terceiro sem relação com a comunidade** está adiado e pode
voltar; **anúncio no meio do feed** está proibido pela D29 e não volta.

**Mensagem direta entre membros** continua adiada: o bloqueio é contornável pelo bloqueador,
não há realtime nem notificação, a autorização sobrevive à expulsão do grupo e a denúncia
cai em fila que ninguém lê. Meio canal privado é pior que nenhum, e a ajuda entre membros
acontece em público, que é mais moderável.

**Mas a conversa membro ↔ prestador abre** (D36). A máquina existente é reaproveitada com um
contexto novo em vez de removida — ela já tem autorização contextual, bloqueio, denúncia e
limite de tamanho, e os defeitos que a auditoria achou precisariam ser corrigidos de
qualquer forma. Consequência prática: **a onda B não remove mais a superfície de DM**, e as
correções de bloqueio e contexto passam a ser pré-requisito da onda G, não item descartado.

---

## 9. Decisões

Régua de risco em [`decisions/RISK_MATRIX.md`](decisions/RISK_MATRIX.md). Decisão R3 exige
ADR próprio em [`decisions/`](decisions/); as demais vivem nesta tabela. Uma decisão só muda
aqui, com data e motivo.

| ID | Status | Data | Decisão | Motivo | Reabrir quando |
|---|---|---|---|---|---|
| **D01** | vigente | 2026-08-11 | Fork deliberado do produto-mãe; o canon é referência, não lei | a governança do original impediu o lançamento | o fork alcançar escala que justifique o regime completo |
| **D02** | vigente | 2026-08-11 | A localidade é a unidade do piloto — Manaus, não a OM | a comunidade real é geográfica; OM vira afiliação | segunda cidade entrar em planejamento |
| **D03** | vigente | 2026-08-11 | Três níveis com pertencimento aditivo | uma sala indiferenciada já é insuportável em 630 | — |
| **D04** | vigente | 2026-08-05 | Interesse é grupo; circunstância é comunidade | mantém o conjunto limitado pelo mundo real | — |
| **D05** | vigente | 2026-08-11 | Vila é a primeira comunidade; o modelo não grava "vila" | outros eixos vão aparecer | — |
| **D06** | vigente | 2026-08-05 | Público é relativo ao container | senão grupo público na vila abre para a cidade | — |
| **D07** | vigente | 2026-08-11 | Verificação dual-path, com anti-enumeração e 3 consultas por hora | caminho único mata conversão e rejeição falsa é definitiva | — |
| **D08** | vigente | 2026-08-11 | `pending` com produtor real e reconciliação server-side | sob entrada em lote, queda do Portal vira rejeição em massa | — |
| **D09** | vigente | 2026-08-11 | Perfil oculto removido; um estado só | a promessa absoluta nunca foi cumprida pelo comportamento | qualquer sinal de que membros deixam de declarar por falta de controle |
| **D10** | **proposta** | 2026-08-11 | Afiliação declarada, OM inclusive → [ADR](decisions/ADR-20260811-om-declarada.md) | é o eixo de afinidade mais forte da categoria | — |
| **D11** | vigente | herdada | Nunca persistir CPF em claro, payload do Portal, endereço, documento além do TTL, selo público | fronteira de privacidade do produto | — |
| **D12** | vigente | 2026-08-11 | Consentimento e código de conduta com aceite versionado | é a base contratual da suspensão | — |
| **D13** | vigente | 2026-08-11 | A vila chega inteira, pelo administrador do grupo existente | a comunidade já existe; converter é mais barato que criar | — |
| **D14** | vigente | 2026-08-11 | Manaus é concedida por verificação; a vila, pelo dono da comunidade | ninguém confia numa checagem que não fez | — |
| **D15** | vigente | 2026-08-11 | Convite de membro carrega atribuição e escopo; verificação sempre obrigatória | é canal de aquisição, não atalho de verificação | — |
| **D16** | vigente | 2026-08-11 | Convite familiar é a única via sem CPF; o aceite confere o e-mail-alvo | senão é passe ao portador para a via mais permissiva | — |
| **D17** | vigente | 2026-08-11 | Prestador civil tem login apenas para a própria ficha | sem ele não há oferta; com acesso amplo não há fronteira | — |
| **D18** | vigente | 2026-08-11 | Indicações são dois produtos: Explorar e Pedir indicação, com resposta visível | write-only não entrega valor a ninguém | — |
| **D19** | vigente | 2026-08-11 | Resposta de indicação é positiva por construção | elimina difamação e metade da carga de moderação | — |
| **D20** | vigente | 2026-08-11 | Vitrine entra no piloto | é o comportamento demonstrado da comunidade hoje | — |
| **D21** | vigente | 2026-08-11 | Filtro de vocabulário no banco removido; aviso de PII na UI | proíbe palavras que a comunidade real usa, inclusive "patente" e "OM" | — |
| **D22** | vigente | 2026-08-11 | E-mail transacional dentro do piloto; push e SMS fora | sem canal de retorno próprio, o único é o concorrente | push quando houver app nativo |
| **D23** | vigente | 2026-08-11 | Política de nomes: normalização, sem controle e bidi, 2-80 | segurança, não produto | — |
| **D24** | vigente | 2026-08-11 | Operador age sobre conteúdo **e** pessoa, com motivo e retorno ao denunciante | ação sobre conteúdo não resolve quando o problema é a pessoa | — |
| **D25** | vigente | 2026-08-11 | Moderação em três camadas, com prazo público | modelo do Nextdoor, sem o erro do voluntário sem regra | — |
| **D26** | vigente | herdada | Nunca intermediar transação | regulação de meio de pagamento não cabe num fundador solo | — |
| **D27** | vigente | 2026-08-11 | Acesso é grátis; amplificação é paga. A regra é sobre papel | "militar nunca paga" criaria vitrine de duas classes | — |
| **D28** | vigente | 2026-08-11 | Grátis na própria vila; pago para alcançar além | é distribuição, não proteção | — |
| **D29** | vigente | 2026-08-11 | Proibidos: anúncio no feed, ordenação por dinheiro, consignado, pagar para não ser enterrado | cada um destrói o ativo de confiança | — |
| **D30** | vigente | 2026-08-11 | O fundador não é a cabeça do produto | Art. 29, e sobrevivência à transferência. Arranjo pendente de parecer (§7.6) | — |
| **D31** | vigente | 2026-08-11 | Fora: anônimo, vídeo, nacional, push e SMS, modo escuro. Adiados: IA, nativo, outras cidades, DM entre membros | — | — |
| **D32** | vigente | 2026-08-11 | E-mail transacional por **Resend** | transacional em stack JS; domínio e DNS são trabalho humano | — |
| **D33** | vigente | 2026-08-11 | **WhatsApp não-oficial** agora, Cloud API quando houver CNPJ (§7.8) | o oficial está bloqueado pelo veículo jurídico; risco assumido com cinco requisitos de sobrevivência | banimento do número, ou CNPJ constituído |
| **D34** | vigente | 2026-08-11 | **Upstash Redis** para os quatro limites e o circuit breaker | não põe escrita no banco primário a cada requisição; escala a 50 mil sem refazer | — |
| **D35** | vigente | 2026-08-11 | **pg_cron** como agendador, **`outbox` + worker** como disparo | agendamento versionado por migration; envio que sobrevive a queda de provedor | — |
| **D36** | vigente | 2026-08-11 | Conversa **membro ↔ prestador** reaproveita a máquina de DM com contexto `provider` | os defeitos precisariam ser corrigidos de qualquer forma; reconstruir custa mais | — |
| **D37** | vigente | 2026-08-11 | Prestador é usuário do Auth com papel, sem membership, e tem **dashboard próprio** — anúncio, métrica e caixa de pedidos | sem membership nenhuma policy de conteúdo casa: falha fechado por construção | — |
| **D38** | vigente | 2026-08-11 | Suspensão por **flag em `profiles` + helper na RLS** | reversível, auditável, permite suspensão temporária. Entra em toda policy de escrita na mesma migration | — |
| **D39** | vigente | 2026-08-11 | **Sentry** para erro, com filtro de PII antes do envio | log da Vercel some e ninguém lê | — |
| **D40** | vigente | 2026-08-11 | **PostHog** para métrica de produto | responde as perguntas de 90 dias. Sai dado comportamental para terceiro: exige base legal na governança LGPD | — |
| **D41** | vigente | 2026-08-11 | **Asaas** para a cobrança da plataforma; checkout hospedado, cartão nunca toca o Bivaque | Pix e boleto nativos, que é como prestador pequeno paga | cobrança internacional |
| **D42** | vigente | 2026-08-11 | Migration para produção por **GitHub Action no merge**; **sem staging** | tira a credencial de produção do laptop. Risco de migração sobre dado real fica aceito | primeira migração de dado que exija ensaio |
| **D43** | vigente | 2026-08-11 | **Não existe busca de pessoas no piloto.** A OM é exibida no perfil, não é filtrável | remove o vetor principal de enumeração e reduz o que o ADR precisa provar | quando o ADR da OM for aprovado com threat model |
| **D44** | vigente | 2026-08-11 | Busca de prestador por **filtro exato + `pg_trgm` no nome** | nativo do Postgres, sem serviço novo onde dado pessoal passe a viver | — |
| **D45** | vigente | 2026-08-11 | Ficha de vitrine = **identidade + catálogo + portfólio**. Prova social e avisos ficam para depois | são os três blocos que o prestador preenche sozinho no dia um. Prova social depende do ciclo de indicação rodando; avisos dependem de moderação | — |
| **D46** | vigente | 2026-08-11 | **Throttle global + circuit breaker** contra o Portal; retry em laço proibido (§7.9) | o risco não é volume, é a suspensão de 8 horas do token no meio do lançamento | — |
| **D47** | vigente | 2026-08-11 | **Nada é cortado do escopo.** O lançamento é por vila, com o que estiver pronto | não cortar não significa tudo pronto em dezembro; significa ordenar para que o inacabado não impeça abrir a primeira vila | — |

**Superado pela D09:** a decisão D9 da `2026-08-05-comunidade-design.md` (co-membro vê
perfil oculto) perdeu objeto. O aviso de divulgação na entrada continua valendo para o nome.

**Reaberto pela D20:** aquela spec listava "marketplace dentro da vila" como fora de escopo.

### 9.1 Registro de reversões de escopo

Em 2026-08-11 o piloto **cresceu**, e cada item foi decidido isoladamente. O total:

| Reversão | Estava | Passou a ser | Motivo | Custo |
|---|---|---|---|---|
| Camada de comunidade | congelada com trava técnica | é a porta de entrada | a vila é a unidade real de aquisição, e o banco já está pronto | ligar UI que não existe |
| Vitrine e conta de prestador | adiada | dentro do piloto | é o comportamento demonstrado no grupo de WhatsApp | superfície nova + tipo de conta novo |
| E-mail transacional | fora do piloto | dentro | sem canal de retorno o produto não retém | provedor + domínio |
| Busca por OM | proibida | proposta em ADR R3 | eixo de afinidade da categoria | threat model + LGPD + consentimento |
| Indicações | um produto parcial | dois produtos completos | write-only não entrega valor | resposta, detalhe, controles do autor |
| Moderação | sobre conteúdo | sobre conteúdo e pessoa | incidente real exige agir sobre quem | suspensão + recurso |
| Monetização | adiada | desenhada, com alcance pago | o comércio já acontece | vitrine paga |

**A tensão que isto cria, registrada e não resolvida:** este documento afirma que o ativo não
é volume de feature, e o escopo aprovado é o maior que o projeto já teve. Ontem eram oito
ondas de saneamento; hoje são oito ondas mais sete construções. **Ninguém somou o total
contra dezembro** (§10). Se a soma não couber, o corte é decisão do dono, e a ordem de corte
sugerida é a inversa desta tabela: monetização primeiro, comunidade por último.

---

## 10. Sequenciamento

**Dezembro é a janela.** Transferência das três forças: chega gente que precisa de moradia,
escola e serviço, e sai gente que precisa vender móvel e passar contato. Demanda aguda,
bilateral, com data marcada, que se repete todo ano. Se o produto não for usado em dezembro,
não vai ser usado.

| # | Onda | O que entra | Tamanho |
|---|---|---|---|
| **A** | Portas e vazamentos | open redirect no callback; `service_role` sem policy em detalhe de grupo e evento; endpoint de avatar; destinos de notificação; CPF fora do `sessionStorage`; selo público removido | pequena |
| **B** | Coerência por subtração | affordances mortas; remoção do perfil oculto com a pré-condição do §4.3; preferência sem produtor; o diff pendente do login. **Não remove mais a DM** (D36) | pequena |
| **C** | Devolver a fala | derrubar as CHECK de vocabulário; ajustar os pgTAP que afirmam a rejeição; aviso de PII na UI | pequena |
| **D1** | Infraestrutura | Resend com domínio e DKIM; Upstash com os quatro limites e o circuit breaker; pg_cron; `outbox` com worker; Sentry | média, **zero tela** |
| **D2** | A porta | gate pelo estado real; `pending` com produtor; upload de documento com TTL; recurso de rejeição; convite familiar amarrado ao e-mail; consentimento e código de conduta versionados; validação de CPF; waitlist com cidade | grande |
| **E** | A vila | ligar a camada de comunidade que já está no banco; fila de aprovação em lote; convite de membro com escopo; perfil de outro membro; afiliação declarada | grande |
| **F** | O laço semanal | resposta de indicação com detalhe e controles do autor; escopo explícito e FK do `group_id`; salvar com destino; RSVP completo; convite de evento com fan-out; encontro recorrente | média-grande |
| **G** | Vitrine | ficha com identidade, catálogo e portfólio; conta e dashboard de prestador; conversa membro↔prestador com os P0 da DM corrigidos; Asaas com alcance pago; busca de prestador | grande |
| **H** | Operação | denúncia unificada em todos os alvos; ocultação por tipo; suspensão com flag e RLS; retorno ao denunciante; admissões que decide; PostHog | média |

### 10.1 Caminho crítico

```
A ─┐
B ─┼──→ (independentes, correm em paralelo)
C ─┘         │
             ▼
        D1 ──┬──→ D2 ──→ H
             ├──→ E ───→ G
             └──→ F
```

A **D1 não entrega tela nenhuma e destrava quase tudo** — é a onda mais fácil de subestimar
e a mais cara de adiar. A onda A não espera ninguém, pela exceção de segurança.

### 10.2 Nada é cortado, e o lançamento é por vila

A D47 fecha o escopo sem cortes. Isso **não** significa tudo pronto em dezembro — significa
que a ordem tem que permitir abrir com o que estiver pronto.

O modelo vila a vila resolve isso: não é preciso ter tudo para todas as vilas, só o
suficiente para **uma**. Dezembro abre Ajuricaba e Flores com o que existir; G e H aterrissam
enquanto a segunda vila espera. Isso também combina com o risco do tiro único (§5.1) — abrir
uma vila, aprender, depois a próxima.

Para a primeira vila existir, o mínimo é **A, B, C, D1, D2, E e F**: entrar, a vila chegar
inteira, pedir e receber ajuda, marcar encontro — sem vazar e sem mentir.

Se algo escorregar, o que escorrega são G e H, e cada um custa diferente. Sem **G**, falta a
vitrine, que é o comportamento que o grupo de 630 pessoas já demonstra hoje — e é a única
onda com receita. Sem **H**, abre-se para centenas de militares identificáveis com moderação
parcial: denúncia de DM e de indicação não chegam ao painel, e não existe suspensão. **H é a
que não deveria escorregar**, porque o custo não é feature, é o primeiro incidente.

Cada onda termina em auditoria visual, que bloqueia a seguinte, conforme
[`superpowers/plans/2026-08-05-auditoria-telas.md`](superpowers/plans/2026-08-05-auditoria-telas.md),
e vira um plano próprio em `superpowers/plans/`.

---

## 11. Riscos e pré-condições

1. **Um tiro por vila** (§5.1). A onda A é pré-condição de lançamento, não higiene:
   vazamento descoberto por 630 militares no mesmo dia é outro tipo de problema.
2. **Rajada contra a API do Portal.** Dimensionar o limite de taxa antes de definir se a
   entrada é por link aberto ou por lotes. É o que torna a D08 crítica.
3. **A D10 não pode ser implementada** antes dos cinco requisitos do ADR, e `AGENTS.md:205`
   não muda antes disso.
4. **Governança LGPD (§4.4) é pré-requisito de lançamento**, não backlog.
5. **Migration aplicada não se edita.** Toda mudança de constraint ou policy entra como
   migration nova.
6. **A D21 muda testes que hoje passam.** Os pgTAP que afirmam a rejeição de vocabulário
   mudam no mesmo todo.
7. **O escopo cresceu e nada foi cortado** (§9.1, D47). A mitigação é a ordem e o lançamento
   por vila (§10.2), não o corte. Se dezembro chegar com G e H incompletas, a decisão de
   abrir mesmo assim é do dono — e H incompleta significa abrir sem suspensão de conta.
8. **Três bloqueios não são resolvíveis por agente:** conta e DNS do Resend; número
   descartável para o WhatsApp; CNPJ para o Cloud API e para o Asaas. Enquanto não
   existirem, D1 não fecha, e sem D1 quase nada fecha.
9. **Sem staging** (D42): erro de migração sobre dado real chega direto à produção.
10. **O produto precisa sobreviver à transferência do fundador.**
11. **Trabalho de escrita ainda pendente**, e nenhum deles é decisão: o texto do código de
    conduta (exigido pela D12), a governança LGPD (§4.4) e a lista fechada de categorias da
    vitrine — essa última tem que sair do conteúdo real do grupo, não de suposição.

---

## 12. Regras permanentes de arquitetura

1. Nenhum Server Component ou route de usuário renderiza objeto de domínio com
   `service_role` sem chamar o helper de acesso e negar antes de montar a UI.
2. Toda criação de conteúdo mostra a audiência antes do submit.
3. Capability em migration não entra em produto sem entrada → ação → feedback →
   acompanhamento → sad path principal.
4. UI só mostra affordance se o fluxo fecha hoje.
5. Copy de privacidade é contrato: ou muda a copy antes do piloto, ou muda o comportamento.
6. **Coluna de escopo e as policies que a leem nascem na mesma migration.** Quatro
   vazamentos até aqui vieram de ignorar isto.
7. Todo caminho de permissão tem teste positivo e negativo.
8. O Bivaque é conector, nunca caixa; membro e dependente nunca pagam.
