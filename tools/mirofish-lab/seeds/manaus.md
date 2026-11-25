# Bivaque — Manaus: laboratório de comunidades (DADOS 100% FICTÍCIOS)

## Natureza do material
Esta semente é sintética e serve apenas a uma simulação exploratória. Não representa membros reais, dados de militares, unidades militares, conversas privadas, índices de mercado nem comportamento medido. Todas as pessoas, lojas, negócios, publicações e interações citadas abaixo são fictícias.

## Produto
O Bivaque é uma plataforma voltada à vida militar brasileira, organizada por cidade. No ambiente **Bivaque Comunidade**, pessoas adultas elegíveis (militares da ativa, veteranos da reserva ou reformados, pensionistas e familiares) podem encontrar perguntas e respostas locais, grupos de interesse, eventos, desapegos, imóveis, negócios e serviços. O ambiente **Bivaque Negócios** é separado: prestadores e empresas gerenciam perfis comerciais, solicitações próprias e métricas permitidas; não participam como contas comerciais das conversas privadas da comunidade. Não há contas para menores.

O foco desta simulação é a adoção orgânica, não a geração artificial de atividade na rede real. Nenhum agente simulado deve publicar na plataforma real.

## Situação inicial da cidade (hipóteses arbitrárias de teste)
A cidade piloto é Manaus. O Bivaque está em início de operação, com catálogo inicial pequeno e nenhum feed contínuo na entrada. Os membros podem fazer buscas, perguntar à cidade, participar de grupos, consultar fichas de negócios e iniciar contatos de interesse. Existe identificação/verificação de elegibilidade, que pode gerar atrito na entrada, mas contribui para a confiança. A maioria dos conteúdos de exemplo está vazia inicialmente e isso não deve ser ocultado por posts inventados.

### Necessidades frequentes
1. Uma pessoa transferida para Manaus quer encontrar um eletricista indicado por alguém elegível.
2. Um familiar adulto quer perguntar sobre bairros e serviços da cidade.
3. Um militar procura atividade esportiva comunitária aos fins de semana.
4. Um veterano quer anunciar um item usado.
5. Uma pessoa quer consultar um imóvel e iniciar contato, sem efetuar pagamento no Bivaque.
6. Um prestador elegível a Bivaque Negócios quer receber contatos e administrar sua página, sem ter acesso às conversas privadas da comunidade.

## Pessoas fictícias e suas relações (não são perfis reais)
- **Aline (membro elegível, recém-chegada)**: precisa de eletricista e informações de bairro; não conhece pessoas locais. Valoriza tempo de resposta e recomendações verificáveis. Pode abandonar o app se o cadastro for demorado.
- **Bruno (membro elegível, morador antigo)**: conhece prestadores, mas evita preencher formulários longos. Compartilharia um contato de telefone se isso exigir poucos toques. Só participa de discussões úteis.
- **Carla (familiar adulta)**: procura imóveis e informações sobre escolas, valorizando privacidade. Participa de grupos quando encontra respostas práticas.
- **Diego (veterano)**: quer vender equipamento usado, mas teme golpes e mensagens inconvenientes. Considera útil a reputação contextual de quem recomenda.
- **Elisa (membro elegível, esportista)**: busca grupos de corrida e eventos locais, mas não quer publicações irrelevantes na home.
- **Fabio (membro elegível, com pouco tempo)**: raramente publica; faz buscas diretas e prefere falar por mensagens quando encontra solução.
- **Gabi (membro elegível, moderadora voluntária do grupo)**: tenta orientar dúvidas recorrentes, mas não quer trabalho moderativo excessivo. Considera denunciáveis ofensas e publicidade disfarçada.
- **Hugo (membro elegível, cético)**: desconfia de cadastros novos e pode abandonar uma comunidade vazia. Só recomenda pessoas que conhece de fato.
- **Iara (pensionista adulta)**: procura serviços em região acessível e prefere interface simples. Tem interesse em benefícios concretos, não em novidades tecnológicas.
- **João (membro elegível, comprador)**: procura imóvel e itens usados, mas só entra em contato se houver clareza e sinais de confiança.
- **Katia (prestadora autônoma fictícia de serviços domésticos)**: tem página no Bivaque Negócios, mas não entra na comunidade sob perfil comercial. Quer receber solicitações qualificadas.
- **Lucas (eletricista fictício)**: ainda não reivindicou a ficha comercial criada a partir de uma indicação; a atribuição de titularidade deve exigir verificação antes da gestão da ficha. Não deve receber spam em massa.

## Itens e espaços iniciais (fictícios)
- **Perguntas de Manaus**: área local de dúvidas; no início há poucas respostas.
- **Grupo Corrida Manaus**: grupo de interesse com adesão voluntária e pouca atividade.
- **Mercado — Desapegos**: catálogo pequeno, sem pagamento na plataforma.
- **Mercado — Imóveis**: ofertas com localização exata ou aproximada conforme escolha do anunciante.
- **Catálogo de prestadores**: fichas com informação pública/comercial e indicações autorizadas; páginas reivindicáveis por responsáveis verificados.
- **Bivaque Negócios**: painel isolado dos prestadores; apenas demandas encaminhadas a eles e métricas permitidas.

## Regras para os agentes na simulação
- Interações simuladas não alteram a aplicação real.
- Não há acesso a CPF, endereço particular, credenciais, dados de OM, posto/graduação ou qualquer base interna.
- Não presumir que qualquer membro é militar identificado publicamente. O pertencimento pode ser verificado de forma reservada.
- Nunca representar publicidade comercial como recomendação espontânea de membro.
- Usuários adultos decidem livremente se dão recomendações, buscam contatos, entram em grupos ou deixam de usar.
- O cenário pode falhar. A simulação deve incluir desinteresse, inércia, recusas e experiências ruins de maneira plausível.

## Alternativas de experiência a comparar (cada qual em uma execução separada)
- **A — Busca primeiro:** home com cidade, busca forte e acesso direto aos módulos; usuários precisam iniciar buscas.
- **B — Resolver primeiro:** home com ação destacada “Perguntar à cidade” e “Encontrar indicação”, além de módulos resumidos; sem feed contínuo.
- **C — Comunidades primeiro:** home com acesso destacado às perguntas da cidade, grupos e serviços locais, sem feed contínuo.

## Perguntas do experimento
- O que faz um usuário novo completar sua primeira ação útil?
- Como a ausência de respostas e de oferta local altera a intenção de retorno?
- Quando uma indicação informal vira contato útil sem exigir formulário longo?
- Como isolamento entre Comunidade e Negócios afeta a confiança e a capacidade de responder demandas?
- Em quais pontos aparecem spam, duplicidade de contatos, publicidade disfarçada, atritos de verificação e necessidade de moderação?
- Quais hipóteses precisam ser validadas com pessoas reais antes de qualquer decisão de produto?
