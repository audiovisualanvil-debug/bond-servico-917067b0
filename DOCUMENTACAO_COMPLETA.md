# 📋 DOCUMENTAÇÃO COMPLETA — Faz-Tudo Imobiliário

> Sistema de gestão de ordens de serviço (OS) para manutenção imobiliária.  
> URL publicada: https://bond-servico.lovable.app

---

## 📌 Sumário

1. [Visão Geral](#1-visão-geral)
2. [Stack Tecnológica](#2-stack-tecnológica)
3. [Papéis de Usuário (Roles)](#3-papéis-de-usuário-roles)
4. [Fluxo Completo de uma Ordem de Serviço](#4-fluxo-completo-de-uma-ordem-de-serviço)
5. [Status da OS](#5-status-da-os)
6. [Autenticação e Login](#6-autenticação-e-login)
7. [Páginas e Funcionalidades](#7-páginas-e-funcionalidades)
8. [Banco de Dados (Supabase)](#8-banco-de-dados-supabase)
9. [Edge Functions (Backend)](#9-edge-functions-backend)
10. [Geração de PDF](#10-geração-de-pdf)
11. [Notificações por E-mail](#11-notificações-por-e-mail)
12. [Upload de Arquivos](#12-upload-de-arquivos)
13. [Realtime](#13-realtime)
14. [Segurança e RLS](#14-segurança-e-rls)

---

## 1. Visão Geral

O **Faz-Tudo Imobiliário** é um sistema web completo para gestão de ordens de serviço de manutenção em imóveis, conectando três atores:

- **Administradores** — gerenciam todo o fluxo, aprovam orçamentos, designam técnicos, criam usuários
- **Imobiliárias** — abrem chamados (OS), aprovam/rejeitam orçamentos enviados
- **Técnicos** — recebem OS designadas, enviam orçamentos detalhados, executam serviços e geram relatórios de conclusão

O sistema cobre desde a abertura do chamado até a conclusão com relatório fotográfico, passando por orçamentação, aprovação administrativa, envio para a imobiliária, aprovação do cliente e execução.

---

## 2. Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| **Frontend** | React 18 + TypeScript + Vite |
| **Estilização** | Tailwind CSS + shadcn/ui |
| **Roteamento** | React Router DOM v6 |
| **Estado/Cache** | TanStack React Query v5 |
| **Formulários** | React Hook Form + Zod |
| **Backend** | Supabase (Lovable Cloud) |
| **Banco de Dados** | PostgreSQL (via Supabase) |
| **Autenticação** | Supabase Auth (email/password) |
| **Storage** | Supabase Storage (fotos de OS, avatares) |
| **Edge Functions** | Deno (Supabase Edge Functions) |
| **PDF** | html2pdf.js |
| **Gráficos** | Recharts |
| **Datas** | date-fns |
| **Animações** | CSS transitions + Tailwind Animate |

---

## 3. Papéis de Usuário (Roles)

O sistema possui 3 papéis definidos no enum `app_role`:

### 3.1 Administrador (`admin`)
- Vê **todas** as OS do sistema
- Designa técnicos para OS
- Revisa e aprova orçamentos dos técnicos, definindo o **valor final** para a imobiliária
- Aplica margem sobre o custo do técnico (pré-calculado em +40%)
- Define forma de pagamento (via Imobiliária, PIX, Cartão)
- Cria usuários (imobiliárias e técnicos) via Edge Function
- Edita e desativa/reativa usuários
- Abre chamados em nome de qualquer imobiliária
- Exclui OS (com exclusão em cascata de itens e relatórios)
- Acessa relatórios financeiros completos (faturamento, custo, lucro, margem)
- Acessa a listagem de todas as imobiliárias e técnicos
- Envia relatórios de conclusão por e-mail (para imobiliária, técnico ou proprietário)
- Vê dashboard com: OS aguardando aprovação, em execução, concluídas e faturamento total

### 3.2 Imobiliária (`imobiliaria`)
- Abre chamados (OS) para seus próprios imóveis
- Cadastra novos imóveis (com busca automática de CEP via ViaCEP)
- Acompanha suas OS
- Recebe orçamentos aprovados pelo admin
- **Aprova** ou **solicita revisão** do orçamento recebido
- Vê histórico de manutenções por imóvel
- Acessa relatórios de conclusão e PDFs de orçamento
- Vê dashboard com: total de OS, em andamento, em execução e concluídas

### 3.3 Técnico (`tecnico`)
- Vê apenas as OS que lhe foram designadas
- Envia orçamento detalhado (descrição, mão de obra, materiais, impostos, prazo)
- Inicia a execução do serviço quando aprovado
- Preenche relatório de conclusão (descrição, checklist, fotos antes/depois, observações, assinatura)
- Vê dashboard com: OS aguardando orçamento, a executar, concluídas e total no mês

---

## 4. Fluxo Completo de uma Ordem de Serviço

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. ABERTURA                                                        │
│    Imobiliária ou Admin abre o chamado                             │
│    → Status: aguardando_orcamento_prestador                        │
│    → Upload de até 5 fotos (JPG/PNG/WEBP, max 5MB cada)           │
│    → Dados: imóvel, problema, urgência, solicitante                │
├─────────────────────────────────────────────────────────────────────┤
│ 2. DESIGNAÇÃO DO TÉCNICO (Admin)                                   │
│    Admin seleciona e designa um técnico para a OS                  │
│    → Notificação enviada ao técnico                                │
├─────────────────────────────────────────────────────────────────────┤
│ 3. ENVIO DO ORÇAMENTO (Técnico)                                    │
│    Técnico preenche: descrição, mão de obra, materiais,            │
│    impostos (custo total calculado), prazo em dias                  │
│    → Status: aguardando_aprovacao_admin                            │
│    → Notificação enviada ao admin                                  │
├─────────────────────────────────────────────────────────────────────┤
│ 4. APROVAÇÃO ADMIN                                                 │
│    Admin revisa custos detalhados do técnico                       │
│    Admin define valor final (pré-calculado: custo × 1.4)           │
│    Admin define forma de pagamento                                  │
│    Admin clica "Aprovar e Enviar Orçamento"                        │
│    → Status: enviado_imobiliaria                                   │
│    → E-mail com orçamento enviado para imobiliária                 │
├─────────────────────────────────────────────────────────────────────┤
│ 5. APROVAÇÃO DA IMOBILIÁRIA                                        │
│    Imobiliária vê o valor final e prazo                            │
│    Opção A: "Aprovar Serviço"                                      │
│      → Status: aprovado_aguardando                                 │
│    Opção B: "Solicitar Revisão"                                    │
│      → Status volta para: aguardando_aprovacao_admin               │
│      → Admin pode re-revisar e re-enviar                           │
├─────────────────────────────────────────────────────────────────────┤
│ 6. INÍCIO DA EXECUÇÃO (Técnico)                                    │
│    Técnico clica "Iniciar Execução"                                │
│    → Status: em_execucao                                           │
├─────────────────────────────────────────────────────────────────────┤
│ 7. CONCLUSÃO (Técnico)                                             │
│    Técnico preenche o Relatório de Conclusão:                      │
│    - Descrição do serviço executado                                │
│    - Checklist de verificação (itens padrão + personalizados)      │
│    - Fotos antes do serviço                                        │
│    - Fotos depois do serviço                                       │
│    - Observações e recomendações                                   │
│    - Assinatura digital (nome completo)                            │
│    → Status: concluido                                             │
│    → E-mail com relatório enviado para imobiliária                 │
│    → Notificação de conclusão enviada                              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5. Status da OS

| Status | Label | Descrição |
|--------|-------|-----------|
| `aguardando_orcamento_prestador` | Aguardando Orçamento Prestador | OS aberta, aguardando técnico enviar orçamento |
| `aguardando_aprovacao_admin` | Aguardando Aprovação Admin | Orçamento do técnico enviado, aguardando admin revisar |
| `enviado_imobiliaria` | Enviado para Imobiliária | Admin aprovou e enviou orçamento para imobiliária |
| `aprovado_aguardando` | Aprovado - Aguardando Execução | Imobiliária aprovou, aguardando técnico iniciar |
| `em_execucao` | Em Execução | Técnico está executando o serviço |
| `concluido` | Concluído | Serviço finalizado com relatório de conclusão |

### Níveis de Urgência

| Nível | Label |
|-------|-------|
| `baixa` | Baixa |
| `media` | Média |
| `alta` | Alta |
| `critica` | Crítica |

---

## 6. Autenticação e Login

### Tela de Login (`/`)
1. O usuário seleciona seu perfil: **Administrador**, **Técnico** ou **Imobiliária**
2. Insere e-mail e senha
3. Validação via Zod (e-mail válido, senha mín. 6 caracteres)
4. Feedback visual: campos ficam com borda vermelha em caso de erro
5. Mensagens de erro em português: "E-mail ou senha inválidos", "Email não confirmado", etc.

### Criação de Contas
- **Contas NÃO são criadas por auto-cadastro** — apenas o Administrador cria contas via a página "Gerenciar Usuários"
- A criação é feita pela Edge Function `create-user` que usa a API admin do Supabase Auth
- Na tela de login consta: "Contas são criadas pela administração do sistema"

### Sessão
- Gerenciada pelo `AuthContext` que escuta `onAuthStateChange` do Supabase
- Fetch automático do perfil (`profiles`) e papel (`user_roles`) após login
- Retry com 3 tentativas e delay de 500ms caso o perfil ainda não exista

---

## 7. Páginas e Funcionalidades

### 7.1 Dashboard (`/dashboard`)
**Acesso:** Todos os papéis

Exibe cards de estatísticas e ordens recentes, adaptados por papel:

| Papel | Cards Exibidos |
|-------|---------------|
| **Admin** | Aguardando Aprovação, Em Execução, Concluídas, Faturamento Total |
| **Imobiliária** | Total de OS, Em Andamento, Em Execução, Concluídas |
| **Técnico** | Aguardando Orçamento, A Executar, Concluídos, Este Mês |

- **Admin:** Mostra as 3 OS mais recentes com status `aguardando_aprovacao_admin`
- **Imobiliária:** Mostra as 3 OS mais recentes (qualquer status)
- **Técnico:** Mostra as 3 OS mais recentes (qualquer status)
- Atualização em tempo real via Supabase Realtime

---

### 7.2 Ordens de Serviço (`/ordens`)
**Acesso:** Todos os papéis

- Lista todas as OS acessíveis ao usuário (filtradas por RLS)
- **Filtro por status:** dropdown com todos os 6 status
- **Busca textual:** por número da OS, endereço, problema ou solicitante
- Botão "Novo Chamado" para imobiliárias e admins
- Cada OS exibe: número, status (badge colorido), endereço, problema resumido, urgência, data
- Atualização em tempo real

---

### 7.3 Detalhe da OS (`/ordens/:id`)
**Acesso:** Todos os papéis (filtrado por RLS)

Página completa com todas as informações da OS, dividida em seções:

#### Cabeçalho
- Número da OS + badge de status
- Data de abertura formatada
- Indicador de urgência
- Botões: Orçamento PDF (quando aprovado), Relatório PDF (quando concluído), Excluir (admin)

#### Informações do Imóvel
- Endereço completo, bairro, cidade, estado, CEP
- Código do imóvel (se cadastrado)
- Inquilino: nome e telefone
- Proprietário: nome, telefone e e-mail

#### Problema Reportado
- Descrição textual do problema
- Galeria de fotos com visualização em grid (clique abre em nova aba)

#### Diagnóstico do Técnico
- Descrição do técnico sobre o problema
- Custo informado (visível para admin e técnico)
- Prazo estimado em dias

#### Relatório de Conclusão (quando concluído)
- Descrição do serviço executado
- Checklist de verificação com ícones de concluído/pendente
- Fotos antes e depois (thumbnails com contador)
- Observações e recomendações
- Assinatura do técnico + data/hora
- Botões de envio por e-mail (admin): para imobiliária, técnico ou proprietário
- Link para relatório PDF completo

#### Seção de Ações (dinâmica por papel e status)

**Técnico:**
| Status | Ação Disponível |
|--------|----------------|
| `aguardando_orcamento_prestador` | Formulário de orçamento (descrição + mão de obra + materiais + impostos + prazo) |
| `aprovado_aguardando` | Botão "Iniciar Execução" |
| `em_execucao` | Formulário completo de relatório de conclusão |

**Admin:**
| Status | Ação Disponível |
|--------|----------------|
| Sem técnico designado | Formulário para designar técnico (select com todos os técnicos) |
| `aguardando_orcamento_prestador` (com técnico) | Exibe técnico designado e aguardando envio de orçamento |
| `aguardando_aprovacao_admin` | Revisão de custos detalhados + definição de valor final + forma de pagamento + botão "Aprovar e Enviar" |

**Imobiliária:**
| Status | Ação Disponível |
|--------|----------------|
| `enviado_imobiliaria` | Visualização do valor + prazo + botões "Aprovar Serviço" e "Solicitar Revisão" |

#### Seção de Comentários
- Comentários internos na OS
- Campo "Visível para imobiliária" (checkbox, visível apenas para admin/técnico)
- Imobiliárias só veem comentários marcados como visíveis
- Exibe nome do autor + data/hora
- Formatação de telefone automática

#### Informações Laterais (sidebar)
- Card "Imobiliária": nome, empresa, e-mail, telefone
- Card "Técnico" (se designado): nome, e-mail, telefone
- Card "Imóvel": endereço completo, código, inquilino, proprietário
- Card "Valores" (admin): custo do técnico, valor final, margem, forma de pagamento

---

### 7.4 Novo Chamado (`/novo-chamado`)
**Acesso:** Imobiliária e Admin

Formulário completo para abertura de OS:

1. **Seleção de Imobiliária** (apenas para Admin) — dropdown com todas as imobiliárias
2. **Seleção de Imóvel** — dropdown com imóveis da imobiliária + opção "+ Cadastrar novo imóvel"
3. **Cadastro de Novo Imóvel** (expandido quando selecionado):
   - Código do imóvel
   - CEP (com lookup automático via API ViaCEP que preenche rua, bairro, cidade, estado)
   - Rua/Logradouro, Número, Complemento
   - Bairro, Cidade, Estado
   - Inquilino: nome + celular (com máscara de telefone)
   - Proprietário: nome + celular + e-mail
4. **Descrição do Problema** — textarea obrigatório
5. **Urgência** — seletor com 4 níveis (Baixa, Média, Alta, Crítica)
6. **Nome do Solicitante** — campo obrigatório
7. **Upload de Fotos** — até 5 imagens (JPG/PNG/WEBP), máx. 5MB cada, com preview e remoção

**Validação:**
- Campos obrigatórios com feedback visual (borda vermelha + mensagem)
- Scroll automático até o primeiro campo com erro
- Validação de tipo e tamanho de arquivo nas fotos

---

### 7.5 Aprovar Orçamentos (`/aprovar`)
**Acesso:** Apenas Admin

- Lista todas as OS com status `aguardando_aprovacao_admin`
- Exibe: card da OS + custo do técnico + valor sugerido (+40%) + prazo
- Busca textual por número, problema ou endereço
- Botão "Revisar Preço" redireciona para o detalhe da OS
- Atualização em tempo real

---

### 7.6 Meus Serviços (`/meus-servicos`)
**Acesso:** Apenas Técnico

Organizado em 3 abas com badges de contagem:

| Aba | Conteúdo |
|-----|----------|
| **Aguardando Orçamento** | OS com status `aguardando_orcamento_prestador` |
| **A Executar** | OS com status `aprovado_aguardando` ou `em_execucao` |
| **Concluídos** | OS com status `concluido` |

- Busca textual em cada aba
- Atualização em tempo real

---

### 7.7 Histórico por Imóvel (`/historico`)
**Acesso:** Imobiliária e Admin

Layout em duas colunas:
- **Coluna esquerda:** lista de imóveis com busca e contagem de OS
- **Coluna direita:** detalhes do imóvel selecionado + timeline cronológica de todos os serviços

Para cada imóvel exibe:
- Endereço completo + CEP
- Inquilino e proprietário (nome + telefone + e-mail)
- Contadores: Total de OS, Concluídas, Em Andamento

Timeline mostra:
- Ícone verde (concluído) ou amarelo (em andamento)
- Número da OS + badge de status
- Descrição do problema
- Data + valor (para não-técnicos)
- Links: "Ver detalhes" e "Relatório" (quando concluído)

---

### 7.8 Imobiliárias (`/imobiliarias`)
**Acesso:** Apenas Admin

- Grid de cards com todas as imobiliárias cadastradas
- Exibe: nome, empresa, e-mail, telefone
- Busca textual por nome, e-mail ou empresa
- Contagem total de imobiliárias

---

### 7.9 Técnicos (`/tecnicos`)
**Acesso:** Apenas Admin

- Grid de cards com todos os técnicos cadastrados
- Exibe: nome, e-mail, telefone
- Busca textual por nome ou e-mail
- Contagem total de técnicos

---

### 7.10 Gerenciar Usuários (`/usuarios`)
**Acesso:** Apenas Admin

Layout em duas colunas:

**Coluna esquerda — Formulário de Criação:**
- Tipo de Usuário: Imobiliária ou Técnico
- Nome Completo (obrigatório)
- E-mail (obrigatório)
- Senha (obrigatório, mín. 6 caracteres) com:
  - Toggle mostrar/ocultar senha
  - Indicador de força (Fraca/Média/Forte) baseado em: comprimento, maiúsculas, números, caracteres especiais
  - Barra de progresso colorida
- Telefone (opcional)
- Empresa (opcional, aparece apenas para tipo Imobiliária)

**Coluna direita — Lista de Usuários:**
- Cards de contagem: Imobiliárias, Técnicos, Admins
- Lista de todos os usuários com:
  - Ícone por papel (prédio para imobiliária, chave inglesa para técnico, pessoas para admin)
  - Nome, e-mail, empresa, telefone
  - Badge de papel colorido
  - Botões de ação (não aparecem para o próprio admin ou outros admins):
    - ✏️ Editar (abre dialog para alterar nome, telefone, empresa)
    - 🚫 Desativar / ✅ Reativar (com diálogo de confirmação)

---

### 7.11 Relatórios Financeiros (`/relatorios`)
**Acesso:** Apenas Admin

**Filtros:**
- Data De / Até (inputs de data)

**KPIs (6 cards):**
| Card | Descrição |
|------|-----------|
| Faturamento Total | Soma de `final_price` de todas as OS no período |
| Custo Técnico | Soma de `technician_cost` |
| Lucro Bruto | Faturamento - Custo |
| Total de OS | Quantidade de OS no período |
| Ticket Médio | Faturamento das concluídas / Quantidade de concluídas |
| Margem Média | (Lucro / Faturamento) × 100 |

**Gráficos:**
1. **Gráfico de Barras** (mensal) — Faturamento × Custo × Lucro por mês
2. **Gráfico de Pizza** — Distribuição de OS por status (com legenda colorida)

**Tabela de Desempenho por Imobiliária:**
| Coluna | Conteúdo |
|--------|----------|
| Imobiliária | Nome + empresa |
| OS | Total de OS |
| Concluídas | Quantidade concluída |
| Faturamento | Soma de `final_price` |
| Custo | Soma de `technician_cost` |
| Lucro | Faturamento - Custo |
| Margem | Percentual de margem |
| **Linha Total** | Soma de todas as colunas |

---

### 7.12 Relatórios Finais (`/relatorios-finais`)
**Acesso:** Apenas Admin

- **Grid de contadores por status** — 7 botões clicáveis (Todas + 6 status), cada um exibindo a contagem total. Seleção filtra a lista abaixo.
- **Busca textual** por OS, endereço, imobiliária, técnico ou solicitante
- **Lista de OS** com:
  - Número + badge de status
  - Endereço + bairro/cidade
  - Imobiliária, técnico, data de criação, valor
  - Botões: "Ver Relatório" (se concluído) e "Detalhe da OS"

---

### 7.13 Configurações (`/configuracoes`)
**Acesso:** Todos os papéis

**Seção 1 — Informações do Perfil:**
- Foto de perfil (avatar) com upload (hover mostra ícone de câmera, max 2MB, salvo no bucket `avatars`)
- Nome (editável)
- E-mail (somente leitura)
- Telefone (editável)
- Função (somente leitura)
- Empresa (somente leitura, se existir)
- Botão "Salvar Alterações"

**Seção 2 — Alterar Senha:**
- Nova Senha (mín. 6 caracteres)
- Confirmar Nova Senha
- Validação de senhas coincidentes
- Botão "Alterar Senha"

---

### 7.14 Orçamento PDF (`/ordens/:id/orcamento`)
**Acesso:** Admin e Imobiliária (não disponível para Técnico)

Página de visualização e download do orçamento em formato PDF profissional:

**Cabeçalho:**
- Logo Faz-Tudo + título "ORÇAMENTO DE SERVIÇO"
- Número da OS + data de aprovação

**Corpo:**
- Imóvel: endereço completo
- Imobiliária: nome/empresa + e-mail
- Solicitante
- Proprietário (se cadastrado)
- Inquilino (se cadastrado)
- Data de abertura
- Problema reportado
- **Fotos do problema** (grid de imagens, convertidas para base64 no PDF)
- Diagnóstico técnico
- Itens do serviço (listados da tabela `service_order_items`, sem valores)
- Valor total do serviço (destaque grande)
- Prazo estimado
- Condições editáveis pelo Admin:
  - Garantia (30/60/90/120/180 dias ou 1 ano)
  - Validade do orçamento (7/10/15/30/60 dias)
  - Forma de pagamento
  - Termos editáveis (adicionar, remover, alterar texto)

**Rodapé:**
- Áreas de assinatura: Aprovação do Cliente + Empresa Responsável

**Ações:**
- Botão "Imprimir" (window.print)
- Botão "Baixar PDF" (html2pdf.js com conversão de imagens para base64)

---

### 7.15 Relatório de Serviço PDF (`/ordens/:id/relatorio`)
**Acesso:** Admin e Imobiliária

Página de visualização e download do relatório de conclusão:

**Conteúdo:**
- Logo + título "RELATÓRIO DE SERVIÇO"
- Número da OS + data de conclusão
- Informações: imóvel, imobiliária, solicitante, técnico, data de abertura, data de conclusão
- Problema reportado
- Diagnóstico técnico
- Serviço executado
- Checklist de verificação (ícones ✅/❌)
- Registro fotográfico: fotos antes e depois (grid)
- Observações e recomendações
- Valor do serviço (oculto para técnicos)
- Condições: garantia, validade do relatório, forma de pagamento (seletores na barra de ações)
- Assinatura do técnico + data

**Ações:**
- Seletores de Garantia, Validade e Pagamento na barra superior
- Botão "Imprimir"
- Botão "Baixar PDF"

---

## 8. Banco de Dados (Supabase)

### 8.1 Tabelas

#### `profiles`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Mesmo ID do `auth.users` |
| `email` | TEXT | E-mail do usuário |
| `name` | TEXT | Nome completo |
| `phone` | TEXT | Telefone |
| `company` | TEXT | Nome da empresa (imobiliárias) |
| `avatar_url` | TEXT | URL da foto de perfil |
| `created_at` | TIMESTAMPTZ | Data de criação |
| `updated_at` | TIMESTAMPTZ | Última atualização |

#### `user_roles`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | ID auto-gerado |
| `user_id` | UUID | Referência ao usuário |
| `role` | `app_role` | Papel: `admin`, `imobiliaria` ou `tecnico` |
| `created_at` | TIMESTAMPTZ | Data de criação |

#### `properties`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | ID auto-gerado |
| `imobiliaria_id` | UUID (FK → profiles) | Imobiliária dona do imóvel |
| `address` | TEXT | Endereço completo |
| `neighborhood` | TEXT | Bairro |
| `city` | TEXT | Cidade |
| `state` | TEXT | Estado (UF) |
| `zip_code` | TEXT | CEP |
| `code` | TEXT | Código interno do imóvel |
| `tenant_name` | TEXT | Nome do inquilino |
| `tenant_phone` | TEXT | Telefone do inquilino |
| `owner_name` | TEXT | Nome do proprietário |
| `owner_phone` | TEXT | Telefone do proprietário |
| `owner_email` | TEXT | E-mail do proprietário |
| `created_at` | TIMESTAMPTZ | Data de criação |
| `updated_at` | TIMESTAMPTZ | Última atualização |

#### `service_orders`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | ID auto-gerado |
| `os_number` | TEXT | Número da OS (gerado por trigger) |
| `property_id` | UUID (FK → properties) | Imóvel |
| `imobiliaria_id` | UUID (FK → profiles) | Imobiliária |
| `tecnico_id` | UUID (FK → profiles) | Técnico designado |
| `problem` | TEXT | Descrição do problema |
| `photos` | TEXT[] | URLs das fotos do problema |
| `urgency` | `urgency_level` | Nível de urgência |
| `requester_name` | TEXT | Nome do solicitante |
| `status` | `os_status` | Status atual |
| `technician_description` | TEXT | Descrição/diagnóstico do técnico |
| `technician_cost` | NUMERIC | Custo total do técnico |
| `labor_cost` | NUMERIC | Custo de mão de obra |
| `material_cost` | NUMERIC | Custo de materiais |
| `tax_cost` | NUMERIC | Custo de impostos |
| `estimated_deadline` | INT | Prazo estimado em dias |
| `quote_sent_at` | TIMESTAMPTZ | Data de envio do orçamento |
| `final_price` | NUMERIC | Valor final para a imobiliária |
| `payment_method` | TEXT | Forma de pagamento |
| `admin_approved_at` | TIMESTAMPTZ | Data de aprovação admin |
| `client_approved_at` | TIMESTAMPTZ | Data de aprovação imobiliária |
| `execution_started_at` | TIMESTAMPTZ | Data de início da execução |
| `completed_at` | TIMESTAMPTZ | Data de conclusão |
| `created_at` | TIMESTAMPTZ | Data de criação |
| `updated_at` | TIMESTAMPTZ | Última atualização |

#### `service_order_items`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | ID auto-gerado |
| `service_order_id` | UUID (FK → service_orders) | OS relacionada |
| `description` | TEXT | Descrição do item |
| `item_type` | TEXT | Tipo do item |
| `real_cost` | NUMERIC | Custo real (oculto da imobiliária via view) |
| `created_at` | TIMESTAMPTZ | Data de criação |
| `updated_at` | TIMESTAMPTZ | Última atualização |

#### `service_order_comments`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | ID auto-gerado |
| `service_order_id` | UUID (FK → service_orders) | OS relacionada |
| `user_id` | UUID | Autor do comentário |
| `message` | TEXT | Conteúdo do comentário |
| `visible_to_imobiliaria` | BOOLEAN | Se o comentário é visível para imobiliárias |
| `created_at` | TIMESTAMPTZ | Data de criação |

#### `completion_reports`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | ID auto-gerado |
| `service_order_id` | UUID (FK → service_orders, UNIQUE) | OS relacionada (1:1) |
| `description` | TEXT | Descrição do serviço executado |
| `checklist` | JSONB | Array de itens: `[{id, item, completed}]` |
| `photos_before` | TEXT[] | URLs das fotos antes |
| `photos_after` | TEXT[] | URLs das fotos depois |
| `observations` | TEXT | Observações adicionais |
| `technician_signature` | TEXT | Assinatura digital do técnico |
| `completed_at` | TIMESTAMPTZ | Data de conclusão |
| `created_at` | TIMESTAMPTZ | Data de criação |

### 8.2 Views

- **`service_orders_client`** — View da tabela `service_orders` que **oculta** colunas financeiras sensíveis: `labor_cost`, `material_cost`, `tax_cost`, `technician_cost`, `payment_method`
- **`service_order_items_client`** — View da tabela `service_order_items` que **oculta** a coluna `real_cost`

### 8.3 Funções PostgreSQL

- **`get_user_role(_user_id UUID)`** — Retorna o papel do usuário
- **`has_role(_role app_role, _user_id UUID)`** — Verifica se o usuário tem determinado papel

### 8.4 Enums

- **`app_role`**: `admin`, `imobiliaria`, `tecnico`
- **`os_status`**: `aguardando_orcamento_prestador`, `aguardando_aprovacao_admin`, `enviado_imobiliaria`, `aprovado_aguardando`, `em_execucao`, `concluido`
- **`urgency_level`**: `baixa`, `media`, `alta`, `critica`

---

## 9. Edge Functions (Backend)

### 9.1 `create-user`
- **Propósito:** Criar novos usuários (invocado pelo Admin na página "Gerenciar Usuários")
- **Método:** POST
- **Body:** `{ email, password, name, phone?, company?, role }`
- **Ação:** Cria usuário via Supabase Auth Admin API, insere perfil na tabela `profiles` e papel na tabela `user_roles`

### 9.2 `manage-user`
- **Propósito:** Editar ou banir/desbanir usuários
- **Ações:**
  - `update` — Atualiza nome, telefone e empresa do perfil
  - `ban` — Desativa o usuário (Supabase Auth ban)
  - `unban` — Reativa o usuário

### 9.3 `notify-status-change`
- **Propósito:** Enviar notificação por e-mail quando o status da OS muda
- **Body:** `{ serviceOrderId, newStatus }`
- **Usado em:** Envio de orçamento pelo técnico, designação de técnico, conclusão do serviço

### 9.4 `send-budget-approved`
- **Propósito:** Enviar e-mail para a imobiliária quando o orçamento é aprovado pelo admin
- **Body:** `{ serviceOrderId }`
- **Ação:** Busca dados da OS e da imobiliária, envia e-mail com detalhes do orçamento

### 9.5 `send-completion-report`
- **Propósito:** Enviar relatório de conclusão por e-mail
- **Body:** `{ serviceOrderId, reportUrl, sendTo? }`
- **Destinatários configuráveis:** `imobiliaria`, `tecnico`, `proprietario`
- **Usado em:** Conclusão automática do serviço e envio manual pelo admin

---

## 10. Geração de PDF

O sistema utiliza a biblioteca **html2pdf.js** para gerar PDFs a partir do conteúdo HTML renderizado.

### Orçamento PDF (`OrcamentoPDF.tsx`)
- Converte todas as imagens para **base64** antes da geração (resolve problemas de CORS com Supabase Storage)
- Clona o elemento HTML para não alterar o DOM visível
- Formato: A4 retrato, escala 2x, JPEG quality 0.98
- Nome do arquivo: `FazTudo_{data}_{imobiliaria}_{osNumber}.pdf`

### Relatório Final PDF (`RelatorioOS.tsx`)
- Título do documento: **"RELATÓRIO FINAL"**
- Mesmo mecanismo de geração (clone do DOM + conversão de imagens para base64)
- Inclui todas as seções do relatório de conclusão: descrição do serviço, checklist, fotos antes/depois, observações e recomendações, assinatura do técnico
- **Histórico de Acompanhamento:** busca todos os comentários da OS na tabela `service_order_comments` (com join em `profiles` para nome e empresa do autor) e exibe cronologicamente no PDF, incluindo autor, empresa, data/hora e mensagem
- **Diagnóstico Técnico:** exibe a descrição do técnico (`technician_description`) quando disponível
- Condições configuráveis na barra de ações (não imprimível): garantia, validade do relatório e forma de pagamento
- Valor do serviço oculto para técnicos
- Nome do arquivo: `FazTudo_{data}_{imobiliaria}_{osNumber}.pdf`

---

## 11. Notificações por E-mail

O sistema envia e-mails automáticos nas seguintes situações:

| Evento | Edge Function | Destinatário |
|--------|--------------|-------------|
| Técnico envia orçamento | `notify-status-change` | Admin |
| Admin designa técnico | `notify-status-change` | Técnico |
| Admin aprova orçamento | `send-budget-approved` | Imobiliária |
| Técnico conclui serviço | `send-completion-report` + `notify-status-change` | Imobiliária |
| Admin envia relatório manualmente | `send-completion-report` | Imobiliária, Técnico ou Proprietário |

---

## 12. Upload de Arquivos

### Fotos de OS (abertura)
- **Bucket:** Supabase Storage
- **Caminho:** `os-creation/{uuid}/{filename}`
- **Limites:** máx. 5 fotos, formatos JPG/PNG/WEBP, máx. 5MB por arquivo
- **Preview:** exibido antes do envio com possibilidade de remoção

### Fotos do Relatório de Conclusão
- **Caminho:** `{serviceOrderId}/before/{filename}` e `{serviceOrderId}/after/{filename}`
- **Tipos:** antes e depois do serviço
- **Preview:** grid com remoção individual

### Avatar do Usuário
- **Bucket:** `avatars`
- **Caminho:** `{userId}/avatar.{ext}`
- **Limite:** máx. 2MB, apenas imagens
- **Upload:** com upsert (sobrescreve versão anterior)
- **Cache busting:** URL inclui `?t={timestamp}`

---

## 13. Realtime

O sistema utiliza **Supabase Realtime** (PostgreSQL Changes) para atualizar automaticamente:

- Lista de ordens de serviço
- Detalhe de OS individual
- Estatísticas do dashboard

**Canal:** `service-orders-changes`  
**Tabela monitorada:** `service_orders`  
**Eventos:** `INSERT`, `UPDATE`, `DELETE`  
**Ação:** Invalida queries do React Query (`service-orders`, `service-order`, `dashboard-stats`)

---

## 14. Segurança e RLS

### Row Level Security (RLS)
- Todas as tabelas possuem RLS habilitado
- Políticas filtram dados baseado no papel do usuário:
  - **Admin:** acesso total a todas as tabelas
  - **Imobiliária:** acesso apenas aos seus próprios imóveis e OS
  - **Técnico:** acesso apenas às OS designadas a ele

### Views de Segurança
- `service_orders_client` — Oculta custos internos (mão de obra, materiais, impostos, custo do técnico, forma de pagamento) das imobiliárias
- `service_order_items_client` — Oculta `real_cost` dos itens para imobiliárias

### Autenticação
- Apenas login por e-mail/senha
- Sem auto-cadastro — contas criadas exclusivamente pelo admin
- Edge Functions protegidas por verificação de papel admin
- Sessão gerenciada pelo Supabase Auth com listener de estado

---

## Anexo: Navegação por Papel

### Menu Lateral — Itens visíveis por papel

| Item do Menu | Admin | Imobiliária | Técnico |
|-------------|-------|-------------|---------|
| Dashboard | ✅ | ✅ | ✅ |
| Ordens de Serviço | ✅ | ✅ | ✅ |
| Novo Chamado | ✅ | ✅ | ❌ |
| Aprovar Orçamentos | ✅ | ❌ | ❌ |
| Meus Serviços | ❌ | ❌ | ✅ |
| Histórico Imóveis | ✅ | ✅ | ❌ |
| Imobiliárias | ✅ | ❌ | ❌ |
| Técnicos | ✅ | ❌ | ❌ |
| Gerenciar Usuários | ✅ | ❌ | ❌ |
| Relatórios | ✅ | ❌ | ❌ |
| Relatórios Finais | ✅ | ❌ | ❌ |
| Configurações | ✅ | ✅ | ✅ |

---

*Documento gerado em 25/02/2026 — Faz-Tudo Imobiliário v1.0*
