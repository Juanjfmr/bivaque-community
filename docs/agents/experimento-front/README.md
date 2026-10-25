# EXP-001 — Qual front para o app: React ou Lit, com o Next como hospedeiro

Decisão do dono em 24/10/2026: o front do app passa a ser construído a partir do protótipo
(`prototypes/bivaque-html/`), com o Next atual só como hospedeiro (servidor, sessão, entrada e operações que já
funcionam). Ficaram duas formas de fazer as telas, e elas serão comparadas na mesma jornada antes da escolha:

- **Candidata React:** telas do protótipo convertidas para React.
- **Candidata Lit:** telas do protótipo convertidas para templates `lit-html` (a base do Material Web).

Origem: duas rodadas de conversa entre o Claude (Opus) e o gpt-6.1-sol, registradas no ADR que sair deste
experimento. Protocolo: `.claude/skills/experiment-protocol/SKILL.md`.

Este diretório guarda o contrato congelado. **Nada aqui muda depois que a produção começa.**

| Arquivo | O que é | Quem escreve |
|---|---|---|
| `README.md` | este contrato | coordenador |
| `jornada.md` | a jornada, tela por tela, com as fontes do protótipo | coordenador |
| `navegacao.md` | as regras de navegação do protótipo (abas, origem, voltar, recarregar, filtros) | rascunho por modelo, revisão do coordenador |
| `acessibilidade.md` | os rótulos e papéis acessíveis que os testes usam, iguais nas duas candidatas | idem |
| `medicao.md` | como cada métrica é medida e os limites | coordenador |

## 1. O que é fixo para as duas

- **Base:** branch `codex/exp-front-base`, que é a base do lote 5 mais a preparação deste experimento.
- **Rota:** `/app`, uma página só do Next, em `apps/web/app/app/`. A navegação interna é por fragmento, como no
  protótipo (`/app#comunidade`, `/app#pergunta/<id>`). **Dentro de `/app`, o shell da candidata é o único dono do
  histórico:** nada de `router.push`, `Link` do Next ou outro roteador mexendo no histórico.
- **Telas:** as da jornada (`jornada.md`), com o HTML, o CSS e o comportamento do protótipo.
- **Navegação:** as regras de `navegacao.md`.
- **Acessibilidade:** os rótulos e papéis de `acessibilidade.md`. É por eles que os testes acham os elementos.
- **Dados:** banco real, pelo cliente de sessão que já existe (`apps/web/lib/supabase/client.ts`), com as tabelas,
  RPCs e regras de acesso que já existem. **Nenhuma migration.** Nada de `service_role` no navegador.
- **Login:** pelas telas de entrada que já existem no Next. `/app` sem sessão manda para o login e volta para o
  mesmo destino interno depois, validado.
- **Tema:** claro e escuro seguindo o sistema, inclusive quando o sistema muda com o app aberto, como no protótipo.
- **Dependências:** as que já estão no `apps/web`, mais `lit` 3.3.3 (já no lockfile, como dependência do Material
  Web). **Nenhuma outra.**
- **Produtor:** o mesmo modelo (gpt-6-luna), com o mesmo orçamento, a mesma instrução-base e o mesmo acesso.
- **Orçamento por candidata:** 1 execução de construção e até 2 de correção. Esgotou sem passar nos eliminatórios:
  a candidata está fora.

## 2. O que é livre

- A organização interna do código, dentro de `apps/web/app/app/` e de uma pasta própria em `apps/web/lib/`.
- Como o estado assíncrono, o cache, a paginação e a atualização da tela são feitos, desde que sem dependência
  nova.
- Como a candidata evita publicar duas vezes e preserva o rascunho.

## 3. Eliminatórios (decididos antes da produção)

Qualquer um reprova a candidata, por melhor que seja o resto.

1. **Acesso:** toda leitura e escrita passa pelas regras do banco; nenhuma chave de serviço no navegador; conta sem
   acesso à cidade não vê as perguntas dela.
2. **Sem duplicar:** com a resposta da gravação perdida (tempo esgotado depois de gravar), tentar de novo gera uma
   pergunta só.
3. **Rascunho:** erro de rede ao publicar não perde o texto.
4. **Navegação:** todos os casos de `navegacao.md` passam: aba ativa, origem por entrada do histórico, voltar,
   avançar, recarregar, link direto, a mesma pergunta aberta por origens diferentes, troca de filtro.
