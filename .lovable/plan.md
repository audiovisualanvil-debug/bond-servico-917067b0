
# Plano: Relatorios Finais - Todas as OS para o Admin

## Problema Atual

A pagina "Relatorios Finais" (`/relatorios-finais`) filtra apenas ordens com status `concluido` que possuem um `completionReport`. Isso faz com que o admin nao veja as OS que passaram pelo fluxo (imobiliaria criou, tecnico orcou, admin enviou, imobiliaria aprovou/rejeitou) mas que ainda nao foram finalizadas com relatorio de conclusao.

O admin precisa de uma visao centralizada de **todas** as OS do sistema, independente do status.

## Solucao

Alterar a pagina `RelatoriosFinais.tsx` para:

1. **Buscar TODAS as OS** (sem filtro de status `concluido`) - o admin ja tem permissao RLS para ver todas
2. **Remover o filtro** que exige `completionReport`
3. **Adicionar filtro por status** para o admin poder navegar entre os diferentes estados
4. **Mostrar informacoes relevantes** de cada OS: numero, endereco, imobiliaria, tecnico, status atual, data de criacao, valor final (quando houver)
5. **Manter os botoes** de "Ver Relatorio" (quando houver completion report) e "Detalhe da OS"

## Detalhes Tecnicos

### Arquivo: `src/pages/RelatoriosFinais.tsx`

- Trocar `useServiceOrders('concluido')` por `useServiceOrders(statusFilter)` com um state para filtro de status
- Remover a linha `const completedWithReport = orders.filter(o => o.completionReport)`
- Listar todas as ordens retornadas, com filtro de busca textual e filtro de status (dropdown)
- Mostrar o botao "Ver Relatorio" condicionalmente apenas quando `order.completionReport` existir
- Adicionar coluna/info de status em cada card
- Adicionar um `Select` com os status disponiveis (similar ao que ja existe em `OrdensServico.tsx`)

### Nenhuma alteracao de banco de dados necessaria
As politicas RLS do admin ja permitem ver todas as OS (`has_role(auth.uid(), 'admin')`).
