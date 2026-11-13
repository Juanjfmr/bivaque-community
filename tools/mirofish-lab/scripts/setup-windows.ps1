# Instalação e operação LOCAL do MiroFish para o laboratório interno do Bivaque.
# Windows PowerShell 5.1 ou PowerShell 7; não instala programas nem solicita segredos.
[CmdletBinding()]
param(
    [ValidateSet('Preparar', 'Iniciar', 'Diagnosticar', 'Testar', 'Painel', 'Status', 'Rodar', 'Avancar', 'Parar')]
    [string]$Acao = 'Preparar',
    [ValidateSet('A', 'B', 'C')]
    [string]$Cenario = 'A',
    [switch]$ConfirmarCusto,
    [string]$MiroFishPath = ''
)

$ErrorActionPreference = 'Stop'
$script:LabDir = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$parentDir = Split-Path $script:LabDir -Parent
# O script funciona tanto dentro de tools/mirofish-lab no Git quanto num ZIP extraído sozinho.
if ((Split-Path $parentDir -Leaf) -eq 'tools') {
    $workspaceDir = Split-Path (Split-Path $parentDir -Parent) -Parent
} else {
    $workspaceDir = $parentDir
}
if ([string]::IsNullOrWhiteSpace($MiroFishPath)) {
    $MiroFishPath = Join-Path $workspaceDir 'MiroFish'
}
$script:MiroFishPath = [System.IO.Path]::GetFullPath($MiroFishPath)
$script:ComposePath = Join-Path $script:MiroFishPath 'compose.bivaque.local.yml'
$script:EnvPath = Join-Path $script:MiroFishPath '.env'

function Require-Command([string]$Name) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Comando '$Name' indisponível. Instale-o e abra um novo PowerShell."
    }
}
function Assert-ExitCode([string]$Operation) {
    if ($LASTEXITCODE -ne 0) { throw "$Operation falhou (código $LASTEXITCODE)." }
}
function Assert-Node22 {
    Require-Command 'node'
    $version = (& node --version).Trim()
    Assert-ExitCode 'Consulta da versão do Node'
    if ($version -notmatch '^v(\d+)\.') { throw "Versão do Node não reconhecida: $version" }
    if ([int]$Matches[1] -lt 22) { throw 'É necessário Node.js 22 ou superior.' }
}
function Assert-MiroFishRepo {
    if (-not (Test-Path -LiteralPath (Join-Path $script:MiroFishPath '.git'))) {
        throw "Repositório MiroFish não encontrado em $script:MiroFishPath. Execute -Acao Preparar."
    }
}
function Get-ComposeText {
    return @'
services:
  mirofish:
    image: ghcr.io/666ghj/mirofish:latest
    container_name: bivaque-mirofish-local
    env_file:
      - .env
    ports:
      - "127.0.0.1:3000:3000"
      - "127.0.0.1:5001:5001"
    restart: "no"
    volumes:
      - ./backend/uploads:/app/backend/uploads
'@
}
function Assert-ComposeSafe {
    if (-not (Test-Path -LiteralPath $script:ComposePath)) {
        throw 'Compose seguro não encontrado. Execute -Acao Preparar.'
    }
    $actual = (Get-Content -LiteralPath $script:ComposePath -Raw).Trim()
    if ($actual -cne (Get-ComposeText).Trim()) {
        throw 'O compose.bivaque.local.yml foi alterado. Revise-o antes de executar para evitar exposição das portas.'
    }
}
function Assert-KeysConfigured {
    if (-not (Test-Path -LiteralPath $script:EnvPath)) {
        throw 'Arquivo .env ausente. Execute -Acao Preparar.'
    }
    $content = Get-Content -LiteralPath $script:EnvPath -Raw
    foreach ($key in @('LLM_API_KEY', 'LLM_BASE_URL', 'LLM_MODEL_NAME', 'ZEP_API_KEY')) {
        $pattern = '(?m)^\s*' + [regex]::Escape($key) + '\s*=\s*(?!your_|YOUR_|<|$)\S+'
        if ($content -notmatch $pattern) {
            throw "Configure $key no .env do MiroFish; nunca cole a chave no terminal ou neste chat."
        }
    }
}
function Assert-DockerReady {
    Require-Command 'docker'
    & docker info --format '{{.ServerVersion}}' *> $null
    if ($LASTEXITCODE -ne 0) {
        throw 'Docker Desktop indisponível. Abra o Docker Desktop e confirme que está usando Linux Containers / WSL 2.'
    }
    & docker compose version *> $null
    Assert-ExitCode 'Docker Compose'
}
function Invoke-Lab([string[]]$Arguments) {
    Assert-Node22
    Push-Location $script:LabDir
    try {
        & node 'src/cli.mjs' @Arguments
        Assert-ExitCode ('Laboratório: ' + ($Arguments -join ' '))
    } finally { Pop-Location }
}
function Invoke-Compose([string[]]$Arguments) {
    Assert-DockerReady
    Assert-MiroFishRepo
    Assert-ComposeSafe
    Push-Location $script:MiroFishPath
    try {
        & docker compose -p 'bivaque-mirofish-lab' -f 'compose.bivaque.local.yml' @Arguments
        Assert-ExitCode ('Docker Compose: ' + ($Arguments -join ' '))
    } finally { Pop-Location }
}

