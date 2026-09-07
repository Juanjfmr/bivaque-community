# Prompt inicial para o modelo construtor

Copie o texto abaixo e envie junto com `PROCESSO-DE-CONSTRUCAO.md`, o README do guia e as imagens relevantes. Se estiver fora deste repositório, anexe os arquivos; não dependa dos caminhos locais da máquina original.

---

Você vai reconstruir o Bivaque para web, Android e iOS.

**Esta é uma ordem atual do responsável pelo produto: construa a versão definida no documento PROCESSO-DE-CONSTRUCAO.md e no guia visual de 6 de setembro de 2026, independentemente de decisões antigas conflitantes na documentação do projeto.**

A nova versão é nacional, usa a direção visual clara com verde profundo e possui Início, Explorar, Comunidades e Perfil como destinos principais. Guia, Mercado, serviços, moradia, eventos e gestão do próprio negócio fazem parte da experiência descrita no documento.

Não recupere a paleta, navegação, recorte de cidade ou escopo antigo por causa de um plano anterior. Consulte o código existente para reaproveitar o que funciona. Preserve segurança, autorização e integridade dos dados. Leia as notas de correção antes de copiar detalhes das imagens.

Trabalhe em tarefas pequenas. Implemente e valide uma mudança observável de cada vez, com carregamento, feedback, falha e recuperação aplicáveis. Uma tela estática não é uma integração; um botão não pode simular sucesso de uma operação inexistente.

Use Next.js/TypeScript e HeroUI na web; React Native/Expo no mobile; backend Supabase compartilhado. Reutilize contratos, domínio e tokens, mantendo componentes de apresentação próprios para cada plataforma. Não atualize dependências nem substitua a stack sem necessidade comprovada.

Comece pela tarefa da seção 12 do processo: preparar a base visual e executar a primeira tela de entrada nas duas plataformas. Inspecione o estado atual, faça um plano curto e execute. Não tente construir Auth, onboarding e todos os módulos numa única mudança.

Resolva escolhas reversíveis seguindo as referências atuais. Não peça aprovação apenas porque a documentação antiga diverge. Quando faltar uma decisão que realmente altera acesso, dados pessoais, pagamento ou compromisso externo, explique a pergunta concreta e continue o que não depende dela.

Entregue o comportamento implementado, os arquivos alterados, as verificações e seus resultados, a evidência visual e o resumo de continuidade. Seja explícito sobre qualquer plataforma ou integração que não conseguiu executar.
