# Lançamento do Bivaque — o que é "pronto"

Escrito em 02/11/2026, a pedido do dono: "Não aceitarei trabalho pela metade." Este arquivo é a
única definição de pronto do lançamento. O quadro acompanha cada item; os ADRs dizem como cada
coisa funciona; nada fora daqui entra no lançamento sem uma linha nova aqui, com data e motivo.

## Onde estamos (02/11/2026)

- O app logado é o `apps/app` (React de página única). Ele tem as 30 telas do protótipo, **todas com
  dados de demonstração**: nenhuma jornada está ligada ao banco.
- F01 (entrada) e Grupos foram refeitos pela régua Nextdoor, em prévia. A rodada de identidade das
  peças está feita; o veredito de maturidade (meu e do Astra, em separado) foi "em parte".
- O `apps/web` (Next) é o que está no ar: servidor, landing e as telas antigas em HeroUI.
- O banco tem o domínio da Comunidade em redesenho (RED-003), ainda sem prova completa.
- A linha do `apps/app` (cerca de 560 commits) ainda não está na main.

## Mudanças de escopo

- 04/11/2026, decisão do dono: a notificação push no celular entra no lançamento (F09 e app de
  loja). Motivo: sem push a pessoa não volta ao app. O token do aparelho é dado pessoal; o desenho
  passa por ADR por delegação antes do código (card LAN-PUSH).

## O que é "lançado"

Uma pessoa de qualquer cidade do Brasil instala ou abre o Bivaque, entra, tem o vínculo militar
verificado, escolhe a cidade e usa as dez jornadas abaixo com dados reais, no celular e no
computador, nos dois temas, sem erro e sem tela de mentira. O app de loja (Android e iOS) está
pronto para envio. Publicar e enviar às lojas são atos do dono.

## Quando uma jornada está pronta

Todos os itens, sem exceção:

1. **Inteira.** Entrada, ação, gravação, retorno visível, acompanhamento e o caminho de falha
   principal funcionam no app integrado, com dados reais do banco local.
2. **No nível da régua.** Revisão às cegas (por outro modelo) contra as telas do Nextdoor no Mobbin, citadas no
   cartão, sem "abaixo da régua" em interface e clareza. Cada tela parte de referências reais.
3. **Provada.** E2E em 375, 768 e 1440 px, claro e escuro; teste de banco com caso positivo e
   negativo em toda permissão; capturas em `.visual/`; gate completo verde na revisão integrada.
4. **Segura e privada.** Rotas no contrato do ADR do app (§5), RLS forçada, nada de CPF cru, payload
   do Portal ou dado proibido gravado; `security-auditor` sem CRITICAL/HIGH nos lotes R3.
5. **Acessível.** Teclado, leitor de tela, contraste AA, alvos de 44 px, movimento reduzido.
6. **Trocada.** A tela antiga do `apps/web` saiu no mesmo lote que fechou a jornada, com
   redirecionamento e portão do proxy ajustados. A troca acontece jornada por jornada, não no fim.

## As jornadas

| # | Jornada | Entra no lançamento | Fica fora |
|---|---|---|---|
| F01 | Entrada e onboarding | Google, Apple e código por e-mail sem senha (ADR de 01/11); aceite; CPF e verificação pelo Portal com caminho de revisão; cidade e momento; sugestão de grupos; boas-vindas; convite familiar; recuperação e retomada | Pergunta de relação antes do CPF |
| F02 | Início e busca | Início da cidade, busca em perguntas, grupos, anúncios, negócios e guia, com resultados que levam ao conteúdo | Ranking por IA |
| F03 | Criar | Pergunta, publicação em grupo com foto, evento e anúncio, com rascunho, revisão e erro | Tipos novos de conteúdo |
| F04 | Comunidade e grupos | Perguntas da cidade e "Também perguntar à cidade"; grupos com entrada, pedido e motivo; publicação, comentário e resposta encadeada; "Útil", salvar, seguir, fixar, ocultar; resposta que resolveu; denúncia e conduta | Enquete, "Útil" que ordena |
| F05 | Eventos | Agenda da cidade, detalhe, presença e cancelamento, pedido de informação, criar e editar | Ingresso pago |
| F06 | Mercado e moradia | Desapegos e imóveis com filtros, detalhe, interesse que abre conversa; criar, revisar e gerenciar anúncio; endereço exato ou aproximado por escolha | Checkout e pagamento (BLOCK-ASAAS) |
| F07 | Negócios e serviços | Categorias, ficha do negócio, pedido e acompanhamento, ficha própria e convite de prestador | Alcance pago, Bivaque Mais |
| F08 | Guia | Busca e categorias, leitura, salvar, sugerir atualização | Curadoria por IA |
| F09 | Conversas e avisos | Caixa, conversa contextual, resposta; avisos no app, por e-mail e por push no celular, com destino certo; preferências por canal | Presença e confirmação de leitura |
| F10 | Você, família e conta | Perfil e edição, família (convite e saída), privacidade, bloqueados, ocultados, salvos, apagar conta | Exibir Força e OM a outros (BLOCK-AFFILIATION) |

