---
id: ADR-20261118-push-nativo-no-app-de-loja
status: Aceito por delegação — aguarda ratificação
risk: R3
owner: Juan
approved_at: 2026-11-18 (por delegação; mandato do lançamento de 02/11 e instrução do dono de 18/11: "fazer tudo e esperar as chaves")
linked_plan: docs/LANCAMENTO.md
amends: ADR-20261107-push-no-aparelho (§2, §5, §7 e §8)
critic_verdict: pending
critic_review: 1ª rodada sobre o texto — auditoria GPT 6.1 Terra BLOQUEIA (3 HIGH, 3 MEDIUM, 1 LOW) e revisão GLM 5.3 PASS COM RESSALVAS; esta versão responde a todos os achados. Lote nativo terá auditoria e revisão próprias.
---

# Push nativo no app de loja: inscrição, envio e o SDK do Android

## Problema

O [ADR-20261107-push-no-aparelho](ADR-20261107-push-no-aparelho.md) (que entra na main pelo #163; este ADR
só é mesclado depois dele) fixou a tabela `push_subscriptions` (tipos `web`, `android`, `ios`), o envio pelo
outbox, a frase fixa da tela bloqueada e a permissão em contexto. Ele deixou a loja para depois do
empacotamento (§7). Ficaram dois pontos sem decisão:

- O Android só recebe push pelo serviço de mensagens do Google. O plugin de push do Capacitor depende do
  SDK desse serviço, e o teste de limites de produto (`tests/privacy/product-boundaries-and-pii.test.ts`)
  proíbe o nome da plataforma (§8).
- O dono decidiu em 18/11 que todo o código do push fica pronto e provado antes de existirem as chaves do
  Google e da Apple, que são atos dele. Sem projeto no Google nem chave da Apple, não há credencial de teste
  real.

## Decisão

1. **Inscrição nativa.** O app de loja usa o plugin oficial de push do Capacitor e grava o token na mesma
   rota `/api/app/push`, com `kind` `android` ou `ios`.
   - A rota segue o contrato do ADR do SPA §5: um só resolvedor de sessão, CSRF por `Origin` com o
     cabeçalho do app, CORS explícito e cliente da sessão sob RLS. `user_id` vem só da sessão.
   - Validação por tipo: o token nativo é texto opaco de até 4096 caracteres, só ASCII imprimível. No
     tipo `web`, o endpoint precisa estar na lista fechada de origens de provedores Web Push.
   - Limite de 10 inscrições por pessoa: a mais antiga sai quando entra a décima primeira.
   - Campos guardados: tipo, destino, chaves públicas do Web Push quando houver, `created_at` e
     `last_success_at`. O rótulo curto do aparelho do ADR de 07/11 sai, porque nada o usa.
2. **Titular e revogação** (emenda do §2 de 07/11).
   - Reinscrever um destino que já existe troca o titular numa única instrução atômica (`insert … on
     conflict do update`, só pelo papel da rota). Assim, um aparelho nunca fica com dois titulares.
   - Ao sair, o app apaga a inscrição deste aparelho antes de encerrar a sessão. Se a chamada falhar (sem
     rede), o app guarda o pedido e tenta de novo na próxima abertura, antes de qualquer outra chamada.
   - Mesmo sem essa revogação, o servidor confere o titular, a preferência `push` ligada e o bloqueio
     entre membros na hora de montar cada envio, não na hora de enfileirar. Um aparelho que trocou de
     conta ou desligou o canal não recebe aviso da conta anterior.
   - Desligar o canal `push` nas preferências apaga as inscrições nativas da pessoa.
   - Retenção: a inscrição sai 90 dias depois de `coalesce(last_success_at, created_at)`. A purga é um job
     periódico (pg_cron) que não depende de haver envio.
3. **Envio.**
   - Android: API HTTP v1 de mensagens do Google, com conta de serviço.
   - iOS: APNs por HTTP/2 com chave de token (.p8), direto da Apple, sem o SDK do Google.
   - Os destinos HTTP são fixos no código; nada vindo da inscrição escolhe o host. Cada chamada tem timeout
     de 10 s.
   - Classificação das respostas:
     - destino inexistente ou inválido (404, 410, `UNREGISTERED`, `BadDeviceToken`) apaga a inscrição;
     - limite de taxa (429), cota, 5xx, timeout e falha de rede são temporários e voltam ao outbox com o
       mesmo teto de tentativas;
     - credencial do servidor recusada (401 ou 403) desliga o adaptador e gera alerta operacional, sem
       apagar inscrição.
   - O conteúdo de cada envio sai do mesmo construtor do Web Push: título "Bivaque", a frase fixa por tipo
     e o caminho do destino. Nenhum nome, trecho, foto ou dado de terceiro (§4 de 07/11).
