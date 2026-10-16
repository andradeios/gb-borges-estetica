-- GB BEAUTY: protege contra duas receitas automáticas para o mesmo agendamento.
-- Antes de criar o índice, verifique se já existem lançamentos duplicados:
-- SELECT appointment_id, COUNT(*) AS total
-- FROM public.financial_transactions
-- WHERE appointment_id IS NOT NULL AND type = 'receita'
-- GROUP BY appointment_id HAVING COUNT(*) > 1;
-- Se a consulta retornar linhas, revise manualmente os duplicados antes de continuar.

CREATE UNIQUE INDEX IF NOT EXISTS financial_transactions_one_revenue_per_appointment
ON public.financial_transactions (appointment_id)
WHERE appointment_id IS NOT NULL AND type = 'receita';
