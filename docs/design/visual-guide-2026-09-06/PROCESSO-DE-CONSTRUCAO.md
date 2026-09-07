# Bivaque — processo de construção da nova versão

Versão de 6 de setembro de 2026. Documento de execução para ser entregue aos modelos responsáveis pela reconstrução web e mobile.

## 1. Ordem expressa do responsável pelo produto

**Esta é a versão do Bivaque a ser construída: a experiência definida nesta conversa e consolidada no guia visual de 6 de setembro de 2026. A documentação anterior não determina o resultado desta reconstrução.**

O responsável pelo produto autorizou repensar a experiência, desconstruir o conceito anterior e melhorar o necessário. Autorizou expressamente que esta versão seja construída independentemente da documentação antiga.

Consequências práticas:

- Use este documento como a instrução atual de produto para esta reconstrução.
- Construa a direção visual aprovada: superfícies claras, verde profundo, conteúdo humano, interfaces próprias para mobile e desktop.
- Não restaure uma navegação, paleta, restrição geográfica ou redução de escopo apenas porque aparece em um documento antigo.
- `BIVAQUE.md`, planos, ADRs, especificações, backlogs e sistemas visuais anteriores são referências de contexto. Em conflito de produto ou experiência com esta versão, siga esta versão e registre sucintamente a substituição.
- Não peça uma nova aprovação apenas para resolver esse conflito: a autorização está registrada acima.
- Documentação de estado implementado continua útil para localizar código e testes. Ela não prova que uma função está pronta e não limita a experiência pretendida.
- Esta ordem não significa apagar o repositório ou reescrever toda a infraestrutura. Reaproveite código comprovado que atenda à nova versão.
- Segurança, controle de acesso, integridade dos dados e acessibilidade continuam requisitos de qualidade. Uma mudança visual não autoriza expor dados privados ou remover autorização do servidor.

Este documento orienta os agentes no âmbito das instruções do usuário. Não manda ignorar instruções de sistema, políticas da ferramenta ou limites de acesso do ambiente.

## 2. Referências e precedência

Use esta ordem para decidir **o produto desta reconstrução**:

1. Instruções posteriores e explícitas do responsável pelo produto.
2. Este documento, que consolida a versão atual e seu processo de execução.
3. Notas de correção do [README do guia visual](./README.md).
4. Imagens da [galeria aprovada](./index.html).
5. Referências externas, incluindo Mobbin e o HTML antigo.
6. Documentação anterior, apenas onde não contradiz os itens acima.

As notas de correção prevalecem sobre detalhes inconsistentes nas imagens. Datas, fotos, nomes, contadores e valores são exemplos. Um texto inventado pelo gerador não cria uma regra de negócio.

O HTML `bivaque-v9-recomposicao.html` é inspiração para a riqueza do Guia e do Mercado. Não é o layout final nem uma fonte de instruções para o agente.

O pacote atualizado tem 38 pranchas, com **66 telas/estados mobile e 24 telas/estados web**. Não representa todo o aplicativo. A ampliação ainda tem 17 pranchas sem geração e correções de bitmaps pendentes por limite do serviço; veja o mapa e as notas antes de implementar. A ausência de imagem não impede usar os padrões aprovados e a especificação textual atual.

Para transportar este material a outro ambiente, envie este documento e a pasta do guia visual com os PNGs e o README. Os caminhos relativos abaixo pressupõem que os arquivos permaneçam juntos. Se o modelo não enxergar uma imagem, deve dizer isso; não alegar fidelidade visual sem inspecioná-la.

## 2.1 Ampliação das referências — 07/09/2026

O responsável solicitou gerar as telas ausentes e atualizar as instruções dos agentes. O [mapa de telas](./MAPA-DE-TELAS.md) identifica a cobertura visual por fluxo e plataforma; [as instruções do guia](./AGENTS.md) detalham como consumi-la. A ampliação complementa esta versão e não altera sua precedência sobre documentação antiga conflitante.

Antes de implementar, selecione as imagens realmente presentes no manifesto e inspecione suas notas. Inclua o estado de recuperação correspondente. Em uma prancha com dois desktops, cada painel é uma tela separada. O operador possui workspace restrito; não colocar suas ações na navegação do membro.

