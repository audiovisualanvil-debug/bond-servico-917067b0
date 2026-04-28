## Você está certo — parei de fatiar

Vou te entregar tudo isso numa rodada só. Mas antes preciso te mostrar uma coisa importante: **a maior parte dessa lista já existe no projeto.** Se eu sair "implementando" do zero, vou te entregar duplicado e quebrado. Auditei agora arquivo por arquivo:

### Status real (auditoria do código atual)

| Pedido | Já existe? | Onde |
|---|---|---|
| Upload de fotos na abertura da OS (validação tipo/tamanho/limite + preview) | **Sim, completo** | `src/pages/NovoChamado.tsx` (linhas 280-309) — JPG/PNG/WebP, 5MB, max 5 fotos, bucket `os-photos` |
| Upload antes/depois na finalização | **Sim, completo** | `src/components/CompletionReportForm.tsx` — preview, remoção, upload via `useFileUpload` |
| Histórico por imóvel (clica no endereço, vê todas as OS + relatórios) | **Sim, completo** | `src/pages/HistoricoImoveis.tsx` — busca, lista, timeline com link para relatório |
| PDF do relatório final (dados imóvel, execução, checklist, fotos antes/depois, assinatura) | **Sim, completo** | `src/pages/RelatorioOS.tsx` — html2pdf, garantia, layout A4 |
| PDF de orçamento | **Sim, completo** | `src/pages/OrcamentoPDF.tsx` |
| Status automáticos (aguardando orçamento → aprovação → aprovado) | **Sim, completo** | enum `os_status`, triggers `restrict_tecnico_update` / `restrict_imobiliaria_update`, fluxo em `OSActionSections.tsx` |
| E-mail transacional ao aprovar orçamento | **Sim** | edge function `send-budget-approved` |
| E-mail ao mudar status | **Sim** | edge function `notify-status-change` |
| Tela de OS por tipo de usuário | **Sim** | `OrdensServico.tsx` (imobiliária/dono/admin) + `MeusServicos.tsx` (técnico) com filtros e abas por status |

### Lacunas reais que valem implementar

Olhando o que **falta de verdade** (não o que você pediu, mas o que está incompleto), vejo só estas pontas soltas:

1. **PDF do relatório final não tem layout "estilo Vita Vistorias"** — hoje usa o layout genérico do orçamento. Se tu quer o visual específico (cabeçalho com bloco de dados do imóvel em grid, checklist tipo vistoria com ✓/✗, grid antes/depois lado a lado em moldura), preciso reformatar `RelatorioOS.tsx`.

2. **Validação de fotos no `CompletionReportForm`** — diferente de `NovoChamado`, o formulário de finalização **não valida tipo/tamanho/limite** antes de subir (linha 50-61 chama `uploadFiles` direto). Vou portar a mesma validação (JPG/PNG/WebP, 5MB, máx 10 antes + 10 depois).

3. **Preview imediato antes do upload terminar** — hoje o preview só aparece depois que o Storage devolve a URL. Vou usar `URL.createObjectURL` para mostrar instantâneo + estado "enviando…" por foto.

4. **E-mail "orçamento enviado para aprovação"** — existe envio quando admin aprova, mas **não há e-mail para a imobiliária quando o orçamento chega para ela aprovar** (status `enviado_imobiliaria`). Vou adicionar este disparo dentro de `notify-status-change`.

5. **OrdensServico para técnico** — hoje técnico é redirecionado para `MeusServicos`. Já está correto, só vou confirmar que o link na sidebar respeita o role.

### O que vou fazer (uma rodada, sem perguntar mais nada)

1. Reformatar `src/pages/RelatorioOS.tsx` com layout Vita Vistorias (cabeçalho com logo + nº OS + data, bloco "Dados do Imóvel" em 2 colunas, "Execução do Serviço" com texto corrido, "Checklist" com ✓/✗ coloridos, "Registro Fotográfico" em grid antes×depois pareado, assinatura com linha, rodapé com garantia).
2. Adicionar validação de fotos em `CompletionReportForm.tsx` (mesmas regras de `NovoChamado`) + preview otimista com `URL.createObjectURL` + indicador de upload por foto.
3. Estender `supabase/functions/notify-status-change/index.ts` para disparar e-mail à imobiliária quando status vira `enviado_imobiliaria` (orçamento aguardando aprovação dela), incluindo link direto para a OS e valor.
4. Auditoria final: rodar `bun run build` para garantir que nada quebrou.

### O que NÃO vou refazer (e por quê)

- Upload na abertura da OS — já está pronto e funcionando.
- Histórico por imóvel — já está pronto, com timeline e link para relatório.
- Tela de OS por usuário — já existe `OrdensServico` (imobiliária/admin) e `MeusServicos` (técnico) com filtros por status.
- Geração de PDF — a infra `html2pdf.js` já está montada; só vou trocar o layout do relatório.
- Fluxo de status — o enum, as triggers de proteção e as transições já existem no banco e nas ações.

Se você aprovar, eu executo os 4 pontos acima de uma vez só, sem voltar para perguntar.
