# Bivaque — painel de prontidão

Painel de consulta por jornada, frontend e backend. A fonte canônica continua sendo
`public/board.json`; o resumo operacional `BOARD.md` é gerado. O painel não grava no banco do app.

## Consultar localmente

Node 22+, sem dependências adicionais:

```sh
npx pnpm@11.18.0 --dir tools/backend-kanban dev
```

Abra http://127.0.0.1:4175. `KANBAN_PORT` permite outra porta. O comando gera um retrato conservador,
sem consultar o GitHub. Para consultar as execuções, use `GITHUB_TOKEN` ou `GH_TOKEN` no ambiente:

```sh
node tools/backend-kanban/src/publish.mjs --github
node tools/backend-kanban/src/server.mjs
```

O servidor entrega apenas `index.html`, `styles.css`, `app.js` e `snapshot.json` de `dist/`.
`board.json`, provas livres e logs não são publicados. O navegador consulta o retrato a cada minuto;
isso não dispara testes nem muda a data original da coleta.

## O que os números significam

`launch` no próprio quadro referencia as dez jornadas F01–F10 de `docs/LANCAMENTO.md`, seus cards,
os caminhos de código relevantes, as verificações e as condições adicionais de lançamento.
Não há outro cadastro de tarefas nem um campo de percentual manual.

- Geral: jornadas com frontend, backend e integração comprovados / dez jornadas, arredondado para
  baixo. Não é média entre camadas e não estima tempo de trabalho.
- Por camada: jornadas comprovadas naquela camada / dez jornadas.
- Conclusão registrada: os cards vinculados estão `done`, com provas e sem drift. É declaração
  histórica, separada de comprovação na versão analisada.
- Provisório: falta ao menos um aceite atual e compatível com o escopo. Zero comprovado não
  significa zero implementado.
- Operação, troca de telas, legal, e-mail, prova final e pacote de loja ficam fora do denominador
  das jornadas Web, mas impedem o estágio de revisão de publicação enquanto não comprovados.
- Alterar o escopo exige atualizar `launch.version`; a comparação com o retrato anterior registra
  a mudança de escopo e a perda ou obtenção de comprovações.

## Vincular uma prova sem preencher percentuais

Após a revisão e a prova exigidas pela jornada, o executor registra no card `LAN-Fxx` o aceite de
cada camada. Isso é parte da entrega, não uma tarefa de atualização do dono:

```json
{
  "acceptance": {
    "frontend": {
      "scopeVersion": "2026-11-05",
      "revision": "HASH_COMPLETO_DA_REVISAO_REALMENTE_VERIFICADA",
      "proof": ["caminho/da/revisao-e-prova"]
    }
  }
}
```

O mesmo formato vale para `backend` e `integration`. Condições gerais usam `integration` no seu
próprio card. Não registrar aceite com base apenas em código, captura ou teste de demonstração.
Revisões visual, independente e de segurança continuam com os responsáveis previstos no processo.
O aceite de frontend ou backend pode ser registrado enquanto o card da jornada continua aberto:
a camada avança independentemente, mas a integração exige o fechamento do card inteiro.

Referências relativas precisam existir como arquivos dentro do checkout da coleta. Provas em
`.visual/` não versionadas precisam de uma referência durável para a coleta no CI. URLs aceitas
são execuções do próprio repositório no GitHub Actions: a API confere a revisão e o resultado real.
Uma referência inexistente ou indisponível deixa a camada sem comprovação. Conferir a referência
não julga o conteúdo da revisão; esse aceite continua sendo responsabilidade do processo independente.

A automação exige os passos configurados em `launch.checks` na revisão exata da main. Ausência,
passo ignorado, cancelamento ou erro de coleta nunca viram sucesso. Uma prova de revisão anterior
só é reaproveitada se o Git confirmar que os caminhos daquela camada e a definição de lançamento
continuam idênticos e o aceite citar a mesma versão de escopo. As verificações automáticas precisam
ser atuais mesmo quando o aceite é reaproveitável.
Dependências, lockfile, configurações raiz, scripts e workflows também invalidam a herança quando
mudam. A mesma regra de herança vale para as condições gerais de lançamento.

## Atualização e hospedagem

O workflow `readiness-dashboard.yml` recalcula após push na main, término das verificações da main,
publicação do app na branch `producao`, execução manual e a cada duas horas. Usa apenas o token
efêmero do Actions. Não necessita de chave do Supabase ou de um token da Vercel.

O artefato permitido é commitado na branch dedicada `painel-prontidao`. Um projeto **separado** na
Vercel deve apontar para essa branch, com framework `Other`, sem instalação/build e diretório de
saída `.`. A branch contém somente o site gerado. Sua integração Git publica as atualizações do
painel; a publicação do aplicativo continua no processo da branch `producao`.

Uma falha na consulta ao GitHub gera um retrato inconclusivo. Se a publicação automática parar,
o navegador avisa ao detectar um retrato com mais de três horas. Versão analisada, versão publicada
confirmada pelo GitHub e data da coleta são apresentadas separadamente. Publicação não equivale a
prova de uso em produção. Proteção do projeto deve cobrir também `snapshot.json` e os arquivos.

## Manter o quadro

```sh
node tools/backend-kanban/src/board.mjs --card LAN-F01
node tools/backend-kanban/src/board.mjs --search termo
node tools/backend-kanban/src/board.mjs --next
node tools/backend-kanban/src/board.mjs --write-summary
node tools/backend-kanban/src/board.mjs --check
node --test tests/scope/readiness.test.mjs tests/scope/readiness-publish.test.mjs
```

Atualize os cards apenas em transições materiais, preservando revisão e evidências. Nunca edite
`BOARD.md` manualmente. Novos itens precisam de fonte, checklist, dependências e revisão confrontada.
O aceite de produto é o do lançamento vigente; a validação estrutural não executa a prova declarada.
