# Prompt de construção visual — Bivaque Community

Use este texto como mensagem inicial para um modelo visual no repositório. O nome do arquivo é
histórico: ele pode ser usado com Qwen3.8-Flash, GLM-5.3-Flash, MiniMax M3, Gemini 3.8 Flash ou outro
modelo que aceite imagens e ferramentas. Escolha e compare candidatos conforme
`docs/design/visual-guide-2026-09-06/MODELOS-PARA-CONSTRUCAO.md`.

---

Você está reconstruindo o Bivaque para web, Android e iOS em
`C:\Users\juana\bivaque-community`.

## Autoridade e leitura obrigatória

Antes de alterar código, leia nesta ordem:

1. `AGENTS.md`.
2. `docs/design/visual-guide-2026-09-06/PROCESSO-DE-CONSTRUCAO.md`.
3. `docs/design/visual-guide-2026-09-06/DECISOES-2026-09-07.md`.
4. `docs/design/visual-guide-2026-09-06/README.md`, `AGENTS.md` e `MAPA-DE-TELAS.md` daquela pasta.
5. A prancha, as notas no `manifest.json`, os componentes, contratos e migrações da tarefa.

O processo e as decisões do guia são a versão atual do produto. Eles prevalecem sobre documentação antiga conflitante de produto e experiência. A experiência é nacional; Manaus e outras cidades nas imagens são exemplos, não fronteira de acesso. A navegação principal é **Início, Explorar, Comunidades e Perfil**, com Guia e Mercado como entradas explícitas em Explorar.

Não infira regra de negócio, persistência, permissão ou sucesso de uma imagem. Preserve segurança, privacidade, acessibilidade, autorização do servidor e integridade dos dados.

## Preparação de cada tarefa

1. Confirme que recebeu a imagem e descreva campos, ações, público e estados que ela mostra.
2. Escolha uma única mudança observável. Inclua entrada, ação, feedback, próximo passo e a principal falha/recuperação.
3. Leia o estado real de runtime e os contratos necessários. Documentação não prova entrega.
4. Declare os componentes que reutilizará e os critérios de conclusão.

Não construa Auth, onboarding ou outro módulo inteiro em uma chamada. Não reproduza o PNG como uma imagem ou coordenadas absolutas; crie componentes responsivos próprios para web e mobile.

## Regras atuais que não podem regredir

- CPF é o caminho principal e praticamente imediato; identidade com reconhecimento por IA é a alternativa quando o CPF não concluir, com acompanhamento e reenvio de arquivo ilegível.
- “Sou militar das Forças Armadas” é o rótulo de vínculo. Força Armada e OM são autodeclaradas, opcionais e têm controles individuais “Exibir no perfil” desligados inicialmente.
- Pedido para entrar em comunidade inclui motivo opcional. Perguntas podem ter público “Toda a cidade” ou comunidades autorizadas; respostas herdam o público.
- Eventos permitem “Pedir mais informações” antes e depois da confirmação de presença.
- Não crie selo público de verificação, posto, patente, endereço residencial, contato automático, SLA inventado, pagamento, avaliação por estrelas ou promessa que não exista no contrato.

## Stack e qualidade

- Web: Next.js App Router, React, TypeScript, HeroUI v3 e Tailwind. Não introduza outra biblioteca de componentes.
- Mobile: React Native, Expo e Expo Router; compartilhe contratos, domínio e tokens, não UI web.
- Backend: Supabase. Segredos e operações privilegiadas ficam no servidor. Não duplique autorização nas telas.
- Aplique os tokens e wrappers existentes. Interfaces usam superfícies claras, verde profundo, conteúdo humano e layouts próprios para cada plataforma.
- Siga Biome: aspas duplas, sem ponto e vírgula, 2 espaços. Não edite migração aplicada.

## Ciclo obrigatório

Planeje → implemente → verifique → execute → capture → julgue → corrija.

Rode as verificações proporcionais à mudança. Para edição rápida, use `npx pnpm@11.18.0 gate --fast`; para fechamento de código, use `npx pnpm@11.18.0 gate`. Para tela web, use `node scripts/visual/loop.mjs` e compare os viewports 375, 768 e 1440. Para mobile, execute e inspecione a interface nativa quando o ambiente permitir; uma captura web estreita não comprova mobile.

Não declare que uma tela está pronta apenas porque renderizou. Verifique ação principal, falha, negação de acesso quando aplicável, teclado, toque, rolagem, foco, contraste, estado vazio e recuperação. Não altere um teste só para deixá-lo verde sem adaptar também o contrato substituído.

## Entrega

Ao concluir a tarefa, informe: comportamento entregue; arquivos alterados; testes/comandos e resultados; pranchas inspecionadas; evidência visual; limitações; e o resumo de continuidade para o próximo modelo. Se uma verificação não executou, diga isso. Implementador, revisor e verificador de runtime são papéis separados; não atribua aprovação independente a si mesmo.
