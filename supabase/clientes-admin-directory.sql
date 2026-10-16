-- Diretório de clientes para o painel administrativo.
-- Execute no Supabase SQL Editor usando uma conta proprietária.
-- A função só retorna dados a usuários com papel super_admin/proprietaria
-- ou permissão agenda.view. Não expõe a lista publicamente.

CREATE OR REPLACE FUNCTION public.admin_client_directory()
RETURNS TABLE (
  client_id uuid,
  full_name text,
  email text,
  phone text,
  created_at timestamptz,
  appointment_id uuid,
  service_id uuid,
  service_name text,
  start_time timestamptz,
  price numeric,
  status text,
  notes text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('super_admin', 'proprietaria')
    )
    OR public.has_permission('agenda.view')
  ) THEN
    RAISE EXCEPTION 'Acesso negado ao diretório de clientes' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH client_ids AS (
    SELECT p.id AS id FROM public.profiles p
    UNION
    SELECT a.client_id AS id FROM public.appointments a WHERE a.client_id IS NOT NULL
  )
  SELECT
    ci.id AS client_id,
    COALESCE(p.full_name, 'Cliente')::text AS full_name,
    p.email::text AS email,
    p.phone::text AS phone,
    p.created_at,
    a.id AS appointment_id,
    a.service_id,
    COALESCE(s.name, 'Serviço')::text AS service_name,
    a.start_time,
    COALESCE(a.price, 0)::numeric AS price,
    a.status::text AS status,
    a.notes::text AS notes
  FROM client_ids ci
  LEFT JOIN public.profiles p ON p.id = ci.id
  LEFT JOIN public.user_roles ur ON ur.user_id = ci.id
  LEFT JOIN public.appointments a ON a.client_id = ci.id
  LEFT JOIN public.services s ON s.id = a.service_id
  WHERE ur.user_id IS NULL
  ORDER BY p.full_name NULLS LAST, a.start_time DESC NULLS LAST;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_client_directory() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_client_directory() TO authenticated;
