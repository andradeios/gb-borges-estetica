# Atualização do painel administrativo GB BEAUTY

## O que mudou
- O Dashboard agora apresenta faturamento pago de hoje e do mês atual.
- O Dashboard mostra rankings dos serviços mais vendidos e clientes com maior valor acumulado, calculados a partir dos agendamentos concluídos.
- O Financeiro tem seletor de período (hoje, mês atual e todo o período) para o indicador de faturamento.
- Configurações foi retirada da navegação principal; o código e a tabela `business_settings` foram preservados.
- Ao concluir um atendimento, o sistema registra a receita automaticamente como paga, vinculada ao agendamento, e tenta reutilizar um lançamento existente para não duplicar.

## Proteção recomendada no Supabase
No SQL Editor do Supabase, primeiro execute a consulta de auditoria comentada em `supabase/financeiro-atendimentos.sql`. Se houver duplicados, revise-os manualmente. Depois execute o `CREATE UNIQUE INDEX` do arquivo para que o banco também impeça duas receitas vinculadas ao mesmo agendamento.

## Rodar localmente
1. Mantenha o arquivo `.env.local` com os valores do seu projeto Supabase.
2. Execute `npm install`.
3. Execute `npm run dev` para desenvolvimento ou `npm run build` para verificar a build.

A build completa não pôde ser confirmada neste ambiente porque a instalação de dependências ficou incompleta por timeout. Portanto, valide `npm run build` no computador antes de publicar.
