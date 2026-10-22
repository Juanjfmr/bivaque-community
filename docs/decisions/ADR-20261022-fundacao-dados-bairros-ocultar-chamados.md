---
id: ADR-20261022-fundacao-dados-bairros-ocultar-chamados
status: accepted
risk: R3
owner: Juan
approved_at: 2026-10-22
expires_at:
linked_plan: docs/AUDITORIA_ADERENCIA_2026-10-19.md (seção 6, lote 2)
critic_verdict: PASS
critic_review: Aprovado pelo dono em 22/10/2026 com um ajuste (chamado só com conta). Regras levantadas do protótipo, arquivo por arquivo, antes da redação.
---

# Fundação de dados: bairros, ocultar para mim e chamados de ajuda

## Problem

O protótipo, que é a especificação do produto, tem três domínios que o banco real não tem
(auditoria de 19/10, seção 2.1):

- **Bairro.** No banco só existe texto livre em anúncios e alertas. Falta o catálogo de bairros, o bairro do perfil
  com a chave "Mostrar meu bairro" e a base para o filtro "Distância de mim" e para o atendimento por bairro.
- **Ocultar para mim.** Hoje só existe `is_deleted`, que é moderação e vale para todos. A ocultação pessoal e
  reversível do protótipo não tem onde ser guardada.
- **Chamados.** O Next manda a ajuda por e-mail, sem registro. O protótipo tem "Meus chamados", com situação
  (Em andamento ou Respondido) e a resposta visível no app.

Todos tocam dado pessoal e RLS, por isso o risco é R3.

## Decision

### 1. Bairros

1. **Catálogo.** A tabela `public.neighborhoods` guarda, por cidade (`locality_id` do catálogo IBGE):
   - o nome;
   - uma chave normalizada (sem acento e em minúsculas), única por cidade;
   - a zona;
   - o ponto central do bairro.

   O ponto central é dado geográfico público do bairro, não de uma pessoa.
   - Leitura: membros autenticados.
   - Escrita: só a operação.
   - Carga inicial: as quatro cidades que o protótipo já tem (Manaus, Brasília, Natal e Rio de Janeiro), com os
     mesmos nomes, zonas e pontos.
   - A base nacional (IBGE e OSM) e as variações de nome juntadas pela moderação ficam para depois.
2. **Busca.**
   - Uma função de busca por nome, sem acento, devolve até 6 bairros da cidade, com os que começam pelo texto
     primeiro.
   - Fora do catálogo, o texto digitado vale como está.
   - Um texto que bate com o catálogo é gravado com a grafia do catálogo.
3. **Bairro do perfil.**
   - O perfil ganha o bairro (opcional) e a chave "Mostrar meu bairro", ligada por padrão.
   - O bairro é visível só para membros confirmados, como os outros dados do perfil.
   - Com a chave desligada, ninguém além da própria pessoa recebe o bairro **do perfil**, nem nos cabeçalhos que o
     usam (pergunta, resposta, publicação). A regra vale no banco, por uma função de leitura, não só na tela. O dado
     continua guardado: religar a chave mostra o bairro de novo.
   - **Decisão do dono em 22/10/2026:** a chave **não** vale para anúncio nem pedido. O bairro do item é escolhido
     para aquele item e aparece como foi escolhido. A proteção forte do Bivaque é a entrada com vínculo confirmado:
     lá dentro, entre membros verificados, não precisa do mesmo rigor.
4. **CEP e coordenada nunca são gravados.**
   - Todo campo de bairro recusa sequências de 5 ou mais dígitos, com uma regra no banco.
   - A busca por CEP (ViaCEP ou BrasilAPI) e a busca por localização ficam fora deste ADR. A localização, quando
     entrar, escolhe o ponto central mais próximo no próprio aparelho, e a coordenada não sai dele.
5. **O resto continua como está.**
   - Anúncios, pedidos e alertas continuam com o bairro em texto.
   - O vínculo com o catálogo fica para os lotes de Desapegos, Imóveis e Negócios.
   - **Decisão do dono em 22/10/2026, a aplicar nesses lotes:**
     - **Imóvel:** bairro obrigatório, e o endereço nunca é guardado, no mesmo padrão do Zap e do QuintoAndar.
     - **Desapego:** bairro opcional. Anúncio sem bairro aparece na cidade e só fica de fora do filtro por bairro, da
       distância e do mapa.

### 2. Ocultar para mim

1. **Guarda.** A tabela `public.hidden_questions` tem pessoa, pergunta e data, e cada par é único. É um vínculo
   pessoal, separado da moderação.
