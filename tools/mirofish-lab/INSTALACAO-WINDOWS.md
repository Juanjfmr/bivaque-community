# Bivaque × MiroFish — instalação local no Windows

O laboratório funciona **somente na sua máquina**, sem integração com usuários, banco de dados ou produção do Bivaque. O motor MiroFish utiliza **serviços externos** (LLM + Zep Cloud), portanto não funciona totalmente offline e pode gerar custos.

## 1. Requisitos no Windows

Windows 10/11 compatível com o Docker Desktop; WSL 2 ativo; virtualização habilitada; Git e Node.js 22+.

Abra o **PowerShell** e verifique:

```powershell
wsl --version
git --version
docker --version
node --version
```

Se os programas ainda não existirem, use **PowerShell como administrador** para o WSL, quando necessário:

```powershell
wsl --install
wsl --update
```

Depois, em um PowerShell normal, instale as ferramentas que faltarem (ou utilize os instaladores oficiais):

```powershell
winget install --id Git.Git --exact
winget install --id Docker.DockerDesktop --exact
winget install --id OpenJS.NodeJS.LTS --exact
```

Reinicie o Windows se for solicitado, abra o **Docker Desktop** e selecione o backend **WSL 2 com contêineres Linux**. Abra um novo PowerShell depois das instalações para atualizar o PATH. O Docker pode exigir aceite de termos e login conforme a instalação.

Documentação oficial: https://docs.docker.com/desktop/setup/install/windows-install/

## 2. Obter o laboratório

**Opção simples:** baixe o pacote ZIP do laboratório fornecido nesta conversa, extraia a pasta `mirofish-lab` para `$HOME\Projetos`, e abra um PowerShell nessa pasta. O script sabe operar independentemente do repositório Bivaque.

**Opção pelo GitHub (PR em revisão):** clone a branch de testes abaixo.

### Clonar a branch de testes do Bivaque

A branch está em revisão e **não é a versão publicada**.

```powershell
New-Item -ItemType Directory -Force "$HOME\Projetos" | Out-Null
Set-Location "$HOME\Projetos"
git clone --branch feature/mirofish-lab-interno-20261109 --single-branch https://github.com/Juanjfmr/bivaque-community.git
Set-Location '.\bivaque-community\tools\mirofish-lab'
```

Se você já tem o repositório Bivaque com alterações não salvas, **não altere seu checkout de trabalho**. O clone acima cria outro diretório; escolha um nome de pasta livre, se necessário.

## 3. Preparar o MiroFish (sem rodar simulações)

Em um PowerShell no diretório `tools\mirofish-lab`:

```powershell
.\scripts\setup-windows.ps1 -Acao Preparar
```

O script:
- Clona o MiroFish em um diretório separado; ao usar o clone do GitHub, fica irmão de `bivaque-community`; usando ZIP avulso, fica ao lado de `mirofish-lab`.
- Cria `.env` a partir do exemplo, preservando qualquer `.env` existente.
- Cria um Compose separado, `compose.bivaque.local.yml`, **sem modificar** o Compose original.
- Mapeia as portas **somente em `127.0.0.1`**, nunca na rede local inteira.
- Não instala programas nem executa simulações nem lê dados reais do Bivaque.

Se o Windows bloquear a execução do script por política local, habilite scripts **apenas nesta sessão** e tente novamente:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
.\scripts\setup-windows.ps1 -Acao Preparar
```

## 4. Configurar as chaves, apenas no computador

Abra o arquivo **`$HOME\Projetos\MiroFish\.env`** no seu editor (substitua o caminho se você usou outro diretório):

```powershell
notepad "$HOME\Projetos\MiroFish\.env"
```

Preencha as quatro variáveis: `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL_NAME` e `ZEP_API_KEY`. O MiroFish aceita serviços LLM compatíveis com a API OpenAI, e o Zep Cloud é uma dependência obrigatória no código atual. **Não cole chaves no chat ou em commits.**

## 5. Iniciar e verificar os serviços

```powershell
.\scripts\setup-windows.ps1 -Acao Iniciar
.\scripts\setup-windows.ps1 -Acao Testar
.\scripts\setup-windows.ps1 -Acao Diagnosticar
.\scripts\setup-windows.ps1 -Acao Painel
```

Endereços (somente neste computador):
- Interface do MiroFish: http://127.0.0.1:3000
- Health check da API: http://127.0.0.1:5001/health
- Painel do laboratório Bivaque: arquivo local `runs\painel.html` gerado por `-Acao Painel`.

## 6. Executar o primeiro experimento — cenário A

**Somente após compreender custos, segurança e o cenário sintético:**

```powershell
.\scripts\setup-windows.ps1 -Acao Rodar -Cenario A -ConfirmarCusto
.\scripts\setup-windows.ps1 -Acao Status -Cenario A
.\scripts\setup-windows.ps1 -Acao Avancar -Cenario A -ConfirmarCusto
```

`Avancar` é repetido **manualmente** após verificar o status, até completar a simulação e gerar o relatório. Os cenários B e C usam os mesmos comandos, com `-Cenario B` ou `-Cenario C` e devem ser executados **um por vez**.

O limite de seis rodadas restringe apenas a parte de simulação: **não é teto de custo**. A geração de grafos, perfis e relatórios também usa APIs potencialmente pagas. Os dados são fictícios; resultados não são previsões validadas sobre usuários reais.

## 7. Parar e diagnosticar

```powershell
.\scripts\setup-windows.ps1 -Acao Parar
# Em caso de falha, execute na pasta MiroFish:
Set-Location "$HOME\Projetos\MiroFish"
docker compose -p bivaque-mirofish-lab -f compose.bivaque.local.yml ps
docker logs --tail 100 bivaque-mirofish-local
```

Não use `docker compose up -d` **sem** a opção `-f compose.bivaque.local.yml` na pasta do MiroFish, pois o Compose upstream mapeia portas de forma mais aberta.

## Limitações

- Não foram executadas simulações reais nem medidos custos reais; essa etapa depende de suas credenciais e da sua máquina.
- Os testes Node usam respostas simuladas de API. A automação PowerShell não pôde ser testada num Windows real neste ambiente.
- O projeto MiroFish está sob **AGPL-3.0**; mantenha a operação isolada até concluir a avaliação das obrigações da licença.
- O código do laboratório continua na branch de PR, não foi mesclado na `main`.
