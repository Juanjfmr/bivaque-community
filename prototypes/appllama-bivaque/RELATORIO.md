# Bivaque · Laboratório R72 com metodologia Appllama

Data: 10/11/2026. Estado: experimento funcional independente. A R72 aprovada está preservada.

## Evidências verificadas

### Código Bivaque

- Referência aprovada: `prototypes/bivaque-bento/reference/Bivaque_Material_Web.R72.aprovado.html`, hash SHA-256 documentado `7e7657c3652ce6daff450d8dfe5d9ce8d8eda8d6189bcd3f2317a2f25fb61d2d`.
- A Home do web em `apps/web/app/(shell)/inicio/page.tsx` já evita feed contínuo e combina atalhos e blocos ordenados por novidades. Essa decisão está **mantida**.
- `apps/web/app/(shell)/inicio/hub-shortcuts.tsx` usa seis verticais dispostas em grade de 3 ícones no mobile.
- `apps/prototipo/components/bivaque/tela-inicio.tsx` reproduz uma Home reduzida: busca, quatro atalhos, duas perguntas; três dos quatro atalhos estão desativados e o restante da Home não integra o protótipo.
- `apps/prototipo/components/bivaque/barra-de-navegacao.tsx` contém os quatro destinos mais o Criar elevado.
- `apps/prototipo/components/bivaque/barra-do-topo.tsx` encaminha retorno de telas internas à Comunidade em vez de usar sempre o histórico do fluxo.
- `apps/prototipo/components/bivaque/tela-comunidade.tsx` apresenta a aba Grupos como `Em breve`.
- `apps/mobile/app/(tabs)/cidade.tsx` ainda é placeholder de fundação; `apps/mobile/app/(tabs)/_layout.tsx` usa letras como ícones temporários de abas.
- Tokens consultados: `apps/web/app/brand-tokens.css` / materiais R72: superfícies quentes, grafite, verde-acinzentado e acento brasa.

### Referências de produto reais no Mobbin

Foram localizadas 24 telas iOS de Airbnb, Nextdoor, Yelp, Taskrabbit, Reddit e Eventbrite no Mobbin, com links duráveis. A pesquisa **não** foi feita via Appllama MCP autenticado e as gravações de interações não estavam acessíveis. Por isso não se declara equivalência visual/gestual 1:1 nem inferência de gestos específicos não verificados.

- Airbnb — descoberta/search: https://mobbin.com/screens/69ae862c-b11e-4c9c-94ce-d645ca8ccc0a
- Airbnb — alternativa: https://mobbin.com/screens/37e9c92b-4803-43ea-b103-668b44c59560
- Nextdoor — discussão local: https://mobbin.com/screens/9fa1c528-5530-4f11-bc24-0244ea7279fe
- Nextdoor — alternativa: https://mobbin.com/screens/6d9b9a65-a2bd-4f67-b0e4-4e7ba3f0068a
- Yelp — resultados locais: https://mobbin.com/screens/970d42e0-605e-463f-bfeb-0ab018fb5172
- Yelp — alternativa: https://mobbin.com/screens/90accf0e-9fa0-4b90-bdc1-5ad2cf9d57da
- Taskrabbit — perfil de prestador: https://mobbin.com/screens/9af95cfd-ffa3-4443-98fa-fdb801f06fb9
- Taskrabbit — alternativa: https://mobbin.com/screens/26946095-b5b3-4277-aeff-fa94d180de1b
- Reddit — conversa/respostas: https://mobbin.com/screens/b1a250b5-c601-4827-bfb0-7695a7b967c3
- Eventbrite — descoberta de encontros: https://mobbin.com/screens/cd46ce4f-bca2-4dee-8265-aa91778e2281

Metodologia oficial: https://github.com/Appllama/appllama-skills/tree/main/skills/appllama-app-design-skill ; pesquisa: https://github.com/Appllama/appllama-skills/tree/main/skills/appllama-usage .

## Comparativo anterior → experimento

