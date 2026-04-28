## Melhorias na página Histórico por Endereço

Tudo aplicado num único arquivo: `src/pages/HistoricoImoveis.tsx` (+ uso do hook realtime já existente).

### 1. Atualização automática dos contadores (sem F5)
- Importar e chamar `useServiceOrdersRealtime()` (já existe em `src/hooks/useServiceOrders.ts`) dentro do componente.
- Isso invalida a query `service-orders` no React Query sempre que houver INSERT/UPDATE/DELETE em `service_orders`, fazendo contadores, chips e timeline se atualizarem sozinhos quando um orçamento for aprovado/enviado ou OS finalizada.

### 2. Busca dedicada por nome do solicitante
- Adicionar novo estado `requesterQuery` e um `Input` próprio (com ícone de usuário) ao lado da busca rápida atual.
- Filtrar `propertyOrders` adicionalmente por `requesterName` (case-insensitive, trim).
- Resetar `page` para 1 também quando `requesterQuery` mudar.
- Considerar o filtro no empty state ("nenhuma OS encontrada para este solicitante").

### 3. Tooltip nos contadores de status (qtd + faixa de datas mín–máx)
- Envolver os chips de status com `Tooltip` / `TooltipTrigger` / `TooltipContent` (já existe `src/components/ui/tooltip.tsx`) e um `TooltipProvider` no topo da página.
- Para cada status, calcular a partir de `ordersBeforeStatus` (que já respeita período + base de data + buscas):
  - quantidade
  - menor e maior data segundo o `dateField` selecionado
- Conteúdo do tooltip: "X OS · de dd/mm/aaaa até dd/mm/aaaa (base: <label do dateField>)". Se não houver datas, mostrar "Sem datas no período".
- O mesmo tooltip também é aplicado nas opções dentro do `Select` de status (resumo rápido ao abrir).

### Detalhes técnicos

```text
HistoricoImoveis
├─ useServiceOrdersRealtime()         ← novo
├─ estados: + requesterQuery
├─ filtros propertyOrders:
│    osNumber/problem/requesterName (busca rápida)
│    + requesterName (busca dedicada)
├─ statusStats[status] = { count, min, max }   ← novo memo
└─ UI:
     <TooltipProvider>
       Input "Buscar por solicitante"
       Chips status  ─ Tooltip(qtd + min–max)
       Select status ─ Tooltip por item
     </TooltipProvider>
```

Sem mudanças de schema, sem migrações, sem novos arquivos. Comportamento existente (filtros salvos, paginação, timeline) preservado.