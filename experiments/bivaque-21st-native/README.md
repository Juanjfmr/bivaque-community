# Bivaque — P0/P1 React + 21st.dev (revisão de 11/11/2026)

Experimento isolado: `experiment/bivaque-21st-native-p0p1-20261111`. Não altera R72, produção ou `main`.

## Componentes

- **23 fontes oficiais** do 21st.dev em `src/components/21st/upstream` preservadas bit a bit.
- Adaptadores em `src/components/21st` para integração com identidade, conteúdo, controle de estado e acessibilidade.
- `source-manifest.json` registra demo ID, comando oficial e SHA-256 de cada fonte. O verificador bloqueia alterações silenciosas aos arquivos upstream.
- Licenças individuais dos autores **não foram verificadas**; analisar antes de usar em produção.

## Correções de produto

- Identidade de cores e tipografia ajustada aos tokens da referência HTML anexada.
- Home com variantes **Chegando / Morando / Saindo**, e cenários de comunidade **Nova / Rala / Viva**.
- Anúncios, perguntas, grupos e encontros criados no estado da sessão, com ação **Desfazer**.
- Respostas e solução de perguntas; conversa contextual do anúncio; botão Voltar com histórico do navegador; links para perguntas com hash.
- Correções de acessibilidade (salvar, reações, teclado), overflow móvel e validação de arquivos.
- Sem backend, persistência ou autenticação. A interface é laboratório demonstrativo, não produção.

## Executar

Na raiz do monorepo:

```sh
cd experiments/bivaque-21st-native
npm install
npm run build
npm run typecheck
npm run test:e2e
```

O ZIP da versão local inclui os assets em `public/demo` e `public/ilustracoes` para execução independente.

## Limites de aceite

Testes precisam ser aprovados pelo CI após este conjunto de alterações. Ainda exigem revisão visual comparativa completa no Android real; testes unitários não substituem aprovação da R72. Nenhum merge automático deve ser realizado. O CI geral do repositório tem falhas de lint fora do escopo identificado e deve ser auditado por diff antes de marcar o PR como pronto.