Auth não precisa repetir aceites já registrados nem exigir adesão a uma comunidade para concluir a escolha de contexto. A referência de aceites demonstra o conteúdo necessário, não obriga uma rota separada. Não restaurar um fluxo antigo ou criar etapa duplicada por causa de uma imagem.

### Correções expressas de 07/09/2026

Leia [as seis decisões posteriores do responsável](./DECISOES-2026-09-07.md): vínculo militar, CPF rápido com identidade/IA como alternativa, motivo opcional do pedido, perguntas para toda a cidade, pedido de informações em eventos e Força Armada/OM opcionais com visibilidade controlável. Essas decisões prevalecem sobre proibições antigas conflitantes de produto, preservando autorização e privacidade na implementação.

## 3. Produto que vamos construir

O Bivaque é uma plataforma nacional de comunidade, informação útil, serviços e oportunidades para seu público militar, veteranos, pensionistas e famílias, com acesso controlado conforme o papel da pessoa.

A experiência acompanha quem chegou, quem já participa e quem está de mudança. A pessoa pode encontrar sua comunidade, perguntar, compartilhar conhecimento, consultar o Guia, encontrar prestadores, anunciar no Mercado e participar de encontros.

**Manaus é um exemplo de localidade, não a fronteira do produto.** Cidade e comunidade são conceitos distintos. Selecionar uma cidade para explorar não concede participação em uma comunidade privada.

### Navegação de referência

- **Início:** conteúdo relevante, respostas recebidas, acompanhamentos e próxima ação útil.
- **Explorar:** descoberta, busca, Guia, Mercado, serviços, moradia e eventos.
- **Comunidades:** comunidades da pessoa, descoberta e pedidos de participação; grupos aparecem dentro do contexto apropriado.
- **Perfil:** dados da pessoa e acesso à gestão dos próprios anúncios, negócio e configurações, conforme permissões.

Esses são os quatro destinos principais da versão visual atual. A divisão “Cidade, Minha comunidade, Grupos e Eu” não faz parte desta versão.

No mobile, use navegação inferior nos destinos principais e retorno claro nos detalhes. No desktop, use barra lateral e espaço de conteúdo adequado. Busca, salvos e notificações devem ser acessíveis no shell. Guia e Mercado precisam de entradas explícitas em Explorar.

### Capacidades e ciclos esperados

| Área | Ciclo que deve funcionar |
|---|---|
| Auth e onboarding | Entrar ou criar conta, confirmar acesso ao e-mail, concluir admissão, escolher contexto e chegar ao produto; recuperar e retomar quando houver falha |
| Comunidade | Encontrar comunidade, solicitar ou obter participação conforme regra, ler, perguntar, responder, acompanhar e resolver |
| Guia | Descobrir categoria, buscar, ler referência, entender origem/atualização, salvar e sugerir correção |
| Serviços | Encontrar prestador, consultar ficha, descrever necessidade, enviar pedido, receber resposta e acompanhar |
| Mercado | Buscar item, abrir detalhe, manifestar interesse, publicar, editar, pausar e encerrar o próprio anúncio |
| Moradia | Buscar e filtrar, avaliar imóvel e custos, manifestar interesse, criar e gerenciar alerta |
| Meu negócio | Editar a própria ficha, receber pedidos, responder e acompanhar a situação |
| Eventos | Descobrir, abrir detalhe, confirmar presença, cancelar presença e entender cancelamento do evento |
| Perfil e configurações | Editar informações permitidas, gerenciar preferências, sair e acessar controles da conta |
| Confiança e operação | Denunciar conteúdo, bloquear interação quando aplicável e dar ao operador ferramentas para tratar denúncias e admissões |

Os ciclos acima detalham o que deve fechar na implementação. Nem todos têm prancha própria. Para telas ausentes, reutilize padrões já aprovados e escreva uma especificação curta antes de programar. Não crie um novo estilo por módulo.

