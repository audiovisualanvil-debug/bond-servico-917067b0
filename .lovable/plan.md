## Objetivo

Hoje o sistema só aceita chamados de **imobiliárias**. Vamos liberar para **pessoa física (PF)** também — admin cadastra a PF (igual cadastra imobiliária), a PF entra no app, gerencia seus próprios imóveis e abre/aprova chamados no mesmo fluxo já existente.

A diferença será apenas visual: cada OS mostra um **badge** indicando se foi solicitada por Imobiliária (azul) ou Pessoa Física (verde).

---

## O que muda para o usuário

**Admin**
- Na tela "Gerenciar Usuários", ao criar usuário, aparece nova opção de tipo: **Pessoa Física** (além de Imobiliária e Profissional).
- Em todas as listas de OS (Dashboard, Ordens, Aprovar Orçamentos, Relatórios), cada card ganha um badge: 🟦 Imobiliária ou 🟩 Pessoa Física.
- Filtro opcional na lista para ver só Imobiliárias ou só PF.

**Pessoa Física (novo perfil)**
- Faz login normalmente.
- Vê o mesmo menu que a imobiliária vê hoje (Dashboard, Ordens, Novo Chamado, Histórico de Imóveis), só que adaptado para PF — termo "Imóveis" em vez de "Imóveis das Imobiliárias", sem campo CNPJ, sem campo "Empresa".
- Cadastra **vários endereços** (casa, sítio, apto dos pais...) e escolhe um ao abrir chamado.
- Aprova orçamento exatamente como a imobiliária aprova hoje.

**Profissional**
- Sem mudança de fluxo. Só passa a ver o badge no card identificando se o solicitante é Imobiliária ou PF.

---

## Detalhes técnicos

### 1. Banco de dados (migração)

- Adicionar valor `'pessoa_fisica'` ao enum `app_role`.
- A tabela `properties` já tem `imobiliaria_id` — vamos **renomear conceitualmente** mantendo a coluna (sem renomear no SQL para não quebrar código), passando a representar "dono do imóvel" (imobiliária OU pessoa física). Ambos os tipos de usuário usam o mesmo campo.
- Atualizar todas as RLS policies que hoje mencionam apenas `imobiliaria` para também aceitar `pessoa_fisica`:
  - `properties`: policies de insert/update/select passam a permitir tanto `imobiliaria` quanto `pessoa_fisica` desde que `imobiliaria_id = auth.uid()`.
  - `service_orders`: mesma lógica nas policies de insert/update/select de "imobiliaria".
  - `service_order_comments`, `completion_reports`, `service_order_items`: idem.
- Atualizar trigger `restrict_imobiliaria_update` para também restringir `pessoa_fisica` (mesmas regras — PF não pode mexer em custos/preço).

### 2. Tipos TypeScript

- `src/types/database.ts` e `src/types/serviceOrder.ts`: adicionar `'pessoa_fisica'` em `AppRole` / `UserRole`.

### 3. Edge Function `create-user`

- Aceitar `role: 'imobiliaria' | 'tecnico' | 'pessoa_fisica'`.
- Para PF, ignorar campos `company` e `cnpj` (não obrigatórios).

### 4. Frontend — telas a ajustar

- **`GerenciarUsuarios.tsx`**: adicionar opção "Pessoa Física" no select de tipo. Esconder campos Empresa/CNPJ quando tipo = PF. Mostrar PFs na listagem com badge próprio.
- **`Sidebar.tsx`**: adicionar `'pessoa_fisica'` aos arrays `roles` dos itens Dashboard, Ordens de Serviço, Novo Chamado, Histórico Imóveis. Adicionar label "Pessoa Física" no `getRoleLabel`.
- **`AuthContext.tsx`** / lógica de roles: garantir que PF é tratada com as mesmas permissões de leitura/escrita que imobiliária no client-side.
- **`NovoChamado.tsx`**: já funciona — usa `auth.uid()` como `imobiliaria_id`. Só ajustar textos genéricos ("Solicitar serviço" em vez de "Imobiliária solicita").
- **`HistoricoImoveis.tsx`** / cadastro de imóvel: liberar para PF também, esconder campos específicos de imobiliária se houver.
- **`OSCard.tsx`** e listas (Dashboard, OrdensServico, AprovarOrcamentos): novo componente `<RequesterBadge />` que lê a role do `imobiliaria_id` (via join no profile + user_roles) e renderiza:
  - Azul "Imobiliária" se role = imobiliaria
  - Verde "Pessoa Física" se role = pessoa_fisica
- **Filtro na lista de OS** (admin): dropdown "Tipo de solicitante: Todos / Imobiliária / Pessoa Física".

### 5. E-mails e notificações

- Edge functions `notify-status-change`, `send-budget-approved`, `send-completion-report`: já enviam para `imobiliaria_id` — funcionará para PF sem alteração, só ajustar texto de saudação para usar nome do `profile.name` em vez de `profile.company`.

### 6. Terminologia

- Onde a UI hoje fala "Imobiliária" no contexto de "quem solicitou", trocar por **"Solicitante"** (termo neutro que serve para os dois). Onde fala especificamente da imobiliária como entidade (ex: tela "Imobiliárias" no menu admin), manter.

---

## Fluxo final

```text
Admin cria usuário PF
  → PF faz login
  → PF cadastra endereço(s) em "Meus Imóveis"
  → PF abre chamado escolhendo um endereço
  → Fluxo idêntico ao da imobiliária:
     Profissional orça → Admin aplica margem → PF aprova → Execução → Conclusão
  → Admin/Profissional veem badge verde "Pessoa Física" no card
```

---

## Não está incluído (fica pra depois se quiser)

- Auto-cadastro público de PF (você escolheu admin cadastrar manualmente).
- Pagamento online direto pela PF.
- App separado / branding diferente para PF.