2. **Acesso.** Só a própria pessoa lê, cria e apaga as linhas dela.
3. **Efeito.**
   - As listas da Comunidade deixam de trazer as perguntas que a pessoa ocultou.
   - O link direto continua abrindo a pergunta, e a tela mostra "Você ocultou esta pergunta".
   - A tela "Ocultados" lista as perguntas ocultadas e oferece "Mostrar" em cada uma.
4. **Escopo.** No protótipo, só perguntas podem ser ocultadas. Esconder uma pessoa inteira é o bloqueio, que já
   existe.
5. **Exclusão de conta.** Apagar a conta apaga as ocultações.

### 3. Chamados de ajuda

1. **Guarda.** A tabela `public.support_tickets` tem:
   - a pessoa (opcional) e o e-mail;
   - o assunto, um entre conta, comunidade, anúncios, segurança e outro;
   - o texto, de 10 a 1.000 caracteres;
   - a situação: aberto ou respondido;
   - a resposta, com a data dela.
2. **Abertura.**
   - Só quem tem conta abre chamado, e o chamado usa o e-mail da conta.
   - Decisão do dono em 22/10/2026, que diverge do protótipo: quem está fora usa o e-mail de contato da Ajuda.
   - A criação passa por uma função do banco, com limite de abertura por pessoa. A interface nunca grava direto na
     tabela.
3. **Leitura.** Cada pessoa lê os próprios chamados em "Meus chamados".
4. **Resposta.**
   - Só a operação responde, por uma função do banco.
   - Responder grava a resposta, muda a situação para respondido, cria o aviso no app e põe o e-mail na fila de
     envio que já existe.
   - A fila de chamados no Painel do Bivaque fica para o lote de operação. Até lá, a função de resposta é o
     caminho da operação.
5. **Exclusão de conta.** Apagar a conta apaga os chamados da pessoa, como no protótipo.

### 4. Para os três domínios

- Cada domínio entra com o schema, as permissões, as políticas de RLS e os testes pgTAP positivos e negativos
  juntos.
- As migrations precisam aplicar a partir do zero.
- A moderação e a exclusão de conta passam a conhecer as entidades novas.
- O que ainda não existe no protótipo fica fora:
  - número de protocolo;
  - anexos;
  - conversa dentro do chamado;
  - variações de nome de bairro.

## Alternatives considered

- **Usar `is_deleted` para ocultar.** Rejeitada: ele esconde para todos e é decisão da moderação.
- **Bairro só como texto livre, sem catálogo.** Rejeitada. Sem o catálogo não há filtro por distância, mapa nem
  atendimento por bairro coerentes.
- **Ajuda só por e-mail, sem registro.** Rejeitada: a pessoa não acompanha o que pediu, e a operação não tem fila.

## Market or reference baseline

- Apps de classificados e de comunidade usam bairro de catálogo com texto livre de reserva.
- "Ocultar" pessoal e reversível é comum em feeds.
- Central de ajuda com situação do pedido é o padrão.

## Proposed divergence from baseline

Nenhuma.

## Evidence and sources

- **Protótipo:**
  - `src/data/demo/bairros.js` e `src/shell/hood-picker.js`;
  - `src/features/profile/hood-privacy.js`, `settings.js` e `hidden.js`;
  - `src/features/support/help.js`;
  - `src/features/owner/console.js`.
- **Auditoria:** `docs/AUDITORIA_ADERENCIA_2026-10-19.md`, seções 2.1, 2.2 e 6.
- **Banco atual:** texto livre de bairro em `20260911043053_listings_market_and_homes.sql` e em
  `20260911051005_listing_alert_deliveries.sql`.

## Benefits

- O Next ganha os dados que as telas portadas vão precisar, já protegidos no banco.
- A ocultação pessoal deixa de depender do aparelho.
- A operação passa a ter uma fila de ajuda com retorno.

## Risks

- **Bairro do perfil é dado pessoal.** A chave "Mostrar meu bairro" precisa valer em todas as leituras do bairro do
  perfil: os testes negativos cobrem cada caminho.
- **Chamado repetido em excesso.** O limite de abertura por pessoa e a função dedicada contêm isso.
- **A carga das quatro cidades usa pontos aproximados.** Servem para filtro e mapa, não para endereço.

## Reversal cost

Baixo. São tabelas novas, sem mudar dado existente.

## Success metric

- Testes pgTAP positivos e negativos por domínio.
- Reset limpo e gate verdes.
- Nenhuma coluna de CEP ou coordenada de pessoa.

## Reopen condition

Reabrir se a base nacional de bairros exigir outro modelo, ou se o chamado precisar de protocolo, anexo ou
conversa.
