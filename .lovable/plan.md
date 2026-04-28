# Diagnóstico e correção do cadastro de usuários

## O que está acontecendo (verificado no banco de produção)

A imobiliária que você está tentando cadastrar **JÁ EXISTE** no banco:

- **E-mail:** `danielsilveira@imobiliariagestao.com.br`
- **Empresa:** IMOBILIÁRIA GESTÃO
- **CNPJ:** 09.191.551/0001-54
- **Cadastrada em:** 09/04/2026

A edge function `create-user` está devolvendo `EMAIL_ALREADY_IN_USE` (HTTP 409), mas no card de status que você vê na tela isso não está ficando claro — o botão parece "travado em loading" e você não percebe que o erro já foi devolvido.

Além disso:

1. A página **/imobiliarias** mostra apenas role `imobiliaria` — a IMOBILIÁRIA GESTÃO está lá (cadastrada na primeira vez). O que você não está vendo é a **nova tentativa**, porque ela nunca foi criada (e-mail duplicado).
2. **/imobiliarias não inclui Pessoa Física** — você pediu que esses "atalhos" também mostrem PF.
3. **`audit_logs` está vazio** — o log de tentativas de criação não está sendo gravado, dificultando o diagnóstico futuro.

## O que vou corrigir

### 1. Tornar o erro de e-mail duplicado ÓBVIO
Quando a edge function devolve `EMAIL_ALREADY_IN_USE`:
- Banner vermelho grande no topo do formulário com o e-mail conflitante
- Toast persistente (não some sozinho) com botão "Ver usuário existente" que rola até a linha na tabela e destaca
- Botão "Criar Usuário" volta ao estado normal imediatamente (sem loading travado)
- Mensagem clara: *"O e-mail X já está cadastrado como [role]. Edite o usuário existente ou use outro e-mail."*

### 2. Mostrar lista de e-mails já cadastrados ao digitar
No campo de e-mail do formulário, se o usuário digitar um e-mail que já existe na lista de `users` carregada, mostrar aviso inline em tempo real (antes mesmo de submeter), evitando a tentativa.

### 3. Renomear página "Imobiliárias" → "Clientes" e incluir Pessoa Física
- A página `/imobiliarias` passa a listar **imobiliárias + pessoas físicas**, com filtro por tipo (chips: "Todos · Imobiliárias · Pessoas Físicas")
- Item da sidebar renomeado para "Clientes" (mantendo a rota `/imobiliarias` para não quebrar)
- Card mostra badge do tipo (Imobiliária / Pessoa Física)

### 4. Corrigir gravação de audit logs
Investigar por que `auditLog()` não está persistindo (provavelmente erro silencioso na edge `log-audit` ou RLS). Logar em `console.warn` quando falhar para não esconder problemas futuros.

### 5. Adicionar botão "Editar usuário existente" no erro 409
Quando o e-mail já existe, oferecer atalho direto para abrir o diálogo de edição daquele usuário.

## Detalhes técnicos

**Arquivos a editar:**
- `src/pages/GerenciarUsuarios.tsx` — tratamento visual do 409, validação inline de e-mail duplicado
- `src/pages/Imobiliarias.tsx` — incluir `pessoa_fisica`, filtro por tipo, renomear para Clientes
- `src/components/layout/Sidebar.tsx` — label "Clientes"
- `src/hooks/useAuditLog.ts` — log de falha em vez de silenciar

**Sem mudanças de banco** — apenas frontend.

## Importante

A IMOBILIÁRIA GESTÃO **já está cadastrada e funcional** desde 09/04. Você pode confirmar agora indo em **Imobiliárias** no menu lateral — ela aparece lá com Daniel Silveira. Suas tentativas recentes estavam falhando porque o e-mail é duplicado, não porque o sistema está quebrado.

Aprovando o plano, eu implemento as 5 correções acima e você passa a ver os erros com clareza.
