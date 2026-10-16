-- GB BEAUTY: catálogo oficial de procedimentos e manutenções
-- Execute no Supabase SQL Editor. Não apaga histórico de agendamentos.
DO $$
DECLARE
  v_category uuid;
  v_service_id uuid;
  r record;
  t record;
  v_name text;
  v_kind text;
  v_price numeric;
  v_sort int;
  v_duration int;
  v_aliases text[];
BEGIN
  SELECT id INTO v_category
  FROM public.service_categories
  WHERE active IS TRUE
  ORDER BY sort_order NULLS LAST
  LIMIT 1;

  IF v_category IS NULL THEN
    RAISE EXCEPTION 'Nenhuma categoria ativa encontrada em service_categories. Crie/ative uma categoria antes de executar este SQL.';
  END IF;

  -- Procedimentos completos
  FOR r IN SELECT * FROM (VALUES
    ('Volume Brasileiro',170::numeric,1),
    ('Volume Egípcio',180::numeric,2),
    ('Volume Fox Eyes',180::numeric,3),
    ('Volume Egípcio Marrom',180::numeric,4),
    ('Volume Capping',220::numeric,5),
    ('Volume Mega Brasileiro',215::numeric,6),
    ('Volume Capping Luxury',210::numeric,7),
    ('Volume Mega Luxury',200::numeric,8)
  ) AS x(name,price,sort_order)
  LOOP
    SELECT id INTO v_service_id FROM public.services
      WHERE lower(trim(name)) = lower(r.name) AND coalesce(kind,'procedimento') <> 'manutencao'
      ORDER BY sort_order NULLS LAST LIMIT 1;

    IF v_service_id IS NULL THEN
      INSERT INTO public.services(name, description, price, duration_minutes, image_path, active, sort_order, category_id, kind)
      VALUES (r.name, 'Aplicação completa de extensão de cílios.', r.price, 120, NULL, TRUE, r.sort_order, v_category, 'procedimento')
      RETURNING id INTO v_service_id;
    ELSE
      UPDATE public.services SET name=r.name, price=r.price, kind='procedimento', active=TRUE,
        sort_order=r.sort_order, updated_at=now() WHERE id=v_service_id;
    END IF;
    v_service_id := NULL;
  END LOOP;

  -- Manutenções: preço principal é o menor preço da tabela; faixas detalhadas ficam em service_price_tiers.
  FOR r IN SELECT * FROM (VALUES
    ('Manutenção Brasileiro',90::numeric,20,101,ARRAY['manutencao brasileiro','manutenção brasileiro','manutenção volume brasileiro','manutencao volume brasileiro']::text[]),
    ('Manutenção Egípcio',95::numeric,20,102,ARRAY['manutencao egipcio','manutenção egípcio','manutenção volume egípcio','manutencao volume egipcio']::text[]),
    ('Manutenção Fox Eyes',100::numeric,20,103,ARRAY['manutencao fox eyes','manutenção fox eyes','manutenção volume fox eyes']::text[]),
    ('Manutenção Egípcio Marrom',100::numeric,20,104,ARRAY['manutencao egipcio marrom','manutenção egípcio marrom','manutenção volume egípcio marrom']::text[]),
    ('Manutenção Capping',125::numeric,20,105,ARRAY['manutencao capping','manutenção capping','manutenção volume capping']::text[]),
    ('Manutenção Mega Brasileiro',120::numeric,20,106,ARRAY['manutencao mega brasileiro','manutenção mega brasileiro','manutenção volume mega brasileiro']::text[]),
    ('Manutenção Capping Luxury',115::numeric,20,107,ARRAY['manutencao capping luxury','manutenção capping luxury','manutenção volume capping luxury']::text[]),
    ('Manutenção Mega Luxury',110::numeric,20,108,ARRAY['manutencao mega luxury','manutenção mega luxury','manutenção volume mega luxury']::text[])
  ) AS x(name,price,duration_minutes,sort_order,aliases)
  LOOP
    SELECT id INTO v_service_id FROM public.services
      WHERE lower(trim(name)) = ANY (r.aliases)
      ORDER BY CASE WHEN lower(trim(name)) = lower(r.name) THEN 0 ELSE 1 END, sort_order NULLS LAST
      LIMIT 1;

    IF v_service_id IS NULL THEN
      INSERT INTO public.services(name, description, price, duration_minutes, image_path, active, sort_order, category_id, kind)
      VALUES (r.name, 'Manutenção conforme o tempo desde a última aplicação. Escolha a faixa de dias no agendamento.', r.price, r.duration_minutes, NULL, TRUE, r.sort_order, v_category, 'manutencao')
      RETURNING id INTO v_service_id;
    ELSE
      UPDATE public.services SET name=r.name, price=r.price, kind='manutencao', active=TRUE,
        sort_order=r.sort_order, description='Manutenção conforme o tempo desde a última aplicação. Escolha a faixa de dias no agendamento.', updated_at=now()
      WHERE id=v_service_id;
    END IF;

    -- Remove faixas antigas somente se não estiverem ligadas a agendamentos existentes.
    DELETE FROM public.service_price_tiers old
    WHERE old.service_id=v_service_id
      AND NOT EXISTS (
        SELECT 1 FROM public.appointments a
        WHERE a.price_tier_id=old.id
      );

    -- Faixas específicas de cada manutenção
    FOR t IN
      SELECT * FROM (VALUES
        ('15 dias',90::numeric,1),('20 dias',95::numeric,2),('Até 25 dias',105::numeric,3)
      ) z(label,price,sort_order) WHERE r.name='Manutenção Brasileiro'
      UNION ALL SELECT * FROM (VALUES ('15 dias',95::numeric,1),('20 dias',105::numeric,2),('Até 25 dias',110::numeric,3)) z(label,price,sort_order) WHERE r.name='Manutenção Egípcio'
      UNION ALL SELECT * FROM (VALUES ('15 dias',100::numeric,1),('20 dias',105::numeric,2),('Até 25 dias',110::numeric,3)) z(label,price,sort_order) WHERE r.name='Manutenção Fox Eyes'
      UNION ALL SELECT * FROM (VALUES ('15 dias',100::numeric,1),('20 dias',105::numeric,2),('Até 25 dias',110::numeric,3)) z(label,price,sort_order) WHERE r.name='Manutenção Egípcio Marrom'
      UNION ALL SELECT * FROM (VALUES ('Até 25 dias',125::numeric,1),('Até 40 dias',135::numeric,2)) z(label,price,sort_order) WHERE r.name='Manutenção Capping'
      UNION ALL SELECT * FROM (VALUES ('Até 25 dias',120::numeric,1),('Até 40 dias',130::numeric,2)) z(label,price,sort_order) WHERE r.name='Manutenção Mega Brasileiro'
      UNION ALL SELECT * FROM (VALUES ('Até 20 dias',115::numeric,1),('Até 30 dias',125::numeric,2)) z(label,price,sort_order) WHERE r.name='Manutenção Capping Luxury'
      UNION ALL SELECT * FROM (VALUES ('Até 20 dias',110::numeric,1),('Até 30 dias',120::numeric,2)) z(label,price,sort_order) WHERE r.name='Manutenção Mega Luxury'
    LOOP
      UPDATE public.service_price_tiers SET price=t.price, sort_order=t.sort_order
      WHERE service_id=v_service_id AND lower(trim(label))=lower(t.label);
      IF NOT FOUND THEN
        INSERT INTO public.service_price_tiers(service_id,label,price,sort_order)
        VALUES(v_service_id,t.label,t.price,t.sort_order);
      END IF;
    END LOOP;

    v_service_id := NULL;
  END LOOP;
