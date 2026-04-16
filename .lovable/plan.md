
Objetivo: parar o falso erro “demorou demais” ao abrir chamado e fazer o envio concluir de forma confiável.

O que eu já identifiquei:
- O problema principal não é “falta de ideia”; é um bug de fluxo.
- Em `src/pages/NovoChamado.tsx`, o envio ainda usa `withTimeout(...)` em 3 pontos críticos:
  1. cadastro do imóvel
  2. upload das fotos
  3. criação da OS
- Esse timeout só rejeita no frontend; ele não cancela a operação real no Supabase.
- Resultado: o usuário recebe erro (“cadastro do imóvel demorou demais” / “erro ao abrir chamado”), mas a operação pode continuar no backend. Isso explica o comportamento de “funcionou e depois parou”, sensação de lentidão e risco de duplicidade.
- Em `useCreateProperty` e `useCreateServiceOrder` também há `retry`, o que é ruim para INSERT crítico porque pode repetir a operação quando a rede oscila.
- O console mostra warnings de `ref` em `NovoChamado`, que não parecem ser a causa do erro principal, mas eu também vou limpar para reduzir ruído.

Do I know what the issue is?
- Sim. O erro mais provável e mais impactante é timeout falso no cliente durante operações de escrita.

Plano de correção:
1. Corrigir o fluxo de envio do chamado
- Remover `withTimeout` do cadastro de imóvel e da criação da OS em `NovoChamado.tsx`.
- Manter a operação aguardando a resposta real do Supabase.
- Transformar o envio em etapas explícitas: “cadastrando imóvel”, “enviando fotos”, “abrindo chamado”.

2. Evitar erro falso e duplicidade
- Remover `retry` automático de mutations de INSERT em:
  - `src/hooks/useProperties.ts`
  - `src/hooks/useServiceOrders.ts`
- Travar duplo clique com guarda local mais rígida no submit.
- Garantir que o botão fique realmente bloqueado durante todo o processo.

3. Ajustar o tratamento das fotos sem quebrar a abertura
- Manter fotos como etapa tolerante: se falhar upload, mostrar aviso claro e ainda permitir abrir a OS sem fotos.
- Mas sem usar timeout artificial que mata a UX.
- Se houver upload parcial, informar exatamente o que aconteceu.

4. Melhorar feedback para o usuário
- Substituir toast genérico por mensagens de etapa:
  - “Cadastrando imóvel...”
  - “Enviando fotos...”
  - “Abrindo chamado...”
- Mostrar erro real do Supabase quando existir, em vez de “demorou demais” genérico.
- Só navegar para a tela da OS depois da confirmação real de criação.

5. Limpar código que hoje atrapalha o diagnóstico
- Remover imports/constantes de timeout não usados ou perigosos.
- Revisar warning de `ref` no formulário de `NovoChamado` para evitar ruído no console.
- Validar se `formRef` é mesmo necessário; se não for, remover.

6. Verificação final depois da implementação
- Testar o cenário principal da imobiliária:
  - imóvel novo sem foto
  - imóvel novo com 1-3 fotos
  - imóvel já cadastrado
- Confirmar que:
  - não aparece mais “demorou demais” falso
  - não cria OS duplicada
  - a navegação vai para a OS criada
  - o botão não permite reenvio acidental

Detalhes técnicos:
- Arquivos principais:
  - `src/pages/NovoChamado.tsx`
  - `src/hooks/useProperties.ts`
  - `src/hooks/useServiceOrders.ts`
  - possivelmente `src/hooks/useFileUpload.ts`
- Mudança principal:
```text
ANTES:
frontend corre contra Promise.race / withTimeout
-> UI acusa erro
-> Supabase pode continuar processando

DEPOIS:
frontend aguarda resposta real
-> mostra etapa atual
-> só erra quando houver erro real
-> sem retry em insert crítico
```

Resultado esperado:
- A imobiliária consegue emitir chamado sem ficar presa nesse erro intermitente.
- O sistema para de “parecer lento” por timeout artificial.
- O fluxo fica confiável e previsível, sem você precisar voltar aqui por esse mesmo problema.
