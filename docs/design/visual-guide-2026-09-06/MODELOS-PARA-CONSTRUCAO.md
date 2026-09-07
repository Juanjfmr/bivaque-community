# Modelos para construir o Bivaque a partir do guia visual

Atualizado em 07/09/2026. Este documento orienta a escolha prática de modelos para a
reconstrução. Não muda produto, permissões, arquitetura ou requisitos de verificação:
`PROCESSO-DE-CONSTRUCAO.md` continua sendo a autoridade de construção.

## Escolha recomendada

Use um modelo que aceite imagens no mesmo fluxo em que lê e altera o código. Para tarefas
visuais pequenas, comece com **Qwen3.8-Flash**. Ele aceita imagem, texto e vídeo, tem contexto
de 1 milhão de tokens, chamada de ferramentas e saída estruturada. É a melhor escolha inicial
de custo para ler uma prancha, localizar os componentes e implementar uma transição por vez.

Teste **GLM-5.3-Flash** em uma tarefa idêntica se o custo for o principal critério. A Z.ai o
descreve como modelo multimodal de programação, com foco em programação visual. Não assuma que
ele reproduz uma referência melhor do que o Qwen: compare uma tela real do Bivaque antes de
adotá-lo para o fluxo inteiro.

Use **Gemini 3.8 Flash** pontualmente quando a tarefa exigir análise visual mais longa,
depuração difícil ou uma segunda opinião. Ele também aceita imagens e ferramentas, mas custa
mais. Ele não é o revisor independente por si só; a independência depende de sessão, contexto e
papel separados.

**DeepSeek-V4-Flash-Vision-Exp** aceita imagens; **DeepSeek-V4-Flash** comum não aceita.
Escolha explicitamente a variante Vision Exp ao enviar PNGs. Ela é experimental, portanto não
a use como único caminho para um fluxo crítico sem validação no repositório.

## Preços de referência, não contrato

Os preços abaixo são valores públicos de API consultados em 07/09/2026, em USD por 1 milhão de
tokens. Eles servem para comparar orçamento e podem mudar sem aviso. Confirme a tabela do
provedor antes de configurar cobrança ou estimar um projeto.

| Modelo | Entrada | Saída | Observação |
|---|---:|---:|---|
| Qwen3.8-Flash | US$ 0,15 | US$ 0,47 | Preço internacional da Model Studio |
| GLM-5.3-Flash | US$ 0,075 | US$ 0,25 | Promoção indicada pela Z.ai até 09/09/2026 (UTC+8); tabela normal: US$ 0,15 / US$ 0,50 |
| DeepSeek-V4-Flash-Vision-Exp | US$ 0,22–0,44 | US$ 0,66–1,32 | Faixa fora/de pico; imagem é cobrada como entrada |
| Gemini 3.8 Flash | US$ 0,75 | US$ 3,75 | Preço introdutório indicado pelo Google até 31/12/2026 |

Fontes primárias: [Qwen / Alibaba Cloud](https://docs.modelstudio.console.alibabacloud.com/en/model-studio/qwen3-8-flash),
[GLM / Z.ai](https://docs.z.ai/guides/overview/pricing),
[DeepSeek](https://api-docs.deepseek.com/quick_start/pricing/) e
[Gemini](https://ai.google.dev/gemini-api/docs/pricing).

## Protocolo de uso

1. Anexe apenas a prancha e as notas da tarefa. Confirme que o modelo recebeu a imagem e peça
   uma descrição curta de campos, ações, público e estados antes de escrever código.
2. Dê uma única mudança observável: por exemplo, a entrada e recuperação de Auth, ou publicar
   uma pergunta para Toda a cidade. Não entregue um módulo inteiro de uma vez.
3. Limite o raciocínio e o contexto ao necessário; no Qwen, comece no nível médio para tarefas
   de desenvolvimento. Reenvie o resumo de continuidade em vez de todo o histórico.
4. Exija código, execução e captura da implementação. Entender um PNG não prova que a interface
   funciona, que a autorização está correta ou que a versão mobile foi executada.
5. Antes de adotar um modelo, compare Qwen e GLM na mesma tarefa, com a mesma prancha e os
   mesmos critérios: fidelidade visual, testes, número de correções e custo total. Escolha pelo
   resultado do Bivaque, não por benchmark do fornecedor.

Nenhum modelo pode inferir permissões, persistência ou promessas de produto a partir de uma
imagem. As decisões textuais atuais prevalecem sobre bitmaps e documentação histórica
conflitante.