END $$;

-- Conferência do catálogo depois da execução
SELECT s.name, s.price, s.kind, s.active, t.label AS faixa_manutencao, t.price AS preco_faixa
FROM public.services s
LEFT JOIN public.service_price_tiers t ON t.service_id=s.id
WHERE s.name ILIKE 'Volume %' OR s.name ILIKE 'Manutenção %'
ORDER BY s.sort_order, t.sort_order;

-- Fotos locais do catálogo. O site também possui o mesmo fallback em src/lib/siteData.ts.
UPDATE public.services
SET image_path = CASE lower(trim(name))
  WHEN 'volume brasileiro' THEN '/assets/servicos/volume-brasileiro.webp'
  WHEN 'volume egípcio' THEN '/assets/servicos/volume-egipcio.webp'
  WHEN 'volume fox eyes' THEN '/assets/servicos/volume-fox-eyes.webp'
  WHEN 'volume egípcio marrom' THEN '/assets/servicos/volume-egipcio-marrom.webp'
  WHEN 'volume capping' THEN '/assets/servicos/volume-capping.webp'
  WHEN 'volume mega brasileiro' THEN '/assets/servicos/volume-mega-brasileiro.webp'
  WHEN 'volume capping luxury' THEN '/assets/servicos/volume-capping-luxury.webp'
  WHEN 'volume mega luxury' THEN '/assets/servicos/volume-capping-luxury.webp'
  WHEN 'manutenção brasileiro' THEN '/assets/servicos/volume-brasileiro.webp'
  WHEN 'manutenção egípcio' THEN '/assets/servicos/volume-egipcio.webp'
  WHEN 'manutenção fox eyes' THEN '/assets/servicos/volume-fox-eyes.webp'
  WHEN 'manutenção egípcio marrom' THEN '/assets/servicos/volume-egipcio-marrom.webp'
  WHEN 'manutenção capping' THEN '/assets/servicos/volume-capping.webp'
  WHEN 'manutenção mega brasileiro' THEN '/assets/servicos/volume-mega-brasileiro.webp'
  WHEN 'manutenção capping luxury' THEN '/assets/servicos/volume-capping-luxury.webp'
  WHEN 'manutenção mega luxury' THEN '/assets/servicos/volume-capping-luxury.webp'
  ELSE image_path
END
WHERE name ILIKE 'Volume %' OR name ILIKE 'Manutenção %';
