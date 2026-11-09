# Laboratório Bivaque × MiroFish (experimento interno)

**Status:** conector inicial isolado, **não publicado**. Simulações reais ainda dependem de um MiroFish local, LLM e Zep Cloud configurados pelo operador. Não é uma funcionalidade do lançamento, não altera o Supabase nem as telas dos associados.

## Objetivo

Comparar três hipóteses de entrada em Manaus com dados inteiramente fictícios: **A Busca primeiro**, **B Resolver primeiro** e **C Comunidades primeiro**. Os agentes simulados não são usuários reais; suas atividades não entram no Bivaque, não produzem métricas de mercado e não fazem recomendações comerciais reais.

## Instalação local (Docker Desktop + Node 22+)

O MiroFish roda no computador do operador. O serviço utiliza LLM e Zep Cloud externos, portanto "local" **não** significa operação offline nem privacidade integral.

1. Instale Git, Docker Desktop e Node.js 22+ (em Windows, habilite WSL2 no Docker Desktop). Em um diretório de trabalho, clone os projetos:

```sh
git clone https://github.com/666ghj/MiroFish.git
git clone https://github.com/Juanjfmr/bivaque-community.git
```

2. Entre em `MiroFish`, copie `.env.example` para `.env` (PowerShell: `Copy-Item .env.example .env`; bash: `cp .env.example .env`) e preencha `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL_NAME` e `ZEP_API_KEY`. Não coloque as credenciais no Git.
3. **Antes de iniciar**, edite `MiroFish/docker-compose.yml` e substitua a seção de portas por:

```yaml
    ports:
      - "127.0.0.1:3000:3000"
      - "127.0.0.1:5001:5001"
```

   As portas padrão `3000:3000` e `5001:5001` do upstream podem expor o serviço à rede local; o laboratório usa apenas loopback.
4. Inicie o motor no diretório `MiroFish`:

```sh
docker compose up -d
docker compose ps
```

   A interface fica em `http://127.0.0.1:3000`; a API deve responder em `http://127.0.0.1:5001/health`.
5. Entre no diretório `bivaque-community`, selecione a branch do experimento e abra o laboratório:

```sh
git fetch origin
git switch feature/mirofish-lab-interno-20261109
cd tools/mirofish-lab
node --test tests/*.test.mjs
node src/cli.mjs doctor
node src/cli.mjs plan
node src/cli.mjs dashboard
```

   `dashboard` grava `runs/painel.html` para abrir localmente. Caso haja alterações de trabalho não salvas no checkout, preserve-as antes de trocar de branch.
6. Apenas depois de verificar o ambiente e aceitar o custo de chamadas externas, inicie o cenário A:

```sh
node src/cli.mjs start A --execute --confirm-synthetic
node src/cli.mjs status A
node src/cli.mjs advance A --execute --confirm-synthetic
```

   Repita `advance A` manualmente, verificando as etapas; não o automatize às cegas. Não execute três cenários simultaneamente.

## Operação detalhada (Node 22+)

1. Instale e execute o MiroFish upstream em sua máquina, seguindo https://github.com/666ghj/MiroFish. Configure **no ambiente desse serviço**, e nunca no repositório, `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL_NAME` e `ZEP_API_KEY`. O serviço original utiliza LLM + Zep Cloud, ambos potencialmente pagos.
2. **Não exponha o backend Flask à internet**: upstream não fornece o contrato de autenticação administrativa do Bivaque e permite CORS amplo. Deixe-o restrito a `127.0.0.1` / firewall. Este adaptador aceita somente loopback.
3. Na raiz deste diretório:

```sh
node --test tests/*.test.mjs
node src/cli.mjs plan
node src/cli.mjs dashboard  # gera runs/painel.html, para abrir localmente
node src/cli.mjs doctor
node src/cli.mjs start A --execute --confirm-synthetic
node src/cli.mjs status A
node src/cli.mjs advance A --execute --confirm-synthetic
```

4. Repita `advance A` **manualmente** enquanto a etapa remota estiver processando; cada avanço bem-sucedido inicia no máximo a próxima etapa. Quando `phase` for `completed`, o relatório original ficará em `runs/A-relatorio.md` com hash no estado. Repita para B e C em projetos distintos. **Não execute duas simulações em paralelo** antes de medir consumo e instabilidade do upstream.
5. Se necessário: `MIROFISH_URL=http://127.0.0.1:5001 node src/cli.mjs doctor`. Apenas localhost, 127.0.0.1 ou ::1 são aceitos.

As operações que geram ontologia, grafos, agentes, simulações e relatórios podem cobrar serviços externos. Não existem chaves nem custo estimado no projeto. O teto de execução é de **seis rodadas** por cenário, com atualização de memória do grafo durante a execução **desligada**; isso **não é** um limite monetário absoluto. A preparação de agentes e a geração de relatórios podem consumir tokens fora desse teto.

## Arquitetura e limites

`tools/mirofish-lab` (somente execução manual por operador em máquina local) → API local MiroFish (Flask) → OASIS + provedor LLM + Zep Cloud.

- Não importar tabelas do Supabase, dados de autenticação, CPF, OM, posto/graduação, telefone, endereços residenciais, conversas ou informações familiares.
- Não inserir posts, contas, recomendações ou resultados no Bivaque real.
- Estado e relatórios são arquivos locais ignorados pelo Git em `runs/`; o operador deve descartá-los conforme sua política de retenção. Não enviar os relatórios ao repositório.
- Em caso de queda após uma escrita remota e antes de salvar o estado, **não repetir cegamente o comando**: conferir a operação no MiroFish local. A API upstream não fornece idempotência transacional geral.
- Não existe botão administrativo em produção nem API externa pública. Para evoluir para um painel autenticado no `apps/web`, será necessária uma decisão separada de acesso, fila, armazenamento, auditoria, orçamento e privacidade.
- Fonte upstream sob **AGPL-3.0**. O adaptador não copia código do upstream; implantação ou modificação do servidor MiroFish precisa de análise de obrigações de disponibilização do código-fonte.
- Dependências externas podem transferir conteúdo à nuvem. Somente a semente sintética versionada é autorizada nesta fase; dados reais dependem do bloqueio jurídico `BLOCK-LEGAL-AI`.

## Prova e interpretação

`node --test tests/*.test.mjs` usa respostas simuladas da API, verificando as etapas, a geração de relatório e os bloqueios locais. **Isso não é uma simulação executada**. O valor do experimento é levantar comportamentos possíveis, eventos e falhas; não transformar contagens do OASIS em taxas de adoção, retenção ou conversão de militares reais. Uma escolha de produto precisa ser confrontada com pesquisa ou dados observados.
