# F01 — cobertura de login, cadastro e onboarding

Estado: **desktop aprovado pelo dono em 30/10/2026 (28 telas); celular gerado (28 telas), aguardando aceite**. F02–F10 suspensos. Fonte consultada em 30/10/2026: branch `codex/ui-foundation-21st-20261026`, revisão `66f8c13e`, `apps/app/src/telas/Entrar.tsx` (estados/títulos) e `apps/app/components/bivaque/formulario-negocio.tsx` (etapas). Esse levantamento descreve o protótipo existente; não aprova regras de backend nem introduz módulos.

## Telas e caminhos existentes

| Estado no código | Tela | Referência individual |
|---|---|---|
| `conta` | Cadastro | Desktop gerado: F01-02-conta; desktop aprovado; celular gerado |
| `login` | Login | Desktop gerado: F01-01-login; desktop aprovado; celular gerado |
| `aceite` | Aceites | Desktop gerado: F01-03-aceite; desktop aprovado; celular gerado |
| `cpf` | Verificar vínculo com CPF | Desktop gerado: F01-04-cpf; desktop aprovado; celular gerado |
| `resultado` | Vínculo confirmado | Desktop gerado: F01-05-vinculo-confirmado; desktop aprovado; celular gerado |
| `analise` | Vínculo em análise | Desktop gerado: F01-08-analise; desktop aprovado; celular gerado |
| `documento` | Identidade em arquivo único | Desktop gerado: F01-07-documento; desktop aprovado; celular gerado |
| `consulta-indisponivel` | Consulta indisponível | Desktop gerado: F01-06-consulta-indisponivel; desktop aprovado; celular gerado |
| `convite-indisponivel` | Convite indisponível | Desktop gerado: F01-17-convite-indisponivel; desktop aprovado; celular gerado |
| `cidade` | Cidade e momento | Desktop gerado: F01-09-cidade (+ 09b chegando, 09c saindo); desktop aprovado; celular gerado |
| `sugestoes-grupos` | Sugestões de grupos | Desktop gerado: F01-10-grupos; desktop aprovado; celular gerado |
| `negocio` | Negócio opcional: divulgar, interesse ou depois | Desktop gerado: F01-11-negocio; desktop aprovado; celular gerado |
| `negocio-formulario` | Formulário de negócio: cinco etapas abaixo | Desktop gerado: F01-12a a 12e (cinco etapas); desktop aprovado; celular gerado |
| `negocio-interesse` | Interesse em criar negócio | Desktop gerado: F01-12f-negocio-interesse; desktop aprovado; celular gerado |
| `boas-vindas` | Boas-vindas | Desktop gerado: F01-13 chegando, 13b moro aqui, 13c saindo; desktop aprovado; celular gerado |
| `retomar` | Retomar cadastro | Desktop gerado: F01-14-retomar; desktop aprovado; celular gerado |
| `senha` | Recuperar senha | Desktop gerado: F01-15-senha (+ 15b enviada); desktop aprovado; celular gerado |
| `convite` | Convite familiar | Desktop gerado: F01-16-convite; desktop aprovado; celular gerado |
| `apagada` | Conta apagada | Desktop gerado: F01-18-apagada; desktop aprovado; celular gerado |

## Negócio opcional — etapas existentes, uma imagem para cada uma

1. O que você oferece? Nome, área e especialidades.
2. Onde você atende? Opções e campos condicionais existentes.
3. Como funciona seu atendimento? Agendamento, horário fixo ou combinação; mostrar os respectivos campos sem transformá-los em funcionalidade de agenda.
4. Como podem conhecer seu trabalho? Fotos e apresentação/contatos existentes.
5. Confira sua página. Revisão e retorno para corrigir.

## Fechamento visual

- Caminho principal e alternativas existentes: login, cadastro, vínculo, cidade/momento, grupos, negócio opcional, boas-vindas; recuperação, convite e retomada.
- Estados locais de preenchimento, carregamento, erro e retorno que alterem a tela precisam de referência própria. Consultar os controles e os testes existentes antes de desenhar; esta lista ainda não é contagem final de imagens.
- Uma tela inteira por arquivo, sem pranchas ou recortes; mesma composição, tipografia, marca oficial e padrões de interação entre as telas.
- Associar cada referência aos blocos realmente consultados. `Entrar.tsx` atribui a composição a [Login Form Card](https://21st.dev/@felipemenezes098/components/card-06); essa atribuição do código ainda precisa ser confrontada com o componente, não comprova por si licença ou fidelidade da nova imagem.
- Revisar todas as referências e apresentar F01 completo para aceite visual. Nenhum estado aprovado apenas porque o gerador terminou, nem novo flow iniciado por uma imagem isolada.

Não foram executados novos testes nem verificado runtime neste levantamento. Os testes existentes em `apps/app/tests/e2e/entrada-21st.spec.ts` são fonte de caminhos a conferir, não prova renovada nesta sessão.
