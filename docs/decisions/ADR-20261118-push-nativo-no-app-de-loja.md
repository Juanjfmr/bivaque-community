---
id: ADR-20261118-push-nativo-no-app-de-loja
status: Aceito por delegação — aguarda ratificação
risk: R3
owner: Juan
approved_at: 2026-11-18 (por delegação; mandato do lançamento de 02/11 e instrução do dono de 18/11: "fazer tudo e esperar as chaves")
linked_plan: docs/LANCAMENTO.md
amends: ADR-20261107-push-no-aparelho (§7 e §8)
critic_verdict: pending
critic_review: auditoria de segurança (GPT 6.1 Terra) e revisão independente (GLM 5.3) no PR do lote nativo
---

# Push nativo no app de loja: inscrição, envio e o SDK do Android

## Problema

O [ADR-20261107-push-no-aparelho](ADR-20261107-push-no-aparelho.md) fixou a tabela `push_subscriptions`
(tipos `web`, `android`, `ios`), o envio pelo outbox, a frase fixa da tela bloqueada e a permissão em
contexto. A parte de loja ficou para depois do empacotamento (§7). Ficaram dois pontos sem decisão:

- O Android só recebe push pelo serviço de mensagens do Google. O plugin de push do Capacitor depende do
  SDK desse serviço, e o teste de limites de produto (`tests/privacy/product-boundaries-and-pii.test.ts`)
  proíbe o nome da plataforma (§8).
- O dono decidiu em 18/11 que todo o código do push fica pronto e provado antes de existirem as chaves do
  Google e da Apple, que são atos dele. Sem projeto no Google nem chave da Apple, não há credencial de teste
  real.

## Decisão

1. **Inscrição nativa.** O app de loja usa o plugin oficial de push do Capacitor. O token do aparelho vai
   para a mesma rota `/api/app/push`, com `kind` `android` ou `ios`, sob as regras do ADR de 07/11: dono lê,
   cria e apaga; sem UPDATE de cliente; `user_id` só da sessão; apagado ao sair, ao apagar a conta, quando o
   provedor recusa e após 90 dias sem envio aceito. A permissão do sistema só é pedida ao ligar o canal
   "No celular" nas preferências.
2. **Envio.**
   - Android: API HTTP v1 de mensagens do Google, com conta de serviço.
   - iOS: APNs por HTTP/2 com chave de token (.p8), direto da Apple, sem o SDK do Google.
   - Os dois adaptadores vivem ao lado do adaptador Web Push e saem do mesmo outbox. Resposta de destino
     inexistente apaga a inscrição; falha temporária volta para o outbox.
3. **Exceção do termo proibido, limitada.** O teste de limites de produto passa a aceitar o termo só:
   - no projeto Android gerado pelo Capacitor (`apps/app/android/**`), onde o plugin e o Gradle exigem o
     SDK;
   - no adaptador de envio do Android, onde está o escopo OAuth do serviço.
   O resto do produto continua sob a proibição, e o teste prova que a exceção não vaza. O arquivo de
   configuração do projeto Google (`google-services.json`) e o `GoogleService-Info.plist` nunca entram no
   repositório; o build de CI usa um arquivo de teste gerado na hora, sem projeto real.
4. **Segredos.** A conta de serviço do Google, a chave .p8 e os identificadores da Apple são segredos de
   servidor configurados pelo dono no ambiente. Sem eles, os adaptadores nativos ficam desligados: o app
   não oferece o canal e o outbox não gera linha nativa. Nenhum valor é registrado em log.
5. **Prova sem as chaves.**
   - Unidade e integração dos dois adaptadores contra um servidor falso local, que responde sucesso,
     destino inexistente, limite de taxa e erro temporário.
   - pgTAP positivo e negativo para `android` e `ios`.
   - E2E do app no emulador Android com o provedor falso: o pedido de permissão aparece em contexto, a
     inscrição é gravada, o toque numa notificação local simulada abre o destino pelos links profundos e a
     inscrição some ao sair.
   - A prova com o provedor real (aparelho físico, chaves do dono) fica registrada como ato do dono no
     cartão LAN-PUSH.
6. **Ordem.** Primeiro o #163 (web) é trazido à main e mesclado. Depois vem o projeto Capacitor (LAN-LOJA,
   primeiro item), e então o lote nativo deste ADR.

## Consequências

- Uma exceção nomeada e testada no lugar de um nome neutro que esconderia a dependência.
- O LAN-PUSH fica "pronto para receber as chaves" quando o lote nativo passa com o provedor falso. O
  coordenador avisa o dono nesse marco.
- Sem as chaves, a produção continua só com Web Push. Nada quebra se as chaves nunca vierem.

## Alternativas consideradas

- **Serviço intermediário de push de terceiros (OneSignal e parecidos).** Recusado: mais um processador
  de dado pessoal (o token) e uma conta nova do dono, sem tirar a dependência do Google no Android.
- **Android sem push, só iOS e web.** Recusado: a maioria do público usa Android, e o dono pôs o push no
  lançamento.
- **Nome neutro no código, sem exceção no teste.** Recusado: o Gradle e o plugin exigem o nome real.
  Esconder isso torna o teste uma mentira.
