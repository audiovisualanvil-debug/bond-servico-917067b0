# Fechar o fluxo de criação de usuário CPF

Já implementamos: timeout de 30s, mensagens de erro específicas, botão "Tentar novamente", validação/normalização de e-mail e CPF/CNPJ, log no painel de auditoria, status visual em background. Falta o que torna o fluxo realmente robusto e auto-explicativo.

## O que será feito

### 1. Máscara automática nos campos CPF/CNPJ e telefone
- Aplicar formatação ao digitar (ex.: `123.456.789-01`, `(11) 99999-9999`).
- Mantém entrada limpa e evita o usuário "errar" digitando sem máscara.
- Feito no `GerenciarUsuarios.tsx` usando os helpers de `validators.ts`.

### 2. Cancelar requisição travada (AbortController)
- Hoje o timeout só "ignora" a Promise — a chamada continua rodando no background.
- Adicionar `AbortController` para realmente cortar a chamada na rede ao expirar 30s ou ao clicar em "Tentar novamente".

### 3. Retry automático com backoff em falha de rede
- Em `network` / `network_exception`, tentar 1 retry automático após 2s antes de mostrar o botão manual.
- Apenas para falhas de conexão — nunca para `email_already_in_use` ou erros de validação.

### 4. Limpar status "processando" órfão ao trocar de aba/página
- Se o admin clica em outra aba durante a criação, o status fica preso.
- Resetar `createStatus` ao desmontar o componente e ao navegar.

### 5. Health-check da função `create-user` (banner de status)
- Antes de habilitar o botão, fazer um ping leve (`OPTIONS`) na função.
- Se falhar, exibir um banner amarelo no topo do card: "Serviço de criação de usuários indisponível. Verifique a conexão."
- Re-checa a cada 30s.

### 6. Atalho para ver os últimos logs de erro
- Adicionar um link "Ver últimos erros" no cartão de status quando ocorrer falha — abre `/log-auditoria` filtrado por `create_user_error`.

### 7. Suporte a `LogAuditoria` filtrado por query string
- `LogAuditoria.tsx` passa a aceitar `?action=create_user_error` para filtrar automaticamente ao abrir.

### 8. Testes
- Atualizar `validators.test.ts` (criar se não existir) com casos de CPF válido, sequência repetida, dígitos verificadores errados, máscara/sem máscara, e-mail com espaços/maiúsculas.
- Smoke test do fluxo: render do form, submit com CPF inválido → toast, submit válido com mock da edge → status sucesso.

## Detalhes técnicos

- **Arquivos editados**: `src/pages/GerenciarUsuarios.tsx`, `src/pages/LogAuditoria.tsx`, `src/lib/validators.ts`.
- **Arquivos novos**: `src/lib/validators.test.ts`, `src/pages/GerenciarUsuarios.create-user.test.tsx`, `src/components/admin/CreateUserHealthBanner.tsx`.
- **Backend**: nenhuma migração SQL nem nova edge function; reaproveitamos `create-user` e `log-audit`.
- **AbortController**: passado via `supabase.functions.invoke('create-user', { body, ... })` — fallback para `fetch` direto caso o SDK não propague o sinal (verificar versão `2.103.3`).
- **Health-check**: `fetch(<functions_url>/create-user, { method: 'OPTIONS' })` — leve, não consome CPU da função.

## O que NÃO entra agora (para manter simples)

- Fila assíncrona / job processing — desnecessário para ferramenta interna.
- Edição em massa de usuários.
- Importação CSV.

Aprovando este plano, executo tudo de uma vez.
