# Laboratório Bivaque × MiroFish (experimento interno)

**Status:** conector inicial isolado, **não publicado**. Simulações reais ainda dependem de um MiroFish local, LLM e Zep Cloud configurados pelo operador. Não é uma funcionalidade do lançamento, não altera o Supabase nem as telas dos associados.

## Objetivo

Comparar três hipóteses de entrada em Manaus com dados inteiramente fictícios: **A Busca primeiro**, **B Resolver primeiro** e **C Comunidades primeiro**. Os agentes simulados não são usuários reais; suas atividades não entram no Bivaque, não produzem métricas de mercado e não fazem recomendações comerciais reais.

## Instalação e operação (Node 22+)

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
5. Se necessário: `MIROFISH_URL=http://127.0.0.1:5000 node src/cli.mjs doctor`. Apenas localhost, 127.0.0.1 ou ::1 são aceitos.

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