O Mercado desta entrega conecta as partes. Não acrescente checkout, custódia de dinheiro, comissão ou assinatura como consequência automática de haver um anúncio. Não acrescente selo público de verificação, ranking, coleta de afiliação além de Força Armada/OM opcionais expressamente autorizadas ou avaliação por estrelas com base em detalhes ocasionais de referências externas.

## 4. Direção visual a implementar

- Verde profundo de referência `#164734`; fundo claro `#FAFBF8`; branco nas superfícies; sálvia `#EEF1E7` em seleções. Ajuste contrastes medidos sem descaracterizar a direção.
- Texto escuro, hierarquia clara, corpo confortável e metadados legíveis.
- Espaçamentos, raios, tipografia, bordas e ícones vêm de tokens e componentes compartilhados.
- Fotos humanas e cotidianas; conteúdo brasileiro fictício e coerente entre telas.
- Uma ação principal evidente por contexto; ações secundárias discretas e alcançáveis.
- Densidade apropriada: desktop aproveita colunas e painéis; mobile respeita leitura, toque e rolagem.
- Animações curtas quando ajudam a entender uma mudança; respeitar redução de movimento.
- Evitar gradientes decorativos, vidro, excesso de cartões, slogans gigantes e aparência de painel administrativo nas áreas de comunidade.

Converta as imagens em componentes responsivos. Não transforme a tela inteira em imagem, não posicione cada elemento por coordenadas absolutas e não reproduza molduras de telefone dentro do aplicativo.

## 5. Base técnica

| Camada | Diretriz |
|---|---|
| Web | Next.js App Router, React e TypeScript, com runtime de servidor |
| UI web | HeroUI v3 e Tailwind, reutilizando wrappers Bivaque existentes e adaptando-os à direção atual |
| Mobile | React Native, Expo e Expo Router, com componentes nativos |
| Backend | Supabase para Postgres, autenticação, arquivos e atualização em tempo real onde necessária |
| Compartilhamento | Contratos, domínio, validações e tokens; interfaces próprias por plataforma |
| Organização | Monorepo pnpm; módulos pequenos com responsabilidades claras |

Na `main` usada como base desta publicação, existem `apps/web`, `packages/contracts`, `packages/domain` e `packages/tokens`; preserve essas raízes. **`apps/mobile` ainda precisa ser criado nessa base**, junto da configuração de workspace e da atualização deliberada de `tests/scope/workspace-foundation.test.mjs`, que atualmente exige sua ausência. A branch local examinada na concepção tinha trabalho mobile, mas este PR documental não o incorpora. Se a branch de execução já tiver mobile, confirme seu estado e reaproveite-o. Não atualize todas as dependências para iniciar a reconstrução; confira os manifests e a compatibilidade antes de alterar uma versão.

As duas interfaces devem consumir os mesmos contratos de domínio. Operações com segredos ou privilégios pertencem ao servidor. Server Actions podem atender à web; o mobile precisa de uma interface HTTP/RPC explícita. Não duplique regras de autorização dentro de telas.

Não é necessário introduzir microserviços, outro banco, outra biblioteca de UI ou um gerenciador global de estado para cada funcionalidade. Adicione dependências apenas para uma necessidade concreta.

## 6. Como dividir o trabalho para os modelos

Cada tarefa deve ter **uma mudança de comportamento observável**, poucas dependências e uma forma objetiva de verificar sucesso. Um fluxo pode conter várias tarefas; não entregue um módulo inteiro como uma única instrução.

### Preparação de cada tarefa

1. Identifique o objetivo e os critérios de conclusão.
2. Leia somente os arquivos relevantes, o contrato de dados e as referências visuais necessárias.
3. Confira o que existe em runtime; não confunda documentação com implementação.
4. Declare quais componentes serão reutilizados e quais precisam nascer.
5. Liste decisões ainda abertas. Resolva escolhas reversíveis de UI com este documento; pergunte apenas o que realmente muda acesso, dados pessoais, transações ou compromisso externo.

### Execução de cada tarefa

