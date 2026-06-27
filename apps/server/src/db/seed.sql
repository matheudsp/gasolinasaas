BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_martinez_admin_id text;
  v_rede_admin_id text;

  v_group_martinez_id text;
  v_rede_nordeste_id text;

  v_gasolina_comum_id text;
  v_gasolina_aditivada_id text;
  v_etanol_id text;
  v_diesel_s10_id text;
  v_diesel_s500_id text;
  v_gnv_id text;

  v_station_id text;
  v_sf_id text;
BEGIN

  SELECT id INTO v_martinez_admin_id
  FROM "user" WHERE email = 'admin@martinezposto.com' LIMIT 1;

  IF v_martinez_admin_id IS NULL THEN
    RAISE EXCEPTION 'Usuário admin@martinezposto.com não encontrado na tabela "user"';
  END IF;

  SELECT id INTO v_rede_admin_id
  FROM "user" WHERE email = 'admin@redenordeste.com' LIMIT 1;

  IF v_rede_admin_id IS NULL THEN
    RAISE EXCEPTION 'Usuário admin@redenordeste.com não encontrado na tabela "user"';
  END IF;

  -- =========================================================
  -- Fuels
  -- =========================================================
  INSERT INTO fuel (id, name, slug, created_at, updated_at)
  VALUES
    (gen_random_uuid()::text, 'Gasolina Comum',     'gasolina-comum',     NOW(), NOW()),
    (gen_random_uuid()::text, 'Gasolina Aditivada', 'gasolina-aditivada', NOW(), NOW()),
    (gen_random_uuid()::text, 'Etanol',             'etanol',             NOW(), NOW()),
    (gen_random_uuid()::text, 'Diesel S-10',        'diesel-s10',         NOW(), NOW()),
    (gen_random_uuid()::text, 'Diesel S-500',       'diesel-s500',        NOW(), NOW()),
    (gen_random_uuid()::text, 'GNV',                'gnv',                NOW(), NOW())
  ON CONFLICT (slug) DO NOTHING;

  SELECT id INTO v_gasolina_comum_id     FROM fuel WHERE slug = 'gasolina-comum'     LIMIT 1;
  SELECT id INTO v_gasolina_aditivada_id FROM fuel WHERE slug = 'gasolina-aditivada' LIMIT 1;
  SELECT id INTO v_etanol_id             FROM fuel WHERE slug = 'etanol'             LIMIT 1;
  SELECT id INTO v_diesel_s10_id         FROM fuel WHERE slug = 'diesel-s10'         LIMIT 1;
  SELECT id INTO v_diesel_s500_id        FROM fuel WHERE slug = 'diesel-s500'        LIMIT 1;
  SELECT id INTO v_gnv_id                FROM fuel WHERE slug = 'gnv'                LIMIT 1;

  -- =========================================================
  -- Tenants
  -- =========================================================
  INSERT INTO tenant (id, slug, name, created_at, updated_at)
  VALUES
    (gen_random_uuid()::text, 'grupo-martinez', 'Grupo Martinez',              NOW() - INTERVAL '85 days', NOW() - INTERVAL '85 days'),
    (gen_random_uuid()::text, 'rede-nordeste',  'Rede Nordeste Combustíveis',  NOW() - INTERVAL '55 days', NOW() - INTERVAL '55 days')
  ON CONFLICT (slug) DO NOTHING;

  SELECT id INTO v_group_martinez_id FROM tenant WHERE slug = 'grupo-martinez' LIMIT 1;
  SELECT id INTO v_rede_nordeste_id  FROM tenant WHERE slug = 'rede-nordeste'  LIMIT 1;

  -- Cada admin gerencia apenas sua rede
  INSERT INTO tenant_membership (id, tenant_id, user_id, role, created_at, updated_at)
  VALUES
    (gen_random_uuid()::text, v_group_martinez_id, v_martinez_admin_id, 'owner', NOW(), NOW()),
    (gen_random_uuid()::text, v_rede_nordeste_id,  v_rede_admin_id,     'owner', NOW(), NOW())
  ON CONFLICT DO NOTHING;

  -- =========================================================
  -- Stations
  -- Nota: sem unique constraint em "name" no schema — use apenas em execução inicial.
  -- =========================================================
  INSERT INTO station (
    id, name, tenant_id, address, city, latitude, longitude, is_active,
    wifi, accessibility, convenience_store, restaurant, electric_charging,
    car_wash, open24h, tire_pressure, bathroom, created_at, updated_at
  )
  VALUES
    (
      gen_random_uuid()::text, 'Posto Martinez - Centro', v_group_martinez_id,
      'Av. Frei Serafim, 1234', 'Teresina', -5.0919, -42.8034, TRUE,
      TRUE,  TRUE,  TRUE,  FALSE, FALSE,
      TRUE,  TRUE,  TRUE,  TRUE,
      NOW() - INTERVAL '70 days', NOW() - INTERVAL '3 days'
    ),
    (
      gen_random_uuid()::text, 'Posto Martinez - Floriano', v_group_martinez_id,
      'Rua Desembargador Freitas, 567', 'Floriano', -6.7672, -43.0236, TRUE,
      FALSE, TRUE,  TRUE,  TRUE,  FALSE,
      FALSE, FALSE, TRUE,  TRUE,
      NOW() - INTERVAL '65 days', NOW() - INTERVAL '8 days'
    ),
    (
      gen_random_uuid()::text, 'Posto Martinez - Picos', v_group_martinez_id,
      'Av. Joca Vieira, 890', 'Picos', -7.0769, -41.4672, TRUE,
      TRUE,  FALSE, TRUE,  FALSE, TRUE,
      TRUE,  FALSE, TRUE,  TRUE,
      NOW() - INTERVAL '55 days', NOW() - INTERVAL '1 day'
    ),
    (
      gen_random_uuid()::text, 'Nordeste - Parnaíba', v_rede_nordeste_id,
      'Av. São Sebastião, 2100', 'Parnaíba', -2.9054, -41.7769, TRUE,
      TRUE,  TRUE,  FALSE, FALSE, FALSE,
      FALSE, TRUE,  TRUE,  TRUE,
      NOW() - INTERVAL '45 days', NOW() - INTERVAL '2 days'
    ),
    (
      gen_random_uuid()::text, 'Nordeste - Teresina Leste', v_rede_nordeste_id,
      'Av. João XXIII, 3300', 'Teresina', -5.0819, -42.78, FALSE,
      FALSE, FALSE, FALSE, FALSE, FALSE,
      FALSE, FALSE, FALSE, FALSE,
      NOW() - INTERVAL '40 days', NOW() - INTERVAL '15 days'
    )
  ON CONFLICT DO NOTHING;

  -- =========================================================
  -- Station Fuel + Price History
  -- =========================================================

  -- ── Posto Martinez - Centro ──────────────────────────────
  SELECT id INTO v_station_id FROM station WHERE name = 'Posto Martinez - Centro' LIMIT 1;

  INSERT INTO station_fuel (id, station_id, fuel_id, current_price, is_available, created_at, updated_at)
  VALUES
    (gen_random_uuid()::text, v_station_id, v_gasolina_comum_id,     '6.490', TRUE,  NOW(), NOW()),
    (gen_random_uuid()::text, v_station_id, v_gasolina_aditivada_id, '6.790', TRUE,  NOW(), NOW()),
    (gen_random_uuid()::text, v_station_id, v_etanol_id,             '4.290', TRUE,  NOW(), NOW()),
    (gen_random_uuid()::text, v_station_id, v_diesel_s10_id,         '6.190', TRUE,  NOW(), NOW()),
    (gen_random_uuid()::text, v_station_id, v_gnv_id,                '4.990', TRUE,  NOW(), NOW())
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_sf_id FROM station_fuel
  WHERE station_id = v_station_id AND fuel_id = v_gasolina_comum_id LIMIT 1;
  INSERT INTO price_history (id, station_fuel_id, previous_price, new_price, changed_at, changed_by_id)
  VALUES
    (gen_random_uuid()::text, v_sf_id, NULL,    '6.350', NOW() - INTERVAL '30 days', v_martinez_admin_id),
    (gen_random_uuid()::text, v_sf_id, '6.350', '6.490', NOW() - INTERVAL '5 days',  v_martinez_admin_id)
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_sf_id FROM station_fuel
  WHERE station_id = v_station_id AND fuel_id = v_gasolina_aditivada_id LIMIT 1;
  INSERT INTO price_history (id, station_fuel_id, previous_price, new_price, changed_at, changed_by_id)
  VALUES
    (gen_random_uuid()::text, v_sf_id, NULL,    '6.650', NOW() - INTERVAL '30 days', v_martinez_admin_id),
    (gen_random_uuid()::text, v_sf_id, '6.650', '6.790', NOW() - INTERVAL '5 days',  v_martinez_admin_id)
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_sf_id FROM station_fuel
  WHERE station_id = v_station_id AND fuel_id = v_etanol_id LIMIT 1;
  INSERT INTO price_history (id, station_fuel_id, previous_price, new_price, changed_at, changed_by_id)
  VALUES
    (gen_random_uuid()::text, v_sf_id, NULL,    '4.190', NOW() - INTERVAL '30 days', v_martinez_admin_id),
    (gen_random_uuid()::text, v_sf_id, '4.190', '4.290', NOW() - INTERVAL '5 days',  v_martinez_admin_id)
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_sf_id FROM station_fuel
  WHERE station_id = v_station_id AND fuel_id = v_diesel_s10_id LIMIT 1;
  INSERT INTO price_history (id, station_fuel_id, previous_price, new_price, changed_at, changed_by_id)
  VALUES
    (gen_random_uuid()::text, v_sf_id, NULL,    '6.050', NOW() - INTERVAL '30 days', v_martinez_admin_id),
    (gen_random_uuid()::text, v_sf_id, '6.050', '6.190', NOW() - INTERVAL '5 days',  v_martinez_admin_id)
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_sf_id FROM station_fuel
  WHERE station_id = v_station_id AND fuel_id = v_gnv_id LIMIT 1;
  INSERT INTO price_history (id, station_fuel_id, previous_price, new_price, changed_at, changed_by_id)
  VALUES
    (gen_random_uuid()::text, v_sf_id, NULL, '4.990', NOW() - INTERVAL '30 days', v_martinez_admin_id)
  ON CONFLICT DO NOTHING;

  -- ── Posto Martinez - Floriano ────────────────────────────
  SELECT id INTO v_station_id FROM station WHERE name = 'Posto Martinez - Floriano' LIMIT 1;

  INSERT INTO station_fuel (id, station_id, fuel_id, current_price, is_available, created_at, updated_at)
  VALUES
    (gen_random_uuid()::text, v_station_id, v_gasolina_comum_id,     '6.550', TRUE,  NOW(), NOW()),
    (gen_random_uuid()::text, v_station_id, v_gasolina_aditivada_id, '6.850', TRUE,  NOW(), NOW()),
    (gen_random_uuid()::text, v_station_id, v_etanol_id,             '4.350', FALSE, NOW(), NOW()),
    (gen_random_uuid()::text, v_station_id, v_diesel_s10_id,         '6.250', TRUE,  NOW(), NOW())
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_sf_id FROM station_fuel
  WHERE station_id = v_station_id AND fuel_id = v_gasolina_comum_id LIMIT 1;
  INSERT INTO price_history (id, station_fuel_id, previous_price, new_price, changed_at, changed_by_id)
  VALUES
    (gen_random_uuid()::text, v_sf_id, NULL,    '6.450', NOW() - INTERVAL '30 days', v_martinez_admin_id),
    (gen_random_uuid()::text, v_sf_id, '6.450', '6.550', NOW() - INTERVAL '5 days',  v_martinez_admin_id)
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_sf_id FROM station_fuel
  WHERE station_id = v_station_id AND fuel_id = v_gasolina_aditivada_id LIMIT 1;
  INSERT INTO price_history (id, station_fuel_id, previous_price, new_price, changed_at, changed_by_id)
  VALUES
    (gen_random_uuid()::text, v_sf_id, NULL, '6.850', NOW() - INTERVAL '30 days', v_martinez_admin_id)
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_sf_id FROM station_fuel
  WHERE station_id = v_station_id AND fuel_id = v_etanol_id LIMIT 1;
  INSERT INTO price_history (id, station_fuel_id, previous_price, new_price, changed_at, changed_by_id)
  VALUES
    (gen_random_uuid()::text, v_sf_id, NULL, '4.350', NOW() - INTERVAL '30 days', v_martinez_admin_id)
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_sf_id FROM station_fuel
  WHERE station_id = v_station_id AND fuel_id = v_diesel_s10_id LIMIT 1;
  INSERT INTO price_history (id, station_fuel_id, previous_price, new_price, changed_at, changed_by_id)
  VALUES
    (gen_random_uuid()::text, v_sf_id, NULL,    '6.100', NOW() - INTERVAL '30 days', v_martinez_admin_id),
    (gen_random_uuid()::text, v_sf_id, '6.100', '6.250', NOW() - INTERVAL '5 days',  v_martinez_admin_id)
  ON CONFLICT DO NOTHING;

  -- ── Posto Martinez - Picos ───────────────────────────────
  SELECT id INTO v_station_id FROM station WHERE name = 'Posto Martinez - Picos' LIMIT 1;

  INSERT INTO station_fuel (id, station_id, fuel_id, current_price, is_available, created_at, updated_at)
  VALUES
    (gen_random_uuid()::text, v_station_id, v_gasolina_comum_id,     '6.520', TRUE, NOW(), NOW()),
    (gen_random_uuid()::text, v_station_id, v_gasolina_aditivada_id, '6.820', TRUE, NOW(), NOW()),
    (gen_random_uuid()::text, v_station_id, v_etanol_id,             '4.310', TRUE, NOW(), NOW()),
    (gen_random_uuid()::text, v_station_id, v_diesel_s10_id,         '6.220', TRUE, NOW(), NOW()),
    (gen_random_uuid()::text, v_station_id, v_gnv_id,                '5.050', TRUE, NOW(), NOW())
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_sf_id FROM station_fuel
  WHERE station_id = v_station_id AND fuel_id = v_gasolina_aditivada_id LIMIT 1;
  INSERT INTO price_history (id, station_fuel_id, previous_price, new_price, changed_at, changed_by_id)
  VALUES
    (gen_random_uuid()::text, v_sf_id, NULL,    '6.700', NOW() - INTERVAL '30 days', v_martinez_admin_id),
    (gen_random_uuid()::text, v_sf_id, '6.700', '6.820', NOW() - INTERVAL '5 days',  v_martinez_admin_id)
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_sf_id FROM station_fuel
  WHERE station_id = v_station_id AND fuel_id = v_gnv_id LIMIT 1;
  INSERT INTO price_history (id, station_fuel_id, previous_price, new_price, changed_at, changed_by_id)
  VALUES
    (gen_random_uuid()::text, v_sf_id, NULL,    '4.950', NOW() - INTERVAL '30 days', v_martinez_admin_id),
    (gen_random_uuid()::text, v_sf_id, '4.950', '5.050', NOW() - INTERVAL '5 days',  v_martinez_admin_id)
  ON CONFLICT DO NOTHING;

  -- ── Nordeste - Parnaíba ──────────────────────────────────
  SELECT id INTO v_station_id FROM station WHERE name = 'Nordeste - Parnaíba' LIMIT 1;

  INSERT INTO station_fuel (id, station_id, fuel_id, current_price, is_available, created_at, updated_at)
  VALUES
    (gen_random_uuid()::text, v_station_id, v_gasolina_comum_id, '6.480', TRUE, NOW(), NOW()),
    (gen_random_uuid()::text, v_station_id, v_etanol_id,         '4.270', TRUE, NOW(), NOW()),
    (gen_random_uuid()::text, v_station_id, v_diesel_s10_id,     '6.180', TRUE, NOW(), NOW())
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_sf_id FROM station_fuel
  WHERE station_id = v_station_id AND fuel_id = v_gasolina_comum_id LIMIT 1;
  INSERT INTO price_history (id, station_fuel_id, previous_price, new_price, changed_at, changed_by_id)
  VALUES
    (gen_random_uuid()::text, v_sf_id, '6.380', '6.480', NOW() - INTERVAL '5 days', v_rede_admin_id)
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_sf_id FROM station_fuel
  WHERE station_id = v_station_id AND fuel_id = v_etanol_id LIMIT 1;
  INSERT INTO price_history (id, station_fuel_id, previous_price, new_price, changed_at, changed_by_id)
  VALUES
    (gen_random_uuid()::text, v_sf_id, NULL, '4.270', NOW() - INTERVAL '30 days', v_rede_admin_id)
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_sf_id FROM station_fuel
  WHERE station_id = v_station_id AND fuel_id = v_diesel_s10_id LIMIT 1;
  INSERT INTO price_history (id, station_fuel_id, previous_price, new_price, changed_at, changed_by_id)
  VALUES
    (gen_random_uuid()::text, v_sf_id, NULL, '6.180', NOW() - INTERVAL '30 days', v_rede_admin_id)
  ON CONFLICT DO NOTHING;

  -- ── Nordeste - Teresina Leste ────────────────────────────
  SELECT id INTO v_station_id FROM station WHERE name = 'Nordeste - Teresina Leste' LIMIT 1;

  INSERT INTO station_fuel (id, station_id, fuel_id, current_price, is_available, created_at, updated_at)
  VALUES
    (gen_random_uuid()::text, v_station_id, v_gasolina_comum_id, '6.400', FALSE, NOW(), NOW()),
    (gen_random_uuid()::text, v_station_id, v_etanol_id,         '4.200', FALSE, NOW(), NOW())
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_sf_id FROM station_fuel
  WHERE station_id = v_station_id AND fuel_id = v_gasolina_comum_id LIMIT 1;
  INSERT INTO price_history (id, station_fuel_id, previous_price, new_price, changed_at, changed_by_id)
  VALUES
    (gen_random_uuid()::text, v_sf_id, NULL, '6.400', NOW() - INTERVAL '30 days', v_rede_admin_id)
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_sf_id FROM station_fuel
  WHERE station_id = v_station_id AND fuel_id = v_etanol_id LIMIT 1;
  INSERT INTO price_history (id, station_fuel_id, previous_price, new_price, changed_at, changed_by_id)
  VALUES
    (gen_random_uuid()::text, v_sf_id, NULL, '4.200', NOW() - INTERVAL '30 days', v_rede_admin_id)
  ON CONFLICT DO NOTHING;

END $$;

COMMIT;