## O que vale para o app inteiro

- **Identidade.** Uma biblioteca de peças, a casca (barra de baixo no celular e coluna no
  computador) em todas as telas e a mesma cara em todas as jornadas. Paleta revisada (autorizada em
  02/11), registrada no ADR de identidade.
- **Operação (OP).** O painel do operador continua no `apps/web` (ferramenta interna, fora do
  app do membro) e fecha pelos mesmos critérios 1 a 5, nestes ciclos: fila de verificação manual
  (documento → decisão → aviso ao membro → descarte); denúncia (conteúdo → decisão → efeito →
  aviso a quem denunciou, sem revelar a ação); suspensão (aplicar → efeito no app → encerrar). Fecha
  na fase 4, depois do F04 (fase 3), que gera as denúncias. E-mail transacional pelo domínio do Bivaque;
  registro de erros sem dado pessoal.
- **Desempenho.** Lighthouse em modo celular, com a emulação e a rede padrão dele (Slow 4G, CPU
  4x), cache vazio, contra o build de produção e a stack local com seed: LCP ≤ 2,5 s e TBT ≤ 200 ms
  na mediana de três execuções em Início, grupo, Mercado e conversa. Nenhuma lista sem paginação.
- **Legal.** Termos, Política de Privacidade e Código de Conduta no app, na versão revisada pelo
  advogado (pacote em `docs/legal/`).
- **App de loja.** Capacitor sobre o mesmo build: login Google pelo navegador do sistema, Apple
  nativo, sessão ao reabrir, foto pela câmera, links profundos, notificação push que abre o destino
  certo. "Pronto para envio" é: projeto
  Android e iOS no repositório; build de release do Android (AAB) e do iOS (arquivo do Xcode, num
  executor macOS do CI) gerados pelo CI sem a assinatura de produção; os seis itens provados no
  emulador Android e no simulador iOS. Com isso o pacote está pronto para envio. Assinar com as
  chaves das lojas, preencher as fichas e enviar vêm depois, como atos do dono; se algum dos seis
  itens só puder ser provado com uma conta ou chave do dono (por exemplo, o Apple Sign In real),
  ele fica "bloqueado pelo dono" e o pacote não está pronto até essa prova.

## Ordem

| Fase | O quê | Fecha com |
|---|---|---|
| 0 | Instruções sem ruído; deploy separado do merge; linha do `apps/app` integrada na main | main com o app, CI verde, nada publicado |
| 1 | Identidade final: paleta, casca em todas as telas, rodada de maturidade (topo de grupo, menu "⋯", rostos, arte no escuro, computador) | revisão às cegas "no nível" na casca e nas telas-modelo |
| 2 | F01 ligado ao banco (ADR de entrada aceito por delegação) | F01 pronto pelos seis critérios |
| 3 | F04 ligado, com o redesenho da Comunidade (RED-003) provado | F04 pronto |
| 4 | F02, F03, F09 e F10; operação (OP) | cada uma pronta |
| 5 | F06, F07, F05 e F08 | cada uma pronta |
| 6 | Varredura da troca: resíduos das telas antigas, rotas sem dono, ferramentas de setembro que leem `docs/historico` | nenhuma rota de membro no `apps/web` servindo tela; só landing, servidor e painel do operador |
| 7 | App de loja e prova final: e2e completo, segurança, desempenho, acessibilidade, ensaio de deploy | relatório final e lista de ratificação |

## Marcos com o dono

O dono é chamado só nestes pontos, com tudo pronto para olhar no celular:

1. Fim da fase 1 — a cara final do app.
2. Fim da fase 3 — entrada e comunidade de verdade, num ensaio publicado se o dono quiser.
3. Fim da fase 7 — o lançamento inteiro e a [lista de ratificação](decisions/RATIFICACAO.md).

## Atos que só o dono pode fazer

- [ ] Na Vercel, trocar a Production Branch de `main` para `producao` (uma vez).
- [ ] Publicar: avançar a branch `producao` (ou rodar o workflow de migrations manualmente).
- [ ] Contas e chaves de produção: Google OAuth, Apple Sign In, serviço de push do Google (FCM) e chave de
      push da Apple (APNs), domínio de e-mail (Resend), chave do
      Portal da Transparência no ambiente de produção, Apple Developer e Google Play.
- [ ] Revisão do advogado nos textos legais.
- [ ] Teste no celular nos marcos.
- [ ] Ratificar as decisões R3 tomadas por delegação.
- [ ] Enviar às lojas.
