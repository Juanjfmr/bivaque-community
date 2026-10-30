# F01 — direção de arte comum (entrada e onboarding)

Base de conteúdo: a prévia publicada da entrada (`apps/app`, branch `codex/ui-foundation-21st-20261026`,
`66f8c13e`; Pages `entrada-21st-20261027`, `3d860f26`). Cada imagem parte da captura real da tela
correspondente: mesmos campos, mesma ordem, mesmas ações e mesmos textos. A imagem melhora a
apresentação; não acrescenta campos, etapas, módulos ou regras.

Fora da imagem (andaime da demonstração): "Jornada demonstrativa…", "Demonstração: …", "Rascunho
local…", "Nenhuma informação será publicada nesta demonstração" e botões "Simular …". Os estados
que esses botões simulam têm imagem própria.

## Marca (brandbook oficial + ajustes aprovados em 20/10)

- Papel `#F2F0EB` como fundo; superfícies em branco quente `#FBFAF7` com borda `#E4E1D9`.
- Grafite `#253033` para texto, botão principal, links e seleção (checkbox, rádio, chip).
- Brasa `#B84A3A` só onde a marca pede: a abertura do Glifo e, no máximo, um realce pontual
  (a cidade). Nunca em botão, link ou erro.
- Erro em vermelho de sistema discreto, só no texto e na borda do campo.
- Névoa `#78979B` para informação calma (dicas, passos futuros).
- Títulos em Noto Serif (peso semibold); demais textos em Noto Sans.
- Logo: assinatura horizontal oficial (`logo-oficial.png`), Glifo grafite com abertura Brasa,
  wordmark "BIVAQUE". Sem redesenhar, distorcer ou recolorir.
- Cantos de 12 px nos campos, cartões e botões. Ícones de traço (outlined), finos.
- Sem fardas, patentes, insígnias, armas, camuflagem, barracas ou trilhas. Pessoas e famílias em
  situações cotidianas: chegada, casa, vizinhança e convivência.

## Duas composições, sempre as mesmas

**A · Acesso** (login, criar conta, recuperar senha, convite de família, convite indisponível,
retomar, conta apagada): anatomia do bloco Split Sign In Form, com os lados invertidos. À esquerda
(cerca de 48%), a fotografia num painel recuado 16 px das bordas e com cantos de 24 px; na base da
foto, sobre degradê escuro, a frase em Noto Serif branca. À direita, sobre o Papel, o logo no topo
e o formulário numa coluna de 400 px centrada verticalmente, sem cartão flutuante. "Esqueci minha
senha" fica na linha do rótulo "Senha", alinhado à direita. O link de troca ("Já tem conta?
Entrar" / "Ainda não tem conta? Criar conta") fica no rodapé do formulário.

**B · Etapa** (aceite, vínculo, resultado, análise, cidade, grupos, negócio, boas-vindas): fundo
Papel, barra superior fina com o logo à esquerda e "Sair" (texto) à direita. Abaixo, indicador de
progresso com cinco passos nomeados — Conta, Vínculo, Cidade, Grupos, Negócio — com o passo atual
em Grafite, os concluídos com check e os futuros em Névoa; "Negócio" leva o rótulo "opcional".
Conteúdo numa coluna central de 560 px: título em Noto Serif, uma frase de apoio, campos e, no fim,
ações alinhadas (principal em Grafite preenchido, secundária em contorno ou texto). Sem fotografia,
exceto miniaturas nos grupos e a imagem das boas-vindas.

## Regras de consistência (revisão de 30/10)

- **Alinhamento.** Em A, logo, título, apoio e formulário alinhados à esquerda da coluna, inclusive
  em telas de resultado (convite indisponível, conta apagada). Em B, título e frase de apoio
  centralizados; campos, opções e linha do tempo alinhados à esquerda na coluna de 560 px.
- **Ações.** Formulários de acesso: botão principal na largura da coluna. Etapas: ações na largura
  da coluna, principal em cima e secundária embaixo; no formulário de negócio, "Voltar" (contorno) e
  "Continuar" (principal) lado a lado, cada um com metade da coluna.
- **Progresso do negócio.** O indicador geral fica em "Negócio". Abaixo do título "Apresente seu
  negócio.", centralizado: "Passo X de 5" em Névoa e uma barra de cinco segmentos (concluídos e
  atual em Grafite, futuros em `#E4E1D9`). Igual nas cinco etapas.
- **Indicador geral.** Concluído: círculo Grafite com check. Atual: círculo Grafite com número.
  Futuro: círculo vazado com contorno e número em Névoa. Nunca preenchido em cinza.
- **Fotografia.** Luz de dia, quente, pessoas comuns em casa, vizinhança e convivência. Sem cena
  noturna e sem multidão de festa.
