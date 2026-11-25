# Bivaque Native Lab V2 — experimento isolado

Projeto Expo / React Native / React Native Web. A R72 é referência de **contratos de produto**, não template de layout. Não requer Supabase, contas ou credenciais e não altera o frontend atual.

## Executar
```bash
npm install
npx expo install --fix
npm run check
npx expo start --tunnel
```
Para navegador: `npm run web`. Para build web estático: `npm run build`.

## Jornadas demonstradas
1. Início contextual: busca transversal, sugestões, serviços, anúncios, grupos, próximos encontros, guia.
2. Comunidade: filtros por categoria/bairro, pergunta -> detalhe -> resposta -> útil -> salvar -> ocultar -> denunciar -> resolver (se autor).
3. Grupo: abrir, aderir/sair, enviar publicação local, denunciar.
4. Encontro: conferir capacidade, confirmar presença/cancelar.
5. Mercado: serviços, imóveis, desapegos; filtro por bairro, preço total, quartos; ordenação; visualização ilustrativa por bairro (sem mapa geográfico).
6. Imóvel: atributos, taxa, custo total, ilustração multipágina, salvar, comparar 2–3, falar com anunciante.
7. Serviço: perfil, selo explicativo, solicitação de orçamento; proposta **ilustrativa**, conversa.
8. Conversas: threads, respostas, mensagens locais, aviso antifraude.
9. Você: salvos, pedidos, comparador, configurações, conteúdos ocultos, relatórios.
10. Criar: pergunta, imóvel, desapego, grupo ou encontro com validação.
11. Busca: recentes, sugestões, exploração por módulo e resultados transversais.
12. Guia local: explorar bairros, filtrar moradia e entrar nos fluxos de descoberta.

## Bibliotecas / decisão
- Expo 58 e RNW: mesma árvore de componentes para Android e web.
- Expo UI universal: Switch de filtros/ajustes; todos os outros controles têm fallback RN padrão.
- Reanimated 4: press feedback e sheet, entrada animada nos componentes.
- Gesture Handler 3: swipe lateral em perguntas e arrastar a alça das folhas.
- React Native Reusables: referências anatômicas de cartões, campos e acessibilidade, mas não instalado por exigir configuração NativeWind antes de provar ganhos.
- Tamagui: não instalado neste laboratório para não adicionar config/compilador.
- Gluestack v5: não instalado por depender de NativeWind/UniWind e pipeline de estilos.
- beUI Native: documentação atual testada em Expo 57; sem comprovação do SDK 58.
A decisão é deliberadamente usar menos dependências, não fingir que todas foram integradas.

## Limitações explícitas
- Tudo é sintético e vive em memória (recarregar limpa mudanças).
- Não implementa login, CPF, moderação real, pagamentos, fotos reais, mapa geocodificado, upload, notificações push ou Supabase.
- Chamadas de serviço e mensagens não são enviadas; as propostas não foram recebidas de empresas.
- Não é paridade integral da R72: suas dezenas de rotas e regras administrativas precisam de uma matriz própria de cobertura.
- O layout web deve ser validado em 320/360/375/430/768 e web desktop; o build estático não prova UX no Android.

## Regras de aceitação
- Busca acha itens de diferentes tipos e navega ao detalhe.
- Publicar pergunta: ela entra no estado e pode receber resposta.
- Adicionar/remover salvos e comparar imóveis (máximo 3).
- Alterar filtros reflete no catálogo; total mensal = aluguel + condomínio.
- Aderir a grupo habilita publicação; confirmar presença altera contador.
- Contatar anunciante abre thread; resposta aparece no histórico.
- Solicitação de serviço aparece em Pedidos, sem alegar envio real.
- Denúncia aparece em Minhas denúncias; ocultar retira pergunta e pode ser revertido.
- Nenhum fluxo deve depender de contas ou backend.
