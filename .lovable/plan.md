
# Cadastro de Usuários — Robustez completa (PF + Imobiliária + Profissional)

Resolve os 4 pontos pedidos de ponta a ponta, sem deixar nada para o usuário implementar.

---

## 1. Banco — Constraints reais de unicidade (`profiles`)

Garante que duplicidade de **CPF/CNPJ** e **telefone** seja impossível, mesmo se o frontend falhar.

- Normaliza dados existentes (remove máscara `.`, `/`, `-`, `(`, `)`, espaços) na coluna `cnpj` e `phone`.
- Cria índices únicos parciais (ignoram nulos/vazios), case-insensitive:
  - `profiles_cnpj_unique` em `regexp_replace(cnpj, '\D', '', 'g')` quando não vazio.
  - `profiles_phone_unique` em `regexp_replace(phone, '\D', '', 'g')` quando não vazio.
- Antes de criar o índice, detecta colisões já existentes e renomeia o documento/telefone do registro mais novo para `<valor> (DUPLICADO-<id curto>)` para não bloquear a migração — registra aviso no console.

## 2. Edge Function `create-user` — Pré-checagem servidor + erros claros

Adiciona, antes de criar o auth user:

- Validação CPF (11 dígitos + dígitos verificadores) e CNPJ (14 dígitos + DVs) — não só comprimento.
- Validação de telefone BR (10–11 dígitos).
- Pré-checagem de duplicidade contra `profiles`:
  - `cnpj` (comparado por dígitos): retorna `409` `{ error: "DOCUMENT_ALREADY_IN_USE", message, conflict: { id, name, email, role } }`.
  - `phone` (comparado por dígitos): retorna `409` `{ error: "PHONE_ALREADY_IN_USE", message, conflict }`.
- Persiste `cnpj` e `phone` **sempre só com dígitos** (canonical form) para casar com o índice e com a UI (a UI re-aplica máscara).
- Se a inserção do profile falhar por violação do índice unique (race), captura o erro e devolve o mesmo 409 estruturado, fazendo rollback do auth.user.

## 3. Edge Function `manage-user` (action `update`) — Mesma checagem

- Para update de `cnpj`/`phone`, busca conflitos em `profiles` com **id != user_id**.
- Retorna 409 com `field: "cnpj"` ou `field: "phone"` e mensagem clara incluindo nome do dono atual.
- Já existente: validação CPF/CNPJ por DV permanece.

## 4. Frontend — `GerenciarUsuarios.tsx`

### 4a. Aviso inline em tempo real (criar e editar)
- Abaixo do campo CPF/CNPJ: ao digitar, compara dígitos contra `users` carregados; se bater, mostra banner vermelho com:
  - Nome, e-mail e tipo do usuário em conflito.
  - Botão **"Editar existente"** que abre o modal pré-preenchido.
- Mesmo banner para o campo **Telefone**.
- Bloqueia o botão "Criar Usuário" / "Salvar" enquanto houver conflito local.

### 4b. Tratamento das respostas 409 do backend
- Reaproveita o padrão já existente para `EMAIL_ALREADY_IN_USE`, adicionando handlers para `DOCUMENT_ALREADY_IN_USE` e `PHONE_ALREADY_IN_USE`:
  - Toast persistente (10s) + ação **"Editar existente"** se `conflict` estiver na lista carregada.
  - Atualiza `createStatus` em `error` com `reason` específico.
  - Refaz `invalidateQueries` para listar o conflitante.

### 4c. Fluxo Pessoa Física unificado
- Removidas divergências: form de criar e modal de editar usam o mesmo bloco condicional para PF (CPF + telefone obrigatório).
- Após salvar PF com sucesso: `invalidateQueries(['admin-users'])` **e** dispara também invalidação implícita do menu lateral `Clientes` (que já lê `user_roles` em tempo real ao montar — adicionamos uma chave de query nomeada para a página `Imobiliarias.tsx` para revalidar).
- `Imobiliarias.tsx` migrado para `useQuery(['clientes'])` em vez de `useEffect`, permitindo `queryClient.invalidateQueries(['clientes'])` após criar/editar PF.

### 4d. Exibição clara de role/tipo
**Lista de usuários (cards):**
- Badge de tipo já existe — fica mais visível: ícone + label colorido + cor consistente:
  - Imobiliária = `secondary` + `Building2`
  - Pessoa Física = `outline` roxo + `User`
  - Profissional = `default` + `Wrench`
  - Admin = `destructive` + `Shield`
- Adiciona linha "Tipo: <label>" também em texto, para acessibilidade.

**Atalhos/Stats no topo:** já mostram contagem por tipo. Adiciona ícone em cada card de stat para reforço visual.

**Página Clientes (sidebar):** já mostra badge — adicionamos o ícone correto no card e o filtro ativo destacado.

### 4e. Confirmação reforçada ao trocar tipo/role
Quando `editForm.role !== editUser.role`, ao clicar **Salvar** abrimos um `AlertDialog` adicional antes de chamar a função:

```
Você está alterando o tipo de "Fulano" de Imobiliária → Pessoa Física.

O que muda:
✓ Verá apenas seus próprios chamados (igual hoje), sem listas de imóveis comerciais
✓ Campo "Empresa" será removido do perfil
✓ Documento esperado passa a ser CPF (11 dígitos)
✗ Perde acesso à área "Imobiliárias" / relatórios consolidados
✗ Não poderá registrar imóveis em nome de uma empresa

Para confirmar, digite o nome do usuário: [______]
[Cancelar]   [Confirmar alteração]
```

- Tabela de impactos é gerada por uma função `roleChangeImpact(from, to)` cobrindo as 12 combinações relevantes (admin/tecnico/imobiliaria/pessoa_fisica).
- Botão "Confirmar" só habilita quando o input bate exatamente com o nome (case-insensitive, trim).
- Após confirmar é que o `change_role` é chamado seguido do `update`.

## 5. Auditoria

Cada bloqueio por duplicidade (frontend ou backend) gera entrada em `audit_logs` via `useAuditLog`:
- `action: "duplicate_blocked"`, `entity_type: "user"`, `details: { field, attempted, conflict_id }`.
- Troca de role bem-sucedida: `action: "role_changed"`, `details: { from, to }`.

---

## Detalhes técnicos

**Arquivos editados:**
- `supabase/functions/create-user/index.ts` — validações DV, pré-check duplicidade, persistência canônica.
- `supabase/functions/manage-user/index.ts` — pré-check duplicidade em `update`.
- `src/pages/GerenciarUsuarios.tsx` — banners inline, handlers 409, `AlertDialog` de confirmação de troca de role, função `roleChangeImpact`.
- `src/pages/Imobiliarias.tsx` — migra para `useQuery(['clientes'])` para invalidação cruzada.
- `src/lib/roles.ts` — exporta `roleChangeImpact(from, to)` central.

**Migração SQL:**
- Sanitização de `phone`/`cnpj` (UPDATE para canonicalizar dígitos).
- Resolução de duplicatas pré-existentes (sufixo `(DUPLICADO-xxx)`).
- `CREATE UNIQUE INDEX ... WHERE`.

**Sem mudança de RLS** — políticas atuais permanecem.

**Compatibilidade:** dados antigos com máscara passam a ser armazenados sem máscara; máscara permanece só em UI via `maskCPF/maskCNPJ/maskPhoneBR`. Buscas existentes (`Imobiliarias.tsx` filtra por `cnpj.includes(term)`) continuam funcionando porque comparamos lowercase substring.

**Rollback:** drop dos índices únicos restaura o estado anterior; nenhum dado é perdido (apenas re-formatado e duplicatas marcadas).
