# Contrato de concorrência: conversas, grupos e família

Escopo: estado transitório dos componentes em `apps/app`. **Não** altera o
estado canônico no banco, políticas RLS, payloads nem rotas da API.

## Invariantes

| Jornada | Estado local | Eventos aceitos | Eventos rejeitados |
| --- | --- | --- | --- |
| Conversa: enviar | livre / enviando | enviar texto não vazio; resposta e erro liberam a trava | segundo submit enquanto o primeiro aguarda resposta |
| Conversa: mensagens anteriores | livre / carregando página | solicitar o cursor corrente, concluir, tentar novamente | duas leituras do mesmo cursor enquanto pendente; aplicar página após troca de cursor |
| Grupo: participação | livre / alterando | enviar pedido, cancelar pedido ou sair, conforme situação devolvida pela API | segunda mutação pendente; dispensar diálogo de confirmação durante o envio |
| Família: convites | livre / enviando convite / revogando | convidar, revogar, concluir, falhar e tentar novamente | envio duplicado antes do render; convite concorrente com revogação |

A interface mostra `disabled`/`aria-busy` durante a operação. A **ref síncrona**
é a guarda efetiva, pois o estado React pode ser renderizado depois do segundo
evento. O servidor segue como autoridade do resultado e das permissões; não
há atualização otimista dos fluxos aqui tratados.

## Contratos de erro e privacidade

- Falhas de envio não apagam o rascunho da conversa ou o motivo do pedido.
- Um novo envio é permitido quando a tentativa anterior terminou sem sucesso.
- O efeito de uma requisição abortada não atualiza a conversa anterior.
- O cliente não cria permissões e não afirma sucesso sem resposta da API.
- Não registrar texto de mensagens, motivo do pedido ou e-mails em logs técnicos.

## Limite de garantia

A guarda local impede eventos concorrentes **na mesma montagem da tela**.
Não é idempotência distribuída: duplicação entre abas, dispositivos ou após
timeout em que o servidor gravou, mas a resposta não chegou, requer chave de
idempotência verificada e aplicada no servidor e banco. **Não** adicionar
essa garantia sem migração/contrato próprio e teste de respostas ambíguas.

## Regressão exigida

- `apps/app/tests/e2e/mutacoes-concorrentes.spec.ts`: dois eventos no mesmo
  quadro com resposta da API retida; somente uma mutação observada.
- Suítes existentes de conversa, grupos e família: sucesso, erro e retry.
- Gates: lint, typecheck, unidade, build, Playwright nos seis tamanhos,
  e testes API/RLS negativos no CI antes de merge.
