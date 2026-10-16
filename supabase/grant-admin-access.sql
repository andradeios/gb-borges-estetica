-- GB BEAUTY: concede acesso administrativo a uma conta já cadastrada.
-- Execute no Supabase SQL Editor como proprietário do projeto.
-- A função só permite a concessão se quem chama for um Super Admin ativo.

CREATE OR REPLACE FUNCTION public.grant_admin_access(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'É necessário estar autenticado.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.active IS TRUE
      AND lower(replace(ur.role::text, ' ', '_')) IN ('super_admin', 'superadmin', 'owner', 'onwer')
  ) THEN
    RAISE EXCEPTION 'Somente um Super Admin ativo pode conceder acesso administrativo.';
  END IF;

  IF target_user_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = target_user_id
  ) THEN
    RAISE EXCEPTION 'Conta não encontrada. A pessoa precisa ter criado uma conta no site.';
  END IF;

  INSERT INTO public.user_roles (user_id, role, active, created_at)
  VALUES (target_user_id, 'super_admin', TRUE, now())
  ON CONFLICT (user_id)
  DO UPDATE SET role = 'super_admin', active = TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.grant_admin_access(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grant_admin_access(uuid) TO authenticated;

-- Remove o acesso administrativo sem excluir a conta do site.
-- Proteções: somente Super Admin ativo pode remover; não pode remover a si mesmo
-- nem desativar o último Super Admin ativo.
CREATE OR REPLACE FUNCTION public.revoke_admin_access(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  active_super_admins integer;
  target_role text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'É necessário estar autenticado.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.active IS TRUE
      AND lower(replace(ur.role::text, ' ', '_')) = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Somente um Super Admin ativo pode remover acesso administrativo.';
  END IF;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Conta inválida.';
  END IF;

  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Por segurança, não é possível remover seu próprio acesso. Entre com outra conta Super Admin.';
  END IF;

  SELECT lower(replace(role::text, ' ', '_'))
    INTO target_role
  FROM public.user_roles
  WHERE user_id = target_user_id AND active IS TRUE;

  IF target_role IS NULL THEN
    RAISE EXCEPTION 'Esta conta não possui acesso administrativo ativo.';
  END IF;

  IF target_role = 'super_admin' THEN
    SELECT count(*) INTO active_super_admins
    FROM public.user_roles
    WHERE active IS TRUE
      AND lower(replace(role::text, ' ', '_')) = 'super_admin';

    IF active_super_admins <= 1 THEN
      RAISE EXCEPTION 'Não é possível remover o último Super Admin ativo.';
    END IF;
  END IF;

  UPDATE public.user_roles
  SET active = FALSE
  WHERE user_id = target_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.revoke_admin_access(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revoke_admin_access(uuid) TO authenticated;
