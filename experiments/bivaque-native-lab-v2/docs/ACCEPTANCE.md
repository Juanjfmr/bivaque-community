# Matriz de aceite — V2 (demonstração)

| ID | Jornada | Passo para teste no Android | Esperado |
|---|---|---|---|
| U01 | Busca | Início > Buscar > eletricista | Resultado de pergunta/serviço |
| U02 | Perguntar | Criar > Pergunta > título > criar | Pergunta abre em detalhe |
| U03 | Responder | Pergunta > resposta > Publicar | Contador incrementa, resposta aparece |
| U04 | Salvar | Deslizar pergunta para a direita / tocar marcador | Salvo aparece em Você |
| U05 | Ocultar | Deslizar pergunta para esquerda > Você > Configurações | Retira conteúdo e permite restaurar |
| U06 | Imóveis | Mercado > Imóveis > Filtros (2 quartos, R$3000) | Resultado respeita aluguel+condomínio |
| U07 | Comparar | Imóvel > Adicionar comparação > Você > Comparar | Compara total mensal e atributos |
| U08 | Contato | Detalhe de imóvel > Conversar | Thread é criada com contexto |
| U09 | Serviço | Mercado > Serviços > Perfil > Pedir orçamento | Pedido aparece em Você |
| U10 | Grupo | Comunidade > Grupos > Participar > Publicar | Post local aparece no grupo |
| U11 | Encontro | Comunidade > Encontros > Confirmar | Contador e estado mudam |
| U12 | Segurança | Pergunta > Mais > Denunciar | Registro local em Você > Denúncias |
| U13 | Guia | Início > Guia > Bairro | Catálogo filtrado por bairro |
| U14 | Web | Chrome Android 320/360/375/430px | Sem overflow horizontal e navegação clicável |

Paridade da R72: NÃO afirmada. Para lançamento, retomar verificações de acessibilidade, autenticação, moderação real, mapas, galeria de imagens, buscas por CEP, propostas reais e fluxos administrativos.
