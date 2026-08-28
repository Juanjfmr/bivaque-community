# Bivaque — Flow Map

Este arquivo usa os IDs estáveis de `PAGE_REGISTRY.yaml`. As setas abaixo representam navegação observada no código ou transições de sistema explicitamente identificadas.

## 1. Aquisição, acesso e entrada

```mermaid
flowchart LR
  PUB01["PUB-01<br/>Landing"] -->|Entrar| AUTH01["AUTH-01<br/>Login"]
  PUB01 -->|Quero fazer parte| AUTH02["AUTH-02<br/>Cadastro"]

  AUTH04["AUTH-04<br/>Consentimento"] -->|sem verificação| ONB01["ONB-01<br/>Elegibilidade"]
  AUTH04 -->|pending/rejected/error| ONB02["ONB-02<br/>Status"]
  AUTH04 -->|verified sem membership| ONB03["ONB-03<br/>Localidade"]

  ONB03 -->|provision concluído| ONB04["ONB-04<br/>Boas-vindas"]
  ONB04 --> COM01["COM-01<br/>Comunidade"]
  ONB04 --> LOC01["LOC-01<br/>Cidade"]
  ONB04 --> GRP01["GRP-01<br/>Grupos"]
  ONB04 --> ME01["ME-01<br/>Perfil"]
```

O middleware também intercepta rotas protegidas para consentimento/login conforme estado de sessão, e roteia contas de prestador para `PRO-01`.

## 2. Shell do membro

Todas as páginas sob o shell do membro herdam estas saídas globais:

```mermaid
flowchart LR
  ANY["qualquer página<br/>member_shell"] --> LOC01["LOC-01<br/>Cidade"]
  ANY --> COM01["COM-01<br/>Comunidade"]
  ANY --> GRP01["GRP-01<br/>Grupos"]
  ANY --> ME01["ME-01<br/>Perfil"]
  ANY --> REC01["REC-01<br/>Indicações"]
```

`NOT-01` não entra neste conjunto porque o controle de Notificações no shell atual é um botão sem navegação.

## 3. Cidade

```mermaid
flowchart LR
  LOC01["LOC-01<br/>Cidade"] --> EVT01["EVT-01<br/>Eventos"]
  LOC01 --> EVT02["EVT-02<br/>Evento"]
  LOC01 --> LOC02["LOC-02<br/>Guia"]
  LOC01 --> PRV01["PRV-01<br/>Prestador"]
  LOC01 --> COM02["COM-02<br/>Comunidades"]
  PRV01 -->|Conversar| MSG01["MSG-01<br/>Mensagens"]
```

## 4. Comunidades

```mermaid
flowchart LR
  COM02["COM-02<br/>Comunidades"] --> COM03["COM-03<br/>Comunidade"]
  COM03 --> COM04["COM-04<br/>Convidar membros"]
  COM03 -->|moderador| OWN02["OWN-02<br/>Pedidos de entrada"]

  OWN01["OWN-01<br/>Console"] --> OWN02
  OWN01 --> OWN03["OWN-03<br/>Moderadores"]

  COM05["COM-05<br/>Indicar prestador"]
  OWN04["OWN-04<br/>Prestadores da comunidade"]
```

`COM-05` e `OWN-04` aparecem isolados propositalmente: são candidatos a órfão na análise estática atual, não defeitos de runtime declarados.

## 5. Portais especializados

### Prestador

```mermaid
flowchart LR
  PRO01["PRO-01<br/>Painel"] <--> PRO02["PRO-02<br/>Ficha"]
  PRO01 <--> PRO03["PRO-03<br/>Catálogo"]
  PRO02 <--> PRO03
```

O layout do prestador expõe os três destinos em todas as páginas do portal.

### Operador

```mermaid
flowchart LR
  ADM01["ADM-01<br/>Admissões"] <--> ADM02["ADM-02<br/>Chegadas"]
  ADM01 <--> ADM03["ADM-03<br/>Fila do guia"]
  ADM01 <--> ADM04["ADM-04<br/>Denúncias"]
  ADM02 <--> ADM03
  ADM02 <--> ADM04
  ADM03 <--> ADM04
```

O layout do operador expõe os quatro destinos em todas as páginas administrativas.

## 6. Entradas externas/sistêmicas

Estas páginas não devem ser marcadas órfãs apenas por não terem inbound link convencional:

- `AUTH-03` — erro de callback;
- `INV-01` — convite de prestador por token;
- `INV-02` — convite de membro por token.

## Critério de “caminho sem saída”

Uma página só é considerada dead-end quando, no estado analisado, o usuário não possui saída funcional apropriada. Páginas dentro de um shell normalmente herdam saídas globais; portanto uma página pode ser **órfã de entrada** sem ser **dead-end de saída**.