1. Descreva em poucas linhas o comportamento que será entregue.
2. Implemente o menor conjunto coerente de mudanças, incluindo os estados de falha relevantes.
3. Integre ao fluxo anterior e ao próximo; não deixe botões decorativos ou rotas sem retorno.
4. Execute as verificações proporcionais à mudança.
5. Abra a interface, percorra a interação e compare com a referência.
6. Corrija os problemas encontrados antes de declarar conclusão.
7. Registre arquivos alterados, resultado dos comandos, evidência visual e pendência concreta.

Uma tarefa pode implementar primeiro o componente compartilhado, depois o uso web e depois o uso mobile. O **fluxo** só fecha quando as duas plataformas previstas funcionam. Não espalhe a implementação por vários módulos antes de fechar esse ciclo.

### Contexto a entregar em cada chamada

Entregue ao modelo este documento, a tarefa atual, as imagens daquela tarefa, os contratos necessários e o último resumo de continuidade. Evite despejar todo o histórico do repositório em cada chamada. A escolha de modelo, suporte a imagens e protocolo de comparação estão em [MODELOS-PARA-CONSTRUCAO.md](./MODELOS-PARA-CONSTRUCAO.md). Esse anexo orienta custo e capacidade; não redefine produto.

Uma troca de modelo não reinicia o projeto. O próximo recebe o estado verificável e continua de onde o anterior parou.

### Uso de modelos visuais de baixo custo

O modelo construtor precisa aceitar a imagem da prancha no mesmo contexto em que lê e edita o código. Qwen3.8-Flash é a escolha inicial indicada; GLM-5.3-Flash é a alternativa a comparar. DeepSeek só recebe PNGs pela variante `deepseek-v4-flash-vision-exp`; o V4 Flash comum não aceita imagens. Gemini 3.8 Flash é uma opção para análise difícil ou segunda opinião, com custo maior.

Antes de uma tarefa, confirme que o modelo recebeu a imagem e peça uma descrição breve de campos, ações, público e estados. Depois, entregue uma mudança observável e exija execução e captura da implementação. Não escolha definitivamente por benchmark ou preço publicado: compare os candidatos na mesma tela do Bivaque e registre fidelidade, correções, verificações e custo total. Valores de API são voláteis e ficam datados no anexo, fora deste processo.

## 7. Sequência de construção

Esta é a sequência da nova experiência. Corrija vulnerabilidades e pré-requisitos técnicos concretos quando encontrados; eles não exigem voltar à sequência histórica de ondas.

### Etapa 1 — Base executável e componentes

Faça web e mobile iniciar no ambiente disponível. Partindo da `main` desta publicação, crie primeiro `apps/mobile` com React Native/Expo, conecte-o ao workspace e atualize o contrato de escopo que exige sua ausência, preservando as demais verificações. Essa fundação é uma tarefa delimitada antes das telas nativas; não assuma que foi entregue por este guia. Registre falhas preexistentes. Consolide tokens e os componentes essenciais: botão, campo, textarea, seleção, avatar, card, abas, feedback, loading, vazio, diálogo/sheet e navegação.

Monte uma página interna de demonstração dos componentes com estados reais. Confira tamanhos, contraste, foco, teclado, texto longo, toque e feedback. Componentes aprovados passam a ser a base das telas seguintes.

**Saída:** infraestrutura executável e componentes reutilizáveis, já com a aparência desta versão.

### Etapa 2 — Auth e onboarding completos

Desenhe e implemente o caminho de primeira entrada e o retorno de quem já tem conta. Use uma tarefa para cada transição relevante: início, envio de confirmação, confirmação, admissão, contexto e chegada.

**Saída:** uma pessoa consegue entrar, concluir os passos necessários, fechar/reabrir o aplicativo e continuar corretamente.

### Etapa 3 — Primeiro ciclo de comunidade

Implemente Início, contexto de comunidade, publicação de pergunta, detalhe da conversa, resposta, acompanhamento, notificação e resolução. Conecte descoberta/participação para que a pessoa não precise de um link manual para chegar ao fluxo.

**Saída:** duas contas autorizadas completam pergunta → resposta → retorno → resolução; uma conta sem acesso não lê nem altera o conteúdo privado.

### Etapa 4 — Explorar e Guia

