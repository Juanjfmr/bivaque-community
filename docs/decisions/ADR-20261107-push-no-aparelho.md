---
id: ADR-20261107-push-no-aparelho
status: accepted
risk: R3
owner: Juan
approved_at: 2026-11-07 (por delegação; mandato do lançamento de 02/11 e ADR-20261105-entrada-enxuta-e-r3-sem-parada)
expires_at:
linked_plan: docs/LANCAMENTO.md
critic_verdict: pending
critic_review: revisão independente e security-auditor no PR que implementa (RUN-137)
---

# Push no aparelho: inscrição, envio pelo outbox e o que aparece na tela bloqueada

## Problem

O dono decidiu em 04/11 que o push entra no lançamento: sem push, a pessoa não volta ao app. O canal `push`
já existe na matriz de preferências (20261106214256), mas nada guarda o destino do envio, nada envia e nada
diz o que a notificação pode mostrar. A inscrição do aparelho é dado pessoal e cria um destino de envio
novo, por isso o card LAN-PUSH ficou parado até este ADR.

O app ainda não está empacotado para as lojas (não há Capacitor no workspace). O push do app de loja depende
desse empacotamento e das chaves do Google e da Apple, que são atos do dono. A web instalada pode receber push
hoje, pelo padrão Web Push.

## Decision

1. **Onde mora.** Tabela `public.push_subscriptions`, com RLS habilitada e forçada:
   - colunas: `id`, `user_id` (FK para `auth.users` com `on delete cascade`), `kind` (`web`, `android`, `ios`),
     o destino do provedor (endpoint ou token), as chaves públicas da inscrição web quando houver, um rótulo
     curto do aparelho, `created_at` e `last_success_at`;
   - um destino é único por `kind`; reinscrever o mesmo destino troca o dono e renova a data, nunca duplica;
   - o membro lê, cria e apaga só as próprias linhas, sempre pela rota do app (`/api/app/push`), nunca escreve
     `user_id` vindo do corpo; não há UPDATE de cliente;
   - o envio lê as inscrições pelo papel de serviço; nenhum outro membro alcança a tabela.
2. **Quando some.**
   - ao sair do app (a rota apaga a inscrição deste aparelho);
   - ao apagar a conta (cascade);
   - quando o provedor responde que o destino não existe mais (gone/not found);
   - quando passa 90 dias sem envio aceito.
3. **Envio.** Pelo mesmo outbox dos avisos: a notificação gravada gera a linha do canal `push` só quando a
   preferência do membro liga esse canal e o bloqueio entre membros permite, com o mesmo limite de lote do
   outbox. Falha temporária tenta de novo pelo outbox; falha definitiva apaga a inscrição.
4. **Tela bloqueada.** Título "Bivaque" e uma frase fixa por tipo de aviso, sem nome, foto, trecho de conteúdo
   ou qualquer dado pessoal de outra pessoa (ex.: "Responderam a sua pergunta"). O detalhe só aparece dentro do
   app, depois de entrar. O toque abre o destino do aviso no app, pelos mesmos links profundos do F09
   (NOTIF-DEEPLINKS); destino desconhecido cai na tela segura.
5. **Permissão.** O pedido de permissão do sistema só aparece quando a pessoa liga o push nas preferências de
   aviso ou aceita um convite em contexto, nunca ao abrir o app.
6. **Chaves.** A chave privada do Web Push (VAPID) e as credenciais do Google e da Apple são segredos de
   servidor, configurados pelo dono no ambiente de produção; nenhum valor vai para o repositório. Sem a chave,
   o envio fica desligado e o app não oferece o push.
7. **Ordem de entrega.** Agora: tabela, rotas, envio Web Push e inscrição na web instalada (RUN-137). Depois do
   empacotamento para as lojas: inscrição nativa (`android`, `ios`) e prova no emulador e no simulador.
8. **Limite de produto.** O código não usa o nome da plataforma do Google proibido pelo teste de limites de
   produto (`tests/privacy/product-boundaries-and-pii.test.ts`); os adaptadores têm nomes neutros.

## Consequences

- O LAN-PUSH fecha em duas partes: web agora; loja quando o app for empacotado e o dono configurar as chaves.
- Uma tabela nova com dado pessoal: pgTAP positivo e negativo, auditoria de segurança no PR.
- O texto da tela bloqueada é deliberadamente pobre; o ganho é a pessoa voltar ao app, não ler o aviso fora dele.

## Alternatives considered

- **Inscrição no schema `private` com RPC.** Mais fechado, mas o molde do app (ADR-20261105-porta-de-dados-do-app)
  já passa por rota com o cliente da sessão sob RLS; a tabela pública com RLS forçada e sem UPDATE é suficiente.
- **Texto rico na tela bloqueada (nome de quem respondeu, trecho).** Recusado: expõe dado de terceiro em tela que
  qualquer pessoa perto do aparelho vê.
- **Esperar o empacotamento para fazer tudo de uma vez.** Recusado: a web instalada já pode receber push, e o
  modelo de dados serve aos dois.