- **Logo.** Mesma altura em todas as telas: 40 px em A, 28 px na barra de B.

## Valor e atrito no primeiro contato (aprovado pelo dono em 30/10)

- **Valor antes dos dados.** O painel da foto de "Criar conta" diz para quem é ("Militares federais,
  veteranos, pensionistas e famílias") e o que a pessoa encontra: guia da cidade, comunidades da
  cidade e serviços indicados por quem já mora lá; "Só entra quem tem o vínculo confirmado." Textos
  da landing do protótipo. As demais telas de acesso mantêm só a frase.
- **Google primeiro.** Em login e criar conta, "Continuar com Google" vem antes do formulário, com o
  divisor "ou continue com e-mail".
- **Confiança no CPF.** Faixa com cadeado "Seu CPF é usado só nesta consulta e não fica guardado."
  e "Por que pedimos seu CPF?" já aberto. A frase segue a regra do projeto de nunca guardar CPF.
- **Tempo e causa das esperas.** "Leva cerca de 2 minutos." em criar conta; prazo da análise
  ("Até 2 dias úteis, normalmente no mesmo dia", do protótipo); consulta indisponível explica que
  a fonte oficial está fora do ar.
- **Boas-vindas pelo momento** (ADR de entrada): "Você chegou ao Bivaque." com o plano de chegada,
  o plano de saída ou "Conhecer Manaus", o grupo da turma quando houver e "Entrar na comunidade".
  Uma imagem por momento.

## Blocos do 21st.dev por tela

Pesquisa feita pelo MCP do 21st em 30/10/2026. A licença não veio explícita nas respostas: confirmar
antes de instalar. Base UI (`@base-ui/react`) não é o Radix do app; substituir pelo equivalente Radix.

| Telas | Bloco | Adaptação |
|---|---|---|
| Login, criar conta, retomar, convite, conta apagada | [Split Sign In Form](https://21st.dev/@diarmuradi/components/sign-in-3) | Foto à esquerda com frase; Google e divisor; trocar `next/link`, Base UI e FancyButton pelos componentes do app |
| Recuperar senha e envio confirmado | [Forgot Password Form](https://21st.dev/@cnippet-dev/components/v-form-11) | Resposta neutra; dentro da composição A |
| Indicador de cinco passos | [Basic Stepper](https://21st.dev/@sean0205/components/c-stepper-1) | Rótulos e "opcional"; sem Base UI |
| Momento, área e atendimento | [Radio Group](https://21st.dev/@originui/components/radio-group) | Cartões de linha inteira ou em linha de três |
| Sugestões de grupos | [Card Style Checkbox](https://21st.dev/@cnippet-dev/components/v-checkbox-4) | Miniatura no topo; grade 2×2 |
| Envio de identidade | [File Dropzone](https://21st.dev/@joyco/components/file-dropzone) | Arquivo único; validação também no servidor |
| Análise do vínculo | [Process Timeline](https://21st.dev/@shadcnui-blocks/components/timeline-05) | Estado atual acessível |
| Formulário de negócio e revisão | [Onboarding Wizard Form](https://21st.dev/@cnippet-dev/components/v-form-8) | Cinco passos, chips, horários, fotos com capa; revisão com "Editar" |
| Vínculo confirmado, consulta e convite indisponíveis | [Result](https://21st.dev/@astralyxdev/components/result) | Ícone, título, texto e até duas ações |
| Boas-vindas | [Onboarding / Welcome Screen](https://21st.dev/@ravikatiyar162/components/onboarding-welcome-screen) | Sem framer-motion; respeitar movimento reduzido |
| Código do convite | [OTP Input Field](https://21st.dev/@sean0205/components/c-input-otp-1) | Alfanumérico com colagem; e-mail do convite em Input somente leitura |

## Componentes

- Campo: rótulo acima, caixa branca de 48 px, borda `#D6D2C8`, foco com anel Grafite.
- Botão principal: Grafite preenchido, texto Papel, altura 48 px, largura da coluna nos formulários
  de acesso; desabilitado em Grafite a 35%.
- Botão secundário: contorno Grafite 1 px. Google: contorno com o "G" colorido oficial.
- Checkbox e rádio desenhados (não nativos), seleção em Grafite.
- Opção de escolha (rádios do momento, área e atendimento): cartão de linha inteira com rádio,
  título e, quando houver, descrição curta; selecionado com borda Grafite 2 px.
- Chips de especialidade: contorno; selecionado em Grafite com texto Papel.
- Aviso de status: faixa suave com ícone; sucesso em Névoa clara, nunca em Brasa.

## Formato do arquivo

Uma tela inteira por arquivo, sem moldura de navegador, mockup de dispositivo ou anotação.
Desktop 1440 px em paisagem 3:2 (1536 × 1024). Texto em português do Brasil, legível e exatamente
como no roteiro da tela.