Implemente busca, categorias, artigo, fonte/origem, salvos e sugestão de correção. Inclua o estado sem resultados e a localização contextual.

**Saída:** uma pessoa encontra uma informação, entende sua origem e consegue propor atualização.

### Etapa 5 — Serviços e Meu negócio

Implemente ficha, pedido, acompanhamento e resposta do prestador, junto com a gestão da própria ficha. Separe claramente as permissões de membro e prestador.

**Saída:** pedido criado por uma conta chega ao destinatário correto, recebe resposta e aparece atualizado para o solicitante.

### Etapa 6 — Mercado e Moradia

Implemente descoberta e detalhe; depois publicar, editar, pausar e encerrar; depois filtros de imóveis e alertas. Preserve rascunho quando uma edição falhar.

**Saída:** anúncio atravessa seu ciclo, permanece coerente nas listagens e só pode ser gerenciado pelo responsável autorizado.

### Etapa 7 — Demais ciclos e operação

Complete eventos, configurações, gestão de notificações, denúncias e operação de admissões/moderação. Entregue controles de denúncia e autorização junto dos módulos afetados; não espere esta etapa para proteger o conteúdo.

**Saída:** os fluxos possuem acompanhamento, cancelamento ou encerramento, tratamento de falhas e operação correspondente.

### Etapa 8 — Consolidação para entrega

Percorra as jornadas completas com dados persistidos e contas distintas. Valide layouts, desempenho percebido, acessibilidade, retomada e conexão instável. Resolva inconsistências entre mobile e web. Registre separadamente qualquer plataforma que não tenha sido executada no ambiente disponível.

**Saída:** versão funcional com evidências e limitações explícitas. A auditoria de cada etapa já deve ter sido feita; esta consolidação não substitui essas verificações.

## 8. Detalhamento de Auth e onboarding

As referências do Mobbin orientam padrões de interação. Não são telas finais do Bivaque nem mandam copiar cores, textos, métodos de autenticação ou exigências documentais.