4. **Permissão** (emenda do §5 de 07/11). O pedido do sistema aparece só em dois momentos:
   - quando a pessoa liga o canal `push` nas preferências (rótulo na tela: "No celular");
   - quando aceita um convite em contexto.
   Nunca ao abrir o app.
5. **Exceção do termo proibido, só para esse termo e só onde é necessária** (emenda do §8).
   - O teste de limites de produto passa a tratar o termo da plataforma do Google numa regra separada das
     demais proibições. Todas as outras proibições continuam valendo em todos os arquivos, inclusive no
     projeto Android.
   - O termo é aceito só nestes arquivos, nomeados um a um numa lista de exceções: o `build.gradle` do
     módulo app, o `build.gradle` raiz, o `variables.gradle` do projeto Android e o adaptador de envio do
     Android (escopo OAuth).
   - O teste prova três coisas:
     - o termo fora da lista reprova;
     - outro termo proibido dentro da lista reprova;
     - a lista só tem esses arquivos.
   - A varredura passa a incluir `.gradle`, `.kt`, `.xml` e `.plist`.
6. **Segredos e configuração.**
   - Nunca entram no repositório: a conta de serviço do Google, a chave .p8, os identificadores da Apple,
     o `google-services.json` e o `GoogleService-Info.plist`. Os dois arquivos de configuração ficam no
     `.gitignore`.
   - O build de CI gera na hora um `google-services.json` sintético, sem projeto real. A varredura de
     segredos roda também sobre os artefatos do build.
   - Sem as chaves, a inscrição nativa e os adaptadores nativos ficam desligados: o app não pede permissão
     nativa e o outbox não gera linha nativa. O interruptor da preferência `push` continua gravável e vale
     para a web instalada.
   - Logs, rastreamento, telemetria e mensagens de exceção nunca carregam o token do aparelho, o endpoint,
     o corpo ou a URL da requisição, a resposta do provedor nem qualquer credencial. Só carregam o tipo, o
     código de status e a contagem.
   - Um teste de redação, com valores sintéticos, prova isso no sucesso e no erro.
7. **O que esta fase prova e o que fica para depois das chaves.**
   - Provado sem as chaves:
     - unidade e integração dos adaptadores contra um servidor falso local. Ele valida a assinatura ES256
       de um JWT gerado com chave .p8 sintética e o token OAuth de uma conta de serviço sintética, e
       responde sucesso, destino inexistente, 429, 5xx, timeout e credencial recusada;
     - asserção de que o conteúdo enviado tem só título, frase fixa e caminho;
     - pgTAP positivo e negativo para `android` e `ios` (titular, troca atômica, limite, purga);
     - testes da rota (sessão, CSRF, validação, limite);
     - E2E no emulador Android, com o plugin simulado e token sintético: pedido de permissão nos dois
       gatilhos, inscrição gravada, revogação ao sair (inclusive sem rede, com nova tentativa) e toque numa
       notificação local abrindo o destino pelos links profundos;
     - o mesmo E2E no simulador iOS, no executor macOS do LAN-LOJA.
   - Fica para depois das chaves, como ato do dono no cartão LAN-PUSH: recebimento remoto real, renovação
     de token e toque numa notificação real, em aparelho Android e iOS. O LAN-PUSH só fecha depois disso.
     Antes, fica "pronto para as chaves".
8. **Ordem e CI.**
   1. O #163 (web) entra na main.
   2. Este ADR é mesclado.
   3. O projeto Capacitor (LAN-LOJA, primeiro item).
   4. O lote nativo.
   O build Android e os E2E de emulador e simulador rodam na suíte completa (`ci:full`, ADR-20261114),
   não no job rápido.

## Consequências

- Uma exceção nomeada, arquivo por arquivo, provada por teste negativo, no lugar de um nome neutro que
  esconderia a dependência.
- O coordenador avisa o dono quando o lote nativo passar: é o marco "pronto para receber as chaves".
- Sem as chaves, a produção continua só com Web Push. Nada quebra se as chaves nunca vierem.

## Alternativas consideradas

- **Serviço intermediário de push de terceiros (OneSignal e parecidos).** Recusado: é mais um processador
  do token, pede uma conta nova do dono e não tira a dependência do Google no Android.
- **Android sem push, só iOS e web.** Recusado: a maioria do público usa Android, e o dono pôs o push no
  lançamento.
- **Nome neutro no código, sem exceção no teste.** Recusado: o Gradle e o plugin exigem o nome real.
  Esconder isso torna o teste uma mentira.
- **Excluir a árvore Android inteira da varredura.** Recusado na auditoria: desligaria também as outras
  proibições naqueles arquivos.
