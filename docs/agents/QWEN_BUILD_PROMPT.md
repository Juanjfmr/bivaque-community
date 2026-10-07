# Prompt de implementação das pranchas web — Bivaque

Atualizado em 08/09/2026 após revisão da execução no Claude Code. Preencher o bloco e anexar os PNGs à mesma chamada de implementação. Usar o contrato YAML existente válido; não pedir outro plano.

```text
Implemente este lote do Bivaque web até a validação local.

Card/contrato: [ID e caminho existente]
Checkout/base: [diretório, SHA e alterações a preservar]
Rotas: [1–3 telas relacionadas ou um fluxo pequeno]
Referências: [PNGs web anexados e reviewNotes aplicáveis]
Requisitos: [IDs/trechos da especificação funcional web]
Comportamento: [entrada → ação → persistência → feedback → retorno; falha principal]
Integrações: [consultas/actions/RPCs existentes; complemento necessário]
Permissões: [ator autorizado e negação relevante]
Arquivos: [caminhos do contrato, incluindo componentes necessários]
Validação: [testes afetados e cenário no navegador]

Siga AGENTS.md e a seção 0 de
docs/design/visual-guide-2026-09-06/PROCESSO-DE-CONSTRUCAO.md.
A versão visual atual e as correções do dono prevalecem sobre produto antigo.
Agora só web. Leia contexto do lote; não releia toda a documentação.
Inspecione a imagem e implemente na mesma execução, sem nova aprovação.
Se não conseguir vê-la, registre a limitação antes de alegar fidelidade.

Reutilize código válido já escrito. Não refaça W00, inventário ou demo.
Resolva escolhas reversíveis; preserve alterações de outras sessões.
Se faltar arquivo no escopo, informe ao coordenador o ajuste mínimo necessário.
Não paralise todo o produto nem altere fronteira sensível sem contrato adequado.

Use Next.js/React/TypeScript, HeroUI v3, wrappers e tokens existentes.
Superfícies claras, verde profundo e composição desktop responsiva.
Não use moldura de celular ou posicionamento da página por coordenadas do PNG.
Implemente integração real, erro/vazio/carregamento e ações com destino real.
Não substitua API por array local ou toast de sucesso. Preserve autorização.

Durante edição: verificações direcionadas; gate --fast nos pontos úteis.
Capture somente as rotas do lote no servidor disponível e compare com o PNG.
Capture 375/768/1440 no candidato estável. No fechamento: gate completo,
build e testes pertinentes uma vez, coordenados para evitar duplicação.
Não faça reset em banco compartilhado com outro executor ativo.
Não modifique migration aplicada nem exponha segredos.

Entregue: rotas/ações funcionais, diff, resultados de comandos, capturas
e pendência concreta. Não declare aprovação independente de si próprio.
Commit/push somente conforme atribuição e autorização da tarefa.
```

## Instrução ao coordenador

- Reconciliar primeiro os RECON já escritos em /inicio, /explorar, /communities e /notifications, um lote por vez. Verificar estado atual; existência de arquivo não comprova conclusão.
- Um escritor por checkout. Dois executores simultâneos somente em worktrees isolados, portas distintas e banco sob uso exclusivo quando necessário. Não redespachar tarefa ainda ativa.
- Reutilizar contrato/card; revisão e prova por lote estável com implementador, revisor e verificador distintos. Registrar resultado uma vez no card.
- Agrupar feedback em defeitos reproduzíveis. Respeitar retry_budget; esgotamento mantém FAIL/BLOCKED e exige diagnóstico e nova abordagem, nunca aprovação automática.
- Bloqueio externo afeta seu requisito; selecionar próximo lote independente e manter o bloqueado aberto. Não pedir decisões reversíveis já autorizadas.

## Correções que continuam obrigatórias

Produto nacional; Manaus é exemplo. Navegação: Início, Explorar, Comunidades e Perfil, com Guia e Mercado explícitos.

Login com e-mail/senha e Google conforme contrato atual; aceite já registrado não se repete. Vínculo: **Sou militar das Forças Armadas**. CPF rápido é o caminho principal; identidade militar digital é **um arquivo completo**, com IA como fallback e processamento privado. IA pendente não é integração entregue.

Motivo de participação opcional. Perguntas permitem **Toda a cidade** autorizada. Evento permite **Pedir mais informações** sem exigir RSVP. Força Armada e OM são opcionais e autodeclaradas, cada qual com visibilidade controlável inicialmente desligada. Não criar selo público, posto, endereço residencial, pagamento ou SLA inventado.

Referências: [decisões](../design/visual-guide-2026-09-06/DECISOES-2026-09-07.md), [catálogo funcional web](../superpowers/specs/2026-09-08-reconstrucao-visual-web-design.md) e [processo §0](../design/visual-guide-2026-09-06/PROCESSO-DE-CONSTRUCAO.md).
