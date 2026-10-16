-- GB BEAUTY: oferta de manutenção após agendamento de um volume
-- Execute no Supabase SQL Editor antes de publicar a nova versão do site.
-- Descontos permitidos: R$ 10,00 ou R$ 15,00.

ALTER TABLE public.appointments
  ALTER COLUMN service_id DROP NOT NULL;

ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_service_id_fkey;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_service_id_fkey
  FOREIGN KEY (service_id)
  REFERENCES public.services(id)
  ON DELETE SET NULL;

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS service_name_snapshot text;

UPDATE public.appointments a
SET service_name_snapshot = s.name
FROM public.services s
WHERE a.service_id = s.id
  AND NULLIF(TRIM(a.service_name_snapshot), '') IS NULL;

CREATE OR REPLACE FUNCTION public.create_appointment_offer(
  p_service_id uuid,
  p_start timestamptz,
  p_tier_id uuid,
  p_discount numeric,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id uuid := auth.uid();
  v_service public.services%ROWTYPE;
  v_tier public.service_price_tiers%ROWTYPE;
  v_price numeric;
  v_duration integer;
  v_appointment_id uuid;
BEGIN
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'É necessário estar logada para reservar a oferta.';
  END IF;

  IF p_discount NOT IN (10, 15) THEN
    RAISE EXCEPTION 'Desconto promocional inválido.';
  END IF;

  SELECT * INTO v_service
  FROM public.services
  WHERE id = p_service_id AND active IS TRUE AND coalesce(kind, 'procedimento') = 'manutencao';

  IF v_service.id IS NULL THEN
    RAISE EXCEPTION 'Serviço de manutenção indisponível.';
  END IF;

  SELECT * INTO v_tier
  FROM public.service_price_tiers
  WHERE id = p_tier_id AND service_id = p_service_id;

  IF v_tier.id IS NULL THEN
    RAISE EXCEPTION 'Faixa de manutenção inválida.';
  END IF;

  v_price := greatest(0, v_tier.price - p_discount);
  v_duration := greatest(coalesce(v_service.duration_minutes, 60), 5);

  INSERT INTO public.appointments (
    client_id,
    service_id,
    price_tier_id,
    start_time,
    end_time,
    price,
    status,
    notes
  )
  VALUES (
    v_client_id,
    p_service_id,
    p_tier_id,
    p_start,
    p_start + make_interval(mins => v_duration),
    v_price,
    'pendente',
    concat_ws(E'\n', p_notes, 'Oferta de manutenção aplicada: R$ ', to_char(p_discount, 'FM999990D00'))
  )
  RETURNING id INTO v_appointment_id;

  RETURN v_appointment_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_appointment_offer(uuid, timestamptz, uuid, numeric, text) TO authenticated;