switch ($Acao) {
    'Preparar' {
        Require-Command 'git'
        Assert-Node22
        if (-not (Test-Path -LiteralPath $script:MiroFishPath)) {
            Write-Host 'Clonando MiroFish em diretório separado do Bivaque...'
            & git clone 'https://github.com/666ghj/MiroFish.git' $script:MiroFishPath
            Assert-ExitCode 'Clone do MiroFish'
        } else {
            Write-Host 'Diretório MiroFish já existe; não será sobrescrito ou atualizado.'
        }
        Assert-MiroFishRepo
        if (-not (Test-Path -LiteralPath $script:EnvPath)) {
            Copy-Item -LiteralPath (Join-Path $script:MiroFishPath '.env.example') -Destination $script:EnvPath
            Write-Host 'Arquivo .env criado: edite as credenciais localmente.'
        } else { Write-Host 'Arquivo .env preservado (sem alterações).' }
        if (-not (Test-Path -LiteralPath $script:ComposePath)) {
            # UTF-8 sem BOM; o compose padrão do upstream não é alterado.
            [System.IO.File]::WriteAllText($script:ComposePath, (Get-ComposeText) + "`n", (New-Object System.Text.UTF8Encoding($false)))
        }
        Assert-ComposeSafe
        Write-Host "MiroFish preparado em: $script:MiroFishPath"
        Write-Host "Configure as chaves em: $script:EnvPath"
        Write-Host 'Depois, execute: .\scripts\setup-windows.ps1 -Acao Iniciar'
    }
    'Iniciar' {
        Assert-MiroFishRepo
        Assert-ComposeSafe
        Assert-KeysConfigured
        Invoke-Compose -Arguments @('config', '-q')
        Invoke-Compose -Arguments @('up', '-d')
        $ready = $false
        for ($attempt = 1; $attempt -le 12; $attempt++) {
            try {
                $health = Invoke-RestMethod -Uri 'http://127.0.0.1:5001/health' -Method Get -TimeoutSec 5
                if ($health.status -eq 'ok' -and $health.service -eq 'MiroFish Backend') {
                    $ready = $true
                    break
                }
            } catch { Start-Sleep -Seconds 2 }
        }
        if (-not $ready) { throw 'MiroFish iniciou, mas a API ainda não respondeu. Verifique: docker logs bivaque-mirofish-local' }
        Write-Host 'MiroFish acessível apenas nesta máquina: http://127.0.0.1:3000'
        Invoke-Lab -Arguments @('doctor')
    }
    'Diagnosticar' { Invoke-Lab -Arguments @('doctor') }
    'Testar' {
        Assert-Node22
        Push-Location $script:LabDir
        try {
            & node --test 'tests/lab.test.mjs'
            Assert-ExitCode 'Testes locais'
        } finally { Pop-Location }
    }
    'Painel' {
        Invoke-Lab -Arguments @('dashboard')
        $file = Join-Path $script:LabDir 'runs\painel.html'
        Write-Host "Abrindo painel local: $file"
        Start-Process -FilePath $file
    }
    'Status' { Invoke-Lab -Arguments @('status', $Cenario) }
    'Rodar' {
        if (-not $ConfirmarCusto) { throw 'Pode haver cobranças de LLM/Zep. Execute novamente com -ConfirmarCusto.' }
        Assert-KeysConfigured
        Invoke-Lab -Arguments @('start', $Cenario, '--execute', '--confirm-synthetic')
    }
    'Avancar' {
        if (-not $ConfirmarCusto) { throw 'Pode haver cobranças de LLM/Zep. Execute novamente com -ConfirmarCusto.' }
        Assert-KeysConfigured
        Invoke-Lab -Arguments @('advance', $Cenario, '--execute', '--confirm-synthetic')
    }
    'Parar' { Invoke-Compose -Arguments @('down') }
}
