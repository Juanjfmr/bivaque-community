# Protótipo HTML separado do Bivaque

Protótipo demonstrativo do pacote `Bivaque_Codex_18_Agentes_HTML.zip`. Os dados,
conversas, cadastro e cobrança são exemplos locais; não há integração com Supabase.
A rodada inicial modulariza o original sem mudar aparência, comportamento ou bytes.
A Rodada 00.1 permite correções localizadas de conversas e apresentação, preservando
a referência original. O [mapa dos módulos](docs/MODULE_MAP.md) descreve ownership,
estado compartilhado e interfaces da aplicação.

## Construir e conferir

Na raiz do repositório, com Python 3 e Node disponíveis:

```powershell
python scripts/bivaque-html/verify_reference.py
python scripts/bivaque-html/build.py
python scripts/bivaque-html/build.py --check
python scripts/bivaque-html/build.py --check-current
python scripts/bivaque-html/test_build.py
```

O build lê somente o template e os fragmentos indicados em `src/manifest.json`.
Valida a sintaxe dos três blocos JavaScript completos com `node --check` e grava
`dist/Bivaque_Material_Web.html`, sem timestamps, imports externos ou transformações.
O original é lido para conferir seu hash imutável, nunca para substituir os fontes.

`--check` não escreve o artefato: exige que o resultado dos fontes coincida byte a
byte com a referência congelada **e** com o `dist` existente. Uma alteração deliberada
dos fontes pode ser construída normalmente; nessa situação `--check` acusa a diferença
da baseline. Atualizações futuras precisam registrar essa diferença e sua prova de
runtime, sem alterar o arquivo original ou seu hash.

`--check-current` verifica o candidato editado: o original mantém o SHA256 congelado,
os fontes são lidos e montados duas vezes com resultado igual, os três scripts têm
sintaxe válida e o dist coincide com o candidato. Relata explicitamente a diferença
para o original. Nenhum dos dois modos escreve o dist, e não podem ser combinados.
Use `--check` para a extração byte-idêntica; use `--check-current` depois de correções
autorizadas. Um dist ausente/desatualizado falha em ambos os modos.

O destino é fixo: `dist/Bivaque_Material_Web.html`. Caminhos divergentes e diretório /
arquivo redirecionados por symlink são recusados. A escrita é atômica, evitando truncar
um arquivo preexistente ligado por hardlink. Testes negativos do builder usam entradas
em memória e não alteram o protótipo; revisão/runtime independentes continuam exigidos.

`extract.py` documenta a extração inicial e recusa executar quando `src/` já existe.
Não o execute para reconstruir o protótipo: o build preserva as edições feitas em `src/`.

## Abrir localmente

```powershell
python -m http.server 4173 --bind 127.0.0.1 --directory prototypes/bivaque-html
```

Abra `http://127.0.0.1:4173/dist/Bivaque_Material_Web.html`. A referência para comparação
fica em `http://127.0.0.1:4173/reference/Bivaque_Material_Web.original.html`.
Use perfis/contextos de navegador separados quando quiser comparar estados iniciais:
ambos usam a mesma chave de armazenamento local no mesmo origin.

O HTML incorpora Material Web oficial, fontes e imagens. Links para sites, mapa,
compartilhamento e outras capacidades do navegador continuam sujeitos ao ambiente.
Suporte a abertura `file://` não foi declarado nem provado nesta rodada.

## Fronteiras dos fontes

| Área | Responsabilidade |
| --- | --- |
| `src/shell/template.html` | DOM original com quatro placeholders, sem alterações de tags ou atributos |
| `src/styles/` | Fontes inline, CSS base, paleta, FAB, navegação, overlays e grupos |
| `src/vendor/material-web-2.5.0.js` | Bundle oficial preservado, inclusive avisos de licença |
| `src/data/demo/` | Versão Material, `SOURCE`, imagens `ASSETS` e constantes de demonstração |
| `src/utilities/format.js` | Seletores e helpers de apresentação do original |
| `src/features/` | Views, editores e ações de cada domínio demonstrativo |
| `src/shell/` | Primitivos, navegação, dialogs, menu criar, bindings |
| `src/motion/gestures.js` | Gestos e retorno pela borda existentes |
| `src/app/` | Abertura do IIFE, estado, dispatch central e inicialização/fechamento |

Os fragmentos são **partes textuais ordenadas**, não módulos ES independentes.
O manifest mantém a ordem lexical: todos os arquivos de aplicação continuam
no mesmo IIFE, com as interfaces compartilhadas documentadas. Não carregar um fragmento
sozinho com `<script src>` nem executar `node --check` isoladamente no `open.js` ou
`start.js`, pois a abertura e o fechamento do IIFE ficam separados. Para validar, use
o build que reúne cada bloco completo.

O manifest registra o hash inicial de cada bloco para rastreabilidade; o hash global
congelado é a autoridade de `--check`. As partições não introduzem adaptadores de backend:
`SOURCE`/`ASSETS` e o estado local continuam com o acoplamento demonstrativo original.

## Preservação e validação

A configuração Biome local exclui `src`, `reference` e `dist`: formatar os snapshots
importados mudaria a baseline e os avisos/bundle de terceiros. O Python do build e os
checks de referência/sintaxe continuam verificáveis. Para mudanças funcionais futuras,
defina checks direcionados dos arquivos editados e prova de runtime no contrato da
rodada; a exclusão local não constitui aprovação de qualidade ou acessibilidade.

O `.gitattributes` local desativa conversão de finais de linha nessas três áreas.
Os 2.760.578 bytes originais usam LF e devem sobreviver a checkout Windows/Unix.
O artefato `dist/` é reconstruível e pode estar ignorado pelo Git do repositório.

Referência SHA256: `29a402c4e717ab2826c2e2aa0c3da6bac7f7b2b390090ed22c5ff1f2cbb385a4`.
Prova de sintaxe e igualdade não prova jornadas nem aparência; os resultados de revisão
e navegador independentes devem ser registrados pelo coordenador da rodada.
