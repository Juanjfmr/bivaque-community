# Bivaque — Rodada 12: grupos de serviço com especialidade

Data: 15/10/2026. Contrato: `docs/agents/tasks/HTML-012.task.yml` (R2). Base: `78b2c241`.

**Veredito: PASS, com uma ressalva registrada.** O fluxo funciona, a revisão independente
não deixou achado aberto, e a regressão funcional e o gate estão verdes. A prova visual
estrita acusa diferença só no HTML da Início: os nomes das categorias nos cartões de
negócio, que é a mudança aprovada (detalhe abaixo, em Prova).

## Decisões do usuário (15/10/2026)

- **Mais tipos de serviço, sem lista gigante:** os serviços passam a ser organizados por
  grupo, com uma especialidade opcional dentro de cada um. A lista foi aprovada como
  proposta.
- **Quem recebe um pedido com especialidade:** as empresas do grupo que marcaram essa
  especialidade, ou que não marcaram nenhuma (essas atendem o grupo todo).
- **"Indicar negócio em página de evento e contar como indicação não faz o menor
  sentido":** marcar um negócio num comentário de grupo agora só existe ao **responder uma
  pergunta**.

## O que mudou

| Onde | Antes | Depois |
| --- | --- | --- |
| Contratar serviço | 11 categorias soltas | **13 grupos** (12 + Outros). Depois de escolher o grupo, aparece **Especialidade (opcional)**, que não aparece em Outros |
| Página do negócio | Categoria | **Tipo de serviço** + **chips de especialidade** (opcional; nenhuma marcada = atende o grupo todo) |
| Indicar um negócio | Categoria | Tipo de serviço (grupo). Quem assumir a página completa as especialidades |
| Pedido e lista | Categoria | O título é a especialidade (ex.: "Hidráulica"), com o grupo abaixo |
| Página do negócio (leitura) | "Elétrica · Manaus" | "Casa e reparos · Elétrica · Manaus" |
| Busca e Negócios | Nome, categoria e serviços | Também encontram pela especialidade |
| Comentário em grupo | "Marcar um negócio" em qualquer publicação, inclusive evento | Só ao **responder uma pergunta**. Em evento, oferta, enquete ou publicação comum não há campo nem indicação, nem com tela adulterada |

Os grupos: Casa e reparos, Climatização e eletrodomésticos, Limpeza e jardim, Mudança e
transporte, Veículos, Saúde, Beleza e bem-estar, Educação, Pets, Festas e comida,
Tecnologia, Documentos e consultoria, e Outros. As especialidades estão em
`src/features/businesses/taxonomy.js`.

**Dados de exemplo:** os arquivos congelados não mudaram. As categorias antigas são
convertidas na carga, inclusive no estado já salvo no navegador de quem testou antes
(negócios, minha página e pedidos). Exemplos: Elétrica → Casa e reparos · Elétrica;
Refrigeração → Climatização e eletrodomésticos · Geladeira e freezer; Mecânica → Veículos
· Mecânica. A conversão também vale para "Recomeçar do zero" e para a troca de cenário.

## Revisão independente

Nenhum CRITICAL.

- **HIGH corrigido:** "Recomeçar do zero" e "Trocar cenário" recriavam o estado com as
  categorias antigas. Os pedidos não encontravam empresas até recarregar a página.
- **MEDIUM corrigido:** a página do negócio e a indicação aceitavam um grupo inexistente
  vindo de tela adulterada. A indicação passou a validar também o bairro.
- **MEDIUM corrigido:** a frase "Enviado para N empresas de ..." usava o grupo em vez da
  especialidade.
- **MEDIUM corrigido, lacunas de prova:** entraram provas para empresa sem especialidade,
  "Recomeçar", minha página com categoria antiga, grupo adulterado e uma verificação mais
  estrita do pedido antigo.
- **LOW corrigidos:** os pedidos fictícios do prestador ignoravam a especialidade; um
  filtro antigo de Negócios podia voltar pelo histórico do navegador.
- **LOW mantido de propósito:** a indicação escolhe só o grupo. Quem indica é a comunidade,
  e as especialidades ficam com quem assumir a página.

## Prova

| Prova | Resultado |
| --- | --- |
| Rodada 12 (9 verificações × 6 contextos) | PASS, 54/54, 0 erros JS, 0 requisições externas |
| Rodada 04, com "marcar negócio só em pergunta" | PASS, 84/84 |
| Rodadas 11, 10, 09, 08, 07, 06, 05, 03, 02 | PASS: 78/78, 72/72, 24/24, 42/42, 48/48, 36/36, 72/72, 108/108, 72/72 |
| Rodadas 01 e 00.1, estabilidade visual | PASS |
| Gate completo | PASS (lint, typecheck, build, test, secrets) |
| Visual estrito (Início e Criar contra a base da Rodada 00.1) | **FAIL só no HTML**: pixels dentro do ruído em todos os contextos |

**Ressalva da prova visual.** A comparação estrita exige o mesmo HTML da base congelada.
A única diferença, conferida texto a texto em 375 px, são as categorias nos cartões de
negócio da Início, abaixo da área visível: "Comida" virou "Festas e comida" e "Aulas" virou
"Educação". É exatamente a mudança aprovada. A nova base congelada, aprovada pelo usuário,
entra na Rodada 13 (Início do desktop). Até lá, esta é a diferença conhecida.

Candidato: `3f1a1e0f7f5da99f3f7624cea30123d1ae964193d71781dd9ce197d6a56e0cf7` (2.901.206 bytes).