| Referência | Aplicação pretendida |
|---|---|
| [Nextdoor — login web](https://mobbin.com/screens/4f11976e-45cf-4335-9119-62eeb6e3a5d2) | Entrada compacta, hierarquia simples e recuperação acessível |
| [TikTok — login](https://mobbin.com/flows/ce10d6cb-7a46-4501-847a-44f487d76171) | Confirmação por código, destinatário, reenvio e recuperação |
| [X — cidade](https://mobbin.com/screens/ced38455-4106-436d-a8de-e495e35961bb) | Busca e seleção explícita de localidade |
| [Digg — configuração](https://mobbin.com/flows/4be5ffb7-abcd-4319-a6b3-50fa98e61db9) | Interesses opcionais e transição para conteúdo |
| [Grammarly — personalização](https://mobbin.com/screens/965e4e5e-731a-4408-9e18-9ff0df5ae986) | Escolhas em cards e progresso discreto |
| [Nutmeg — explicação da verificação](https://mobbin.com/screens/23441acc-5831-46e6-a41b-37693b9a5821) | Motivo, próximo passo e detalhes expansíveis |

### Fluxo-base para detalhamento

**Boas-vindas → criar conta → confirmar e-mail → admissão/verificação de acesso → escolher cidade/contexto → primeira ação útil.**

- Para quem já tem conta, preserve a intenção de login e retorne ao destino permitido, sem repetir onboarding concluído.
- Confirmação de e-mail comprova controle do endereço; não comprova elegibilidade para a comunidade.
- A referência sugerida é confirmação por código. Antes de implementá-la, confira o contrato e a configuração real do provedor. Se for necessário alterar o mecanismo atual por link, faça isso como uma tarefa explícita e teste envio, confirmação e retorno nas duas plataformas. Não desenhe um código sem backend correspondente.
- Aceites necessários devem ter resumo claro, textos acessíveis e registro no servidor antes da ação que exige o aceite. Não agrupe consentimentos opcionais como obrigatórios.
- Explique a verificação antes de coletar dados. CPF é o caminho principal de retorno praticamente instantâneo; identidade com reconhecimento por IA é a alternativa expressamente solicitada quando o CPF não concluir. O processamento da identidade pode demorar mais e deve permitir acompanhamento. Não acrescentar biometria ou prazo inventado. Consulte DECISOES-2026-09-07.md para os limites de implementação.
- Trate a modalidade de entrada de cada papel sem promover prestador a membro ou converter seleção de cidade em autorização.
- Fotografia, biografia, interesses e os campos autodeclarados Força Armada/OM são opcionais e podem ser concluídos depois. Força Armada e OM têm controles individuais de visibilidade, inicialmente desligados. Não antecipe perguntas sem utilidade imediata.
- Peça permissões de câmera, localização ou notificações no momento de uso, explicando a finalidade. A busca manual de cidade deve funcionar.

Estados obrigatórios: enviando, confirmação enviada, código/link inválido ou expirado, reenvio limitado, falha de conexão, retorno de autenticação com erro, admissão em andamento, acesso não liberado com próximo passo, cadastro interrompido e sessão expirada. Mensagens não devem expor resultados privados de consultas de elegibilidade.

## 9. Dados e comportamento reais

- Fixtures servem à demonstração e aos testes. Mantenha o modo de demonstração identificado e separado do runtime conectado.
- Uma ação não está integrada se apenas altera um array local ou exibe um toast de sucesso.
- Atualize a interface conforme o resultado real. Em atualização otimista, reverta em caso de erro.
- Use nomes e imagens coerentes para a mesma pessoa entre telas. Separe cliente e prestador nas demonstrações.
- Modele estados de pedidos, anúncios e admissões com transições explícitas e validação no servidor.
- Aplique permissões na API/banco e teste acessos permitidos e negados. Ocultar um botão não protege uma operação.
- Buscas, contagens, arquivos e atualizações em tempo real precisam respeitar o mesmo escopo do conteúdo.
- Ao sair ou trocar de conta, limpe dados privados em cache e encerre assinaturas da sessão anterior.
- Não altere migrations já aplicadas. Crie mudanças incrementais e um caminho de preservação dos dados existentes.
- Nunca use chaves privilegiadas no cliente ou dados pessoais reais em fixtures e evidências.

## 10. Critério de conclusão

Uma tarefa de UI está concluída quando:

- O comportamento descrito existe e o usuário recebe feedback correto.
- A referência visual foi inspecionada e as diferenças intencionais foram explicadas.
- O estado de erro relevante funciona e preserva o que deve ser preservado.
- A integração prevista foi exercitada; simulações restantes estão declaradas.
- Navegação, retorno, teclado e rolagem funcionam na superfície alterada.
- As verificações aplicáveis passaram, ou a tarefa permanece explicitamente aberta por um bloqueio concreto.
- Há um resumo reproduzível para o próximo modelo.

No repositório atual, use os scripts existentes em vez de inventar um novo sistema de validação. Referência operacional: `npx pnpm@11.18.0 gate --fast` durante a edição; `npx pnpm@11.18.0 gate` para fechamento de código; build e testes de integração/E2E conforme a mudança. Para telas web, use o loop visual disponível e os viewports 375/768/1440. Mobile exige execução e inspeção nativa, não apenas uma captura web estreita.

Confirme os comandos no ambiente. Testes de banco rodam em stack local isolada, sem resets remotos. Nunca apague dados ou publique uma mudança como consequência implícita deste documento.

Não altere uma expectativa de teste só para torná-lo verde. Se ele codifica um comportamento antigo substituído por esta versão, atualize expectativa e implementação com a razão explícita, preservando a cobertura do novo contrato.

Falha preexistente deve ser comprovada e distinguida de regressão. Não declare o gate completo se uma etapa não foi executada. Não confunda compilação, screenshots ou migrations com um fluxo validado.

## 11. Modelo de tarefa para copiar

```text
Contexto:
Você está construindo a versão atual do Bivaque definida em
PROCESSO-DE-CONSTRUCAO.md e no guia visual de 06/09/2026.
Ela prevalece sobre decisões antigas conflitantes de produto e experiência.

Objetivo desta tarefa:
[Uma mudança observável.]

Pessoa e contexto:
[Quem usa, de onde chega e qual acesso possui.]

Referências:
[Uma ou poucas imagens, notas de correção e componentes existentes.]

Comportamento:
[Entrada → ação → feedback → próximo passo.]

Estados a cobrir:
[Normal, carregamento, vazio/erro relevante e recuperação.]

Dados e permissão:
[Contrato utilizado, responsável pela operação e negação esperada.]

Escopo:
[Superfícies/arquivos envolvidos e dependências já concluídas.]

Critérios de conclusão:
[Resultados observáveis, verificações e evidência exigida.]

Execução:
Inspecione o contexto necessário, implemente, valide e corrija.
Resolva escolhas reversíveis usando a direção atual.
Não expanda para outro módulo. Não declare sucesso com integração fictícia.

Entrega:
Explique o que funciona, os arquivos alterados, os comandos e resultados,
a evidência visual e qualquer pendência com próximo passo concreto.
```

## 12. Primeira tarefa recomendada

**Preparar a base visual e executar a primeira tela de entrada nas duas plataformas.**

1. Conferir a branch e localizar componentes existentes. Se `apps/mobile` estiver ausente, executar primeiro a fundação descrita na Etapa 1, incluindo workspace e contrato de escopo; depois continuar a entrada nas duas plataformas.
2. Consolidar os tokens visuais desta versão e os componentes de texto, botão e campo necessários.
3. Implementar a apresentação de boas-vindas/entrada, com distinção clara entre entrar e criar conta, ligada às rotas corretas.
4. Reutilizar a integração existente quando comprovada. Registrar qualquer mudança necessária no contrato de autenticação como próxima tarefa delimitada.
5. Validar estados dos componentes, responsividade, teclado, retorno e aparência nas duas superfícies.

Essa primeira tarefa fecha a base visual e a entrada no fluxo. **Não fecha Auth inteira.** A próxima implementa ou adapta o envio e confirmação de e-mail; depois vêm admissão, retomada e chegada ao conteúdo.

## 13. Continuidade entre modelos

Ao terminar, produza este resumo no mecanismo de acompanhamento já adotado pelo projeto:

```text
Tarefa:
Estado: concluída / em andamento / bloqueada
Comportamento entregue:
Arquivos e revisão:
Contratos/componentes utilizados:
Verificações executadas e resultados:
Evidência visual/runtime:
Decisão antiga substituída, se houver:
Pendência concreta:
Próxima tarefa e dependência:
```

Use o quadro existente quando trabalhar neste repositório; este documento descreve o processo e não cria um segundo backlog. Não marque um card antigo como concluído apenas porque a versão pretendida mudou. Ao implementar, reconcilie o card correspondente com o trabalho e as evidências desta versão.

**Resultado esperado:** um Bivaque funcional, coerente entre web e mobile e fiel à versão atual. A documentação anterior ajuda a entender o ponto de partida; não redefine o destino.

## 14. Verificação independente da execução

### O que existe no repositório

| Camada | Mecanismo | Limite real |
|---|---|---|
| Verificação automatizada externa | `.github/workflows/pull-request-ci.yml`: lint, tipos, testes, segredos, build, banco e E2E em GitHub Actions | Só produz prova quando o job executa e passa; não avalia sozinho fidelidade visual ou todos os fluxos mobile |
| Revisão externa de código | `.github/workflows/claude-review.yml`: sessão separada via Claude Code Action, configurada com DeepSeek V4 Pro | Faz leitura e revisão do diff; o prompt proíbe executar build/testes. PRs apenas de Markdown/docs são excluídos do disparo automático |
| Gate fora do implementador | `scripts/agents/run-contracts.sh` executa validação após o processo do implementador | É local, usa Codex e não é um orquestrador genérico dos modelos escolhidos pelo usuário; E2E exige `--full`; revisão e auditoria visual permanecem fora do runner |
| Papéis independentes | `docs/agents/AGENT_ARCHITECTURE.md` e contratos distinguem implementador, revisor e verificador de runtime | O validador confere estrutura; não comprova que três sessões independentes foram realmente executadas |
| Auditoria visual local | `scripts/visual/loop.mjs` captura rotas e mede propriedades determinísticas | Não substitui julgamento visual, inspeção nativa ou confirmação de todas as regras de negócio |

**Não existe hoje uma cadeia integralmente automatizada que impeça todo fechamento sem revisão independente e prova de execução.** Não apresentar este procedimento escrito como uma automação instalada.

### Estado externo conferido em 06/09/2026

- Último CI de PR consultado: [checks da revisão — CI](https://github.com/Juanjfmr/bivaque-community/commit/c1c295b/checks), criado em 31/08/2026, falhou sem executar etapas.
- Última revisão consultada: [checks da revisão — code review](https://github.com/Juanjfmr/bivaque-community/commit/c1c295b/checks), mesma data/revisão, falhou sem executar etapas.
- As anotações dos dois jobs informam impedimento por pagamentos recentes da conta ou necessidade de elevar o limite de gastos do GitHub Actions. A resposta do serviço não distingue qual das duas condições ocorreu.
- Consultas de proteção da branch `main` e rulesets retornaram HTTP 403 com exigência de upgrade de plano ou repositório público. **Não foi possível comprovar um bloqueio de merge por checks obrigatórios.** Não mudar a visibilidade do repositório como solução automática.
- Essas execuções se referem ao SHA `c1c295bc9554103d94af680ddc230b500237dbc2`, não às alterações locais deste guia. Sucesso de outro commit nunca certifica o estado atual.

Este é um retrato datado, não monitoramento. Reconsultar os checks da revisão entregue antes de usá-los como evidência.

### Protocolo para os modelos construtores

1. O **implementador** entrega uma revisão identificável, o contrato, os resultados dos comandos e as pendências. Não atribui a si próprio aprovação independente.
2. Um **revisor em sessão separada** recebe primeiro o contrato, a referência atual e o diff. Forma o primeiro parecer sem a justificativa do implementador. Avalia correção, permissões, erros, integração e coerência visual. Pode ser outro modelo ou uma pessoa; usar o mesmo modelo em outra sessão separa contexto, mas pode conservar pontos cegos.
3. Um **verificador de execução distinto** percorre os critérios na aplicação executável, sem consertar o código que está julgando. Registra contas fictícias/papéis, ambiente, revisão, passos e resultados. Exercita ao menos a ação principal, a falha relevante e, quando aplicável, o acesso negado.
4. O **CI** deve executar contra a revisão entregue. Check verde significa que os checks implementados passaram; comentário “aprovado” ou job de revisão concluído não substitui o resultado dos testes.
5. Se houver falha, o implementador corrige e as verificações afetadas são repetidas. Se houver alteração após a revisão, a evidência anterior precisa ser reavaliada para o novo diff.
6. O coordenador ou responsável só fecha o trabalho com evidência suficiente. Sem revisor disponível, registre “implementado; revisão independente pendente”. Sem ambiente, registre “runtime não verificado”. Bloqueio de Actions não equivale a aprovação nem torna testes locais em CI externo.

Para mudanças apenas documentais, como encaminhar a leitura deste guia, basta conferir os links, a precedência e os contratos de repositório afetados. Isso não certifica nenhum fluxo do aplicativo.

### Registro mínimo do fechamento

Use o contrato e o quadro existentes, sem criar um segundo backlog. Registre:

- Revisão/commit; se o worktree tiver alterações, identifique o diff realmente avaliado.
- Identificação da sessão executora, da revisora e da verificadora, quando exigidas.
- Critérios de aceitação e evidência correspondente, incluindo resultados negativos.
- Comandos, ambiente, resultado e links de CI da revisão correta.
- Capturas e passos da inspeção web/mobile, quando aplicáveis.
- Veredito: `PASS`, `FAIL` ou `BLOCKED`, com motivo e próximo passo.

A regularização da conta GitHub e qualquer contratação/alteração de limite pertencem ao responsável pela conta. A instalação de um orquestrador automático de revisão e runtime é trabalho adicional; não foi realizada ao escrever este processo.