5. **Escape:** título e corpo de pergunta com HTML e aspas aparecem como texto; nada executa.
6. **Gate verde e build ok.**

## 4. O que se compara (detalhe em `medicao.md`)

1. Correções que o produtor precisou: rodadas, defeitos achados, tempo e tokens.
2. Fidelidade: capturas comparadas com o protótipo em 375, 768 e 1440, claro e escuro, inclusive carregando e com
   erro; foco, teclado e movimento reduzido.
3. Falhas: respostas fora de ordem, sessão expirada, duas abas.
4. Desempenho em celular intermediário emulado (CPU 4× mais lenta, 4G lenta): abrir, responder ao toque, rolar,
   memória e bytes.
5. Tamanho: linhas novas, dependências diretas, bundle de `/app`.
6. Manutenção: uma mesma mudança de requisito pedida às duas depois do julgamento.

## 5. Julgamento e decisão

- As candidatas chegam ao juiz como `A` e `B`. O juiz é o gpt-6.1-sol, só leitura, e não produziu nenhuma. A
  medição de execução e as capturas são cegas; o código não tem como esconder a tecnologia, e isso fica registrado.
- Ordem: eliminatórios, depois medida objetiva, depois ofício (argumentado e marcado como argumento).
- Se nenhuma passar nos eliminatórios, o resultado é `NENHUMA`.
- O juiz entrega ranking, distância e a pergunta que sobra. **Quem escolhe é o dono.**

## 6. Correções do instrumento (24/10/2026, depois da primeira medição)

A primeira medição achou três defeitos **na bateria**, não nas candidatas. Eles faziam o teste medir outra coisa que
o critério. Foram corrigidos igual para as duas, sem mudar critério nenhum, e as duas foram medidas de novo do zero.

1. **Títulos repetidos na carga.** A carga gerava títulos iguais entre as 2.000 perguntas; os testes acham a
   pergunta pelo nome acessível e o seletor achava dois botões. Cada título ganhou um número no fim.
2. **Prazo do aviso no rascunho.** A biblioteca do Supabase repete leituras que falham na rede (1, 2 e 4 s). As duas
   candidatas conferem no banco se a gravação chegou antes de avisar, e o aviso vinha em uns 7 s; o teste esperava 5.
   O critério é não perder o texto, não o prazo; o teste passou a esperar até 15 s.
3. **Duas abas no filtro errado.** "Para ajudar" mostra só perguntas de outras pessoas (`list_indications` com
   `p_mine` falso). A segunda aba passou a procurar a pergunta em Minhas.

Também na primeira medição, antes destas, o roteiro não apontava o Chromium instalado e nenhum teste rodou; foi
corrigido sem medição válida perdida.

### Versão 2 do instrumento (24/10/2026)

1. **Mesma pergunta em duas origens.** A carga garante que a pergunta `f001` da conta visual apareça na faixa do
   Início e em Minhas: o protótipo inclui perguntas próprias no Início, mas a faixa mostra só duas; as demais
   perguntas da carga recebem ao menos uma resposta para não ocultar `f001` na ordenação. O teste espera a lista
   pronta, confere o mesmo ID, `parent`, `origin`, aba ativa, foco e rolagem após cada retorno. Isso corrige o caso
   medido sem alterar o critério.
2. **Resumo do Playwright.** O agregador percorre a árvore de suítes, lê o título do spec e o projeto de cada
   execução; registra cada eliminatório por projeto e os dez casos de navegação. Um caminho opcional para o log do
   gate inclui seu resultado no resumo. Isso evita classificar incorretamente os resultados individuais.
3. **Métricas de celular.** Cada interação tem 20 amostras, mediana e p95; o cache frio só fica pronto quando há
   perguntas na lista. O roteiro carrega dez páginas contando os itens a cada avanço e mede quadros durante a
   rolagem; bytes separam abertura fria e sessão, e memória arredondada aparece como “sem precisão”. Isso torna as
   medidas compatíveis com o que o contrato pede.
4. **Capturas de estado.** Carregando e erro guardam apenas a captura da candidata; a diferença de pixels fica só
   para o estado normal, pois o protótipo não implementa aqueles estados. Isso evita comparar telas diferentes.
- Revisão do coordenador na versão 2: o caso "Mesma pergunta" não lê `history.state` nem outro estado interno. A origem de cada entrada é conferida pelo que se vê: URL, aba ativa, destino do voltar, rolagem e foco. Ler o formato interno do protótipo acoplaria o teste a uma implementação.
