-- GB BEAUTY: corrigir permissões do painel para atualizar agendamentos.
-- Execute no Supabase > SQL Editor com a conta proprietária do projeto.
-- Mantém o controle de acesso por permissão; não libera alterações para clientes comuns.

GRANT SELECT, UPDATE ON TABLE public.appointments TO authenticated;

-- A política permite atualizar agendamentos apenas a usuários com agenda.manage.
-- A política de leitura dos clientes pode continuar existindo separadamente.
DROP POLICY IF EXISTS "admins_update_appointments" ON public.appointments;
CREATE POLICY "admins_update_appointments"
ON public.appointments
FOR UPDATE
TO authenticated
USING (public.has_permission('agenda.manage'))
WITH CHECK (public.has_permission('agenda.manage'));
