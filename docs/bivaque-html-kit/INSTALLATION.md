# Instalação no Bivaque — 13/10/2026

Pedido do responsável: instalar os agentes e começar a implementação. Após esclarecer
a diferença de escopo, o responsável escolheu **“Protótipo HTML do ZIP, em área separada”**.
Esse pedido autoriza a frente demonstrativa abaixo; não redefine a aplicação funcional
Next.js nem remove seus contratos de segurança e publicação.

Foram instalados 34 arquivos novos, sem sobrescrever arquivos existentes: 18 perfis
em `.codex/agents/`, documentação em `docs/bivaque-html-kit/`, referência em
`prototypes/bivaque-html/reference/` e verificadores em `scripts/bivaque-html/`.
Os hashes e tamanhos do manifesto do ZIP foram conferidos antes da cópia. Os 18 TOML
possuem `name`, `description` e `developer_instructions`, com nomes únicos.

O formato foi conferido na [documentação oficial de subagentes](https://learn.chatgpt.com/docs/agent-configuration/subagents).
A instalação de arquivos não comprova reconhecimento automático por todo cliente;
nessa sessão, os especialistas receberam as instruções correspondentes por delegação.
O snippet opcional de configuração permanece como documentação: nenhuma configuração
global ou `.codex/config.toml` foi substituída, nem foram fixados modelos.

Contrato e card: `docs/agents/tasks/HTML-000.task.yml` / `HTML-000-PROTOTIPO`.
Instruções de build e abertura: [README do protótipo](../../prototypes/bivaque-html/README.md).
Estado e evidência da rodada: [ROUND_00](../../prototypes/bivaque-html/docs/ROUND_00.md).

As alterações preexistentes da árvore compartilhada foram preservadas. A frente HTML
não alterou `apps/web`, `apps/mobile`, `supabase`, o lockfile ou as instruções da raiz.
