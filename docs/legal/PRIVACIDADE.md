# Privacidade e dados

> Rascunho de 2026-08-11. **Precisa de revisão jurídica antes de publicar** — eu escrevi o
> conteúdo técnico e o texto para o membro, mas não sou advogado, e a base legal de cada
> tratamento precisa ser confirmada. A revisão do §7.6 do `BIVAQUE.md` já é necessária de
> qualquer forma. Versão a registrar no aceite: `1.0`.
>
> Pendências que só o dono resolve: quem é o controlador (depende do veículo jurídico), o
> endereço e o canal oficial, e o encarregado.

Este texto explica o que o Bivaque guarda sobre você, por quanto tempo, quem mais vê, e o que
você pode exigir. Sem juridiquês onde dá para evitar.

## Quem responde pelos dados

O controlador é **[a definir — depende da constituição do veículo jurídico]**. Contato para
qualquer assunto de dados: **[canal de suporte]**.

## O que a gente guarda

**Para deixar você entrar:** seu CPF é enviado ao Portal da Transparência do Governo Federal
para conferir se você é militar federal, veterano ou pensionista. O CPF **não é guardado em
texto aberto** em lugar nenhum, e a resposta completa do Portal também não. Fica registrado
só o resultado — elegível ou não — e a data.

**Se o Portal não te encontrar** e você mandar um documento pelo caminho de exceção, esse
arquivo fica em armazenamento privado por **no máximo 7 dias** e é apagado depois da decisão.
Ninguém além do operador que analisa tem acesso.

**Enquanto você é membro:** nome de exibição, e-mail, localidade, de quais comunidades e
grupos você participa, e o que você publica — post, comentário, pedido, resposta, presença em
evento.

**Se você quiser:** foto de perfil e afiliação declarada por você (força, situação, unidade,
turma). Os dois são opcionais e você pode remover quando quiser. Afiliação declarada aparece
para os outros membros — se você não quer que apareça, não preencha.

**Se você é prestador:** os dados da sua ficha, que são públicos para os membros por
definição, e o registro das assinaturas que você contratou.

## O que a gente nunca guarda

CPF em texto aberto. A resposta completa do Portal. Seu endereço residencial. Seu posto ou sua
organização militar vindos do Estado — se aparecerem, é porque **você** escolheu declarar.
Documento de identificação além dos 7 dias. E não existe selo público dizendo que você foi
verificado: aqui todo mundo foi, então não faria sentido.

## Por que a gente pode guardar

- Nome, e-mail, localidade, membership e o que você publica: para o serviço existir. Sem
  isso não há comunidade.
- Resultado da verificação: para saber quem pode entrar, que é a razão de o Bivaque existir.
- Foto e afiliação declarada: porque você consentiu, e o consentimento pode ser retirado.
- Registro de moderação e denúncia: para manter o lugar seguro e para poder justificar uma
  decisão contra alguém.
- Dados de cobrança do prestador: para cumprir o contrato dele.

## Quem mais vê

O Bivaque roda em serviços de terceiros, e é honesto listar quais:

| Serviço | O que passa por lá |
|---|---|
| Supabase | banco de dados e autenticação — praticamente tudo |
| Vercel | hospedagem do site e registro de acesso |
| Resend | seu e-mail e o conteúdo das notificações enviadas |
| WhatsApp | seu número e o conteúdo da notificação, se você optar por esse canal |
| Sentry | relatório de erro, com dado pessoal filtrado antes do envio |
| PostHog | quais telas você usa e quais ações você faz, sem o conteúdo do que você escreve |
| Asaas | dados de pagamento do prestador. O Bivaque nunca vê cartão |
| Portal da Transparência | seu CPF, no momento da verificação |

Nenhum deles recebe seus dados para vender, para treinar modelo ou para anunciar.

## Por quanto tempo

Enquanto você for membro. Se você sair ou pedir exclusão, apagamos em até **30 dias**.

Duas exceções, e é justo você saber antes:

O que você publicou em conversa com outras pessoas — comentário, resposta a pedido — fica,
desvinculado do seu nome. Apagar sua metade de uma conversa deixa a outra pessoa falando
sozinha.

Registro de moderação contra você fica por **2 anos**, mesmo depois de você sair. É o que
impede alguém removido por perseguição de voltar no dia seguinte com outro cadastro.

## O que você pode exigir

Você pode pedir uma cópia do que temos sobre você, corrigir o que estiver errado, ou mandar
apagar tudo. Pode retirar o consentimento da foto e da afiliação declarada sem perder a conta,
e pode perguntar com quem compartilhamos o quê.

Se a gente não resolver, você pode reclamar à ANPD — e isso não depende de tentar aqui
primeiro.

Pede pelo canal de suporte. Resposta em até **15 dias**.

## Se acontecer vazamento

Se houver incidente com risco para você, avisamos você e a ANPD. O aviso diz o que vazou,
quando, o que já foi feito e o que você deve fazer. Não vamos esconder e não vamos esperar
alguém perguntar.

## Quando este texto mudar

Toda alteração ganha versão nova e você é avisado. Mudança que amplie o que a gente coleta ou
com quem compartilha pede aceite novo — não vale só continuar usando.
