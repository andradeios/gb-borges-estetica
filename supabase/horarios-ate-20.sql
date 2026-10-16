-- GB BEAUTY: horários disponíveis de segunda a sábado até 20:00.
-- Execute no Supabase SQL Editor.
-- Grade fixa: 09:00, 10:00, 11:00 ... 20:00.

CREATE OR REPLACE FUNCTION public.get_available_slots(
  p_service_id uuid,
  p_date date
)
RETURNS TABLE(slot_start timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH config AS (
    SELECT
      COALESCE((SELECT duration_minutes FROM public.services WHERE id = p_service_id), 60)::integer AS duration_minutes
  ),
  candidates AS (
    SELECT generate_series(
      (p_date::timestamp + time '09:00'),
      (p_date::timestamp + time '20:00'),
      interval '1 hour'
    ) AS local_start,
    config.duration_minutes
    FROM config
  )
  SELECT candidates.local_start AT TIME ZONE COALESCE((SELECT timezone FROM public.business_settings WHERE id = 1), 'America/Sao_Paulo') AS slot_start
  FROM candidates
  WHERE EXTRACT(DOW FROM candidates.local_start) <> 0
    AND candidates.local_start > (now() AT TIME ZONE COALESCE((SELECT timezone FROM public.business_settings WHERE id = 1), 'America/Sao_Paulo'))
    AND NOT EXISTS (
      SELECT 1
      FROM public.appointments a
      WHERE a.status NOT IN ('cancelado', 'nao_compareceu')
        AND a.start_time < (candidates.local_start + make_interval(mins => candidates.duration_minutes)) AT TIME ZONE COALESCE((SELECT timezone FROM public.business_settings WHERE id = 1), 'America/Sao_Paulo')
        AND a.end_time > candidates.local_start AT TIME ZONE COALESCE((SELECT timezone FROM public.business_settings WHERE id = 1), 'America/Sao_Paulo')
    )
  ORDER BY slot_start;
$$;

GRANT EXECUTE ON FUNCTION public.get_available_slots(uuid, date) TO authenticated;