| Jornada | Antes na base examinada | Laboratório funcional | Trade-off / hipótese |
|---|---|---|---|
| Entrada | Grade de verticais + seções na Home web; quatro atalhos no protótipo | Título contextual, busca principal, quatro destinos horizontais e dois módulos densos | Ação principal mais visível; precisa validar se a descoberta por categoria perde espaço |
| Busca | Caixa de entrada e vertical separada | Busca contextual por termo, chips e resultados mistos (serviços + perguntas) | Menos alternância de telas; relevância real dependerá de backend / ranking |
| Confiança | Catálogo e indicações em telas próprias | Indicação anexada à própria linha de resultado, com o relato do membro e sem estrelas fictícias | Melhora transparência; requer políticas de consentimento e privacidade |
| Serviço → contato | Diversas entradas para prestadores / indicações | Resultado → detalhe → modal de contato com confirmação e conversa local simulada | Fluxo curto; a integração de mensagens depende do Supabase |
| Pergunta à cidade | Lista e compositor próprios | Item de discussão legível, com resposta em profundidade; criação via bottom sheet curta | Reduz fricção; publicação em grupo deve ter compositor/contexto próprio |
| Voltar | Alguns retornos de protótipo fixados em Comunidade | Navegação com pilha no protótipo de demonstração | Retorno mais previsível; no Expo exige `router.push`, tabs independentes e Android Back |
| Eventos | Seção e carrossel em Home + agenda | Agenda de datas em linhas e detalhe com interesse simulado | Mais densidade e contexto temporal; precisa dados reais |
| Mobile nativo | Expo ainda contém placeholders | Especificação de padrões para Expo, mas demo é HTML | Não confundir o ensaio visual com implementação native-ready |

## O que realmente foi implementado

Arquivo único `Bivaque_Appllama_Laboratorio_R72.html`, sem dependências ou backend. Pode ser aberto em navegador Android/desktop. Contém:

1. Home contextual sem feed contínuo.
2. Busca com filtros e correspondência de texto, sem ranking de produção.
3. Resultados mistos, detalhe de indicação, salvar, compartilhar e contato demonstrativo.
4. Comunidade com perguntas, detalhes, criação e respostas locais à sessão.
5. Grupos, simulação de participação, encontros e interesse local.
6. Conversas criadas pela simulação de contato e área de salvos.
7. Suporte a redução de movimento, modo claro/escuro, teclado, contraste básico e larguras responsivas.

**Limitações importantes:** dados fictícios; sem Supabase; sem login/verificação real; sem API, notificação ou contato externo; sem deep links nativos; sem Mapas; sem app compilado; sem gravação de vídeo da experiência iOS/Android. Não é a R72 em produção. O HTML não deve ser tratado como implementação final.

## QA efetuado

Playwright Chromium, com `page.set_content` por restrição de navegação local no ambiente. Testados 320, 360, 375, 430, 768 e 1440 px. Em cada largura: Home, busca `eletricista`, abertura do resultado, detalhe, modal, conversa simulada, criação de pergunta, abertura do tópico, envio de resposta. Sem erros JavaScript nas seis execuções e sem overflow horizontal de `body`.

Foram geradas capturas em 375 px da Home, busca, indicação e comunidade e em 1440 px do laboratório.

## Pendências para aplicar de forma real

- Conectar o Appllama MCP ao agente em ambiente com conta autorizada, comparar telas e vídeos relevantes de forma verificável (não apenas links).
- Migrar a composição aprovada por jornada a uma branch React/Expo, com `react-native-safe-area-context`, Expo Router, listas virtualizadas, sistema de ícones consistente, gestos nativos, busca integrada ao backend e estados de erro.
- Testar Android com teclado, gesto de voltar, bottom sheets, safe area, modo escuro, acessibilidade e gravação end-to-end; iOS depois em simulador disponível.
- Rodar teste com usuários representativos para comparar tempo e taxa de sucesso de três tarefas: encontrar prestador recomendado; obter resposta à pergunta; descobrir encontro local.

Não modificar a R72 original sem decisão explícita. O laboratório existe para propor alternativas concretas e comparáveis.