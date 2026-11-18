# ADR-20261117 — F10: a conta fica toda no app (Você e Apagar conta)

- Status: Aceito por delegação — aguarda ratificação do dono (17/11/2026, lote RUN-184)
- Decide sobre: `docs/LANCAMENTO.md` fase 6 e linha F10; `ADR-20261101-entrada-unica-por-codigo` §2
  (senha e recuperação); `ADR-20261024-front-react-spa` §8 (ordem da troca)
- Escopo do lote: `/configuracoes*`. `/salvos` fica para o lote seguinte, na mesma casca.

## Contexto

A tela `apps/web/app/(shell)/configuracoes/conta` (523 linhas) ainda servia tela de membro na web
depois de o perfil próprio (RUN-172) e a família (SEC-011) já serem do app. A fase 6 do lançamento
exige que nenhuma rota de membro no `apps/web` sirva tela — só landing, servidor e painel do
operador —, e o §8 do ADR da SPA manda cada jornada sair com o código e os testes dela, com o
endereço antigo redirecionado.

O que a tela antiga fazia, e onde cada parte está:

| Parte | Situação em 17/11 |
|---|---|
| Perfil, cidade, Força/OM, sair | já no Você do app (`/app/voce`, RUN-172) |
| Família convidada | já no Você do app (SEC-011) |
| Bloqueados | já em `/app/bloqueados` |
| Preferências de aviso | já no Você do app (`PreferenciasDeAvisos`) |
| Exclusão da conta | já em `/app/apagar-conta`, com aviso **incompleto** |
| Troca de e-mail | **não existe no app** |
| Senha e "Esqueci minha senha" | fora por decisão anterior (§2 do ADR-20261101) |

## Decisão

1. **Troca.** `/configuracoes`, `/configuracoes/conta` e as subrotas sombreadas (`bloqueados`,
   `familia`, `notificacoes`) respondem 307 para o app: a conta vai para `/app/voce` e bloqueados
   para `/app/bloqueados`, com a query preservada. A árvore
   `(shell)/configuracoes/` sai inteira — página, layout, header, nav, error, loading, os resíduos
   de bloqueados e `trust-actions.ts`, cujo único consumidor era a página de bloqueados. Os links
   vivos (rodapé da casca e atalho da Ajuda pública) passam a apontar direto para `/app/voce`, e
   `active-nav`/`create-visibility` deixam de citar `/configuracoes`: o 307 roda antes da casca, e
   uma área declarada para rota que não serve tela é dívida silenciosa.
2. **Troca de e-mail fica fora do lançamento — decisão do dono, 17/11.** O app não ganha rota nem
   folha de troca de e-mail, e a tela antiga não é reproduzida. Quem precisar trocar o e-mail usa o
   canal de Ajuda (o app tem Ajuda e "Fale com a gente"). É exclusão de escopo dentro do mandato:
   R2, registrada aqui e na linha de ratificação.
3. **Senha e recuperação saem com a tela, sem ADR novo.** É o que o ADR-20261101 §2 já decidiu: "O
   e-mail e a senha saem da tela, junto com 'Esqueci minha senha' e a troca de senha". Os links
   morrem com a página; `/recuperar-senha` e `/nova-senha` continuam 307 para `/app/entrar`.
4. **O aviso da exclusão passa a ser o da tela antiga, inteiro.** `/app/apagar-conta` diz o mesmo
   que a web dizia: o que sai agora (sessão encerrada, perfil oculto, o que foi publicado continua
   atribuído ao nome de exibição), o que sai no prazo (conta, credenciais, perfil e fotos,
   preferências e vínculos; convites familiares pendentes encerrados com a outra conta intacta),
   o que permanece e por quê (moderação anonimizada; logs de acesso por 6 meses, MCI art. 15) e
   como pedir ajuda. **O prazo continua vindo do banco**: `request_account_deletion()` devolve
   `due_at` e a tela mostra essa data por extenso. Os "15 dias" do bloco são o texto jurídico
   aprovado (a janela é `private.account_deletion_window()`), não um número calculado na tela; antes
   do pedido não existe data para exibir, e inventar uma seria o oposto do que a tela promete.
5. **"Pedido registrado" continua na própria tela.** A web navegava para `/conta-apagada`; o app
   registra o pedido e fica onde está, com o prazo do banco e a ação fora de oferta. A sessão é
   revogada no servidor pela RPC, então não há o que navegar. `/conta-apagada` continua pública para
   link antigo e e-mail já enviado, e por isso segue declarada no inventário de portas.
6. **Divergência de confirmação registrada:** a web confirmava com caixa de seleção ("Entendi que a
   exclusão é permanente…"); o app confirma digitando **APAGAR** — desenho aprovado do app, mais
   forte que a caixa, e mantido. A linha destrutiva é a mesma pessoa jurídica de texto.
7. **Cobertura migra, não se perde.** `tests/e2e/account-deletion-ui.spec.ts` deixa de abrir
   `/configuracoes/conta` e passa a medir o endereço antigo caindo no Você e o aviso aprovado em
   `/app/apagar-conta`, sem confirmar o pedido real (a conta do seed é compartilhada; a jornada
   destrutiva é provada em `.visual/prova-exclusao.mjs`, com conta descartável). Os unitários que
   liam arquivos da árvore removida foram removidos ou ajustados, com o motivo no relatório do lote.

## Consequências

- Nenhuma mudança de banco, de RPC, de grant ou de policy. `request_account_deletion` e
  `is_account_deletion_pending` ficam como estão, e a purga `/api/internal/account-deletion` não é
  tocada.
- `lib/convite/familia.ts` e `hint.ts` ficam: a API do app usa.
- O inventário de links (`git grep` de `/configuracoes`) fecha sem resíduo em `apps`, `tests` e
  `scripts`; as capturas visuais das telas removidas saem de `scripts/visual/capture.mjs`.
- Perda declarada: quem quiser trocar e-mail precisa falar com o suporte. Se o produto quiser a
  troca no app depois, ela é jornada nova (auth + dado pessoal: R3) com rota API própria.
- `/salvos` continua na web até o lote seguinte, com o link da casca ainda apontando para lá.
