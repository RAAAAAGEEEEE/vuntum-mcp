-- FICTITIOUS DEMO DATA. None of these robots, makers, sources, prices or
-- quotes exist: they only let the server run on a laptop. The real Vuntum
-- database is not part of this repository (it is published under
-- CC BY-NC 4.0 through https://vuntum.com/mcp, not as a dump).
-- Every source points to example.com, a domain reserved for documentation.

INSERT INTO public_manufacturer (id, slug, name_usual, country_code) VALUES
  ('mfr_demo_1', 'demo-maker-one', 'Demo Maker One', 'FR'),
  ('mfr_demo_2', 'demo-maker-two', 'Demo Maker Two', 'DE');

INSERT INTO public_robot (id, slug, manufacturer_id, manufacturer_slug, manufacturer_name, manufacturer_country,
                          name_usual, aliases, category_slug, commercial_status, announced_year,
                          summary_fr, summary_en, segment, utilities, last_verified_at, published_at, updated_at) VALUES
  ('rob_demo_a', 'demo-robot-a', 'mfr_demo_1', 'demo-maker-one', 'Demo Maker One', 'FR',
   'Demo Robot A', '{DRA}', 'humanoide', 'shipping', 2025,
   'Robot humanoïde fictif, utilisé pour montrer le serveur MCP en local.',
   'Fictitious humanoid robot, used to demonstrate the MCP server locally.',
   'companion', '{menage,recherche}', '2026-10-01T09:00:00Z', '2026-09-01T09:00:00Z', '2026-10-01T09:00:00Z'),
  ('rob_demo_b', 'demo-robot-b', 'mfr_demo_2', 'demo-maker-two', 'Demo Maker Two', 'DE',
   'Demo Robot B', '{}', 'humanoide', 'preorder', 2026,
   'Second robot humanoïde fictif, en précommande.',
   'Second fictitious humanoid robot, on pre-order.',
   'research_education', '{recherche,education}', '2026-10-05T09:00:00Z', '2026-09-15T09:00:00Z', '2026-10-05T09:00:00Z'),
  ('rob_demo_c', 'demo-robot-c', 'mfr_demo_1', 'demo-maker-one', 'Demo Maker One', 'FR',
   'Demo Robot C', '{}', 'aspirateur', 'shipping', 2024,
   'Robot aspirateur fictif.',
   'Fictitious robot vacuum cleaner.',
   'utility', '{menage}', '2026-10-10T09:00:00Z', '2026-08-01T09:00:00Z', '2026-10-10T09:00:00Z');

INSERT INTO public_robot_variant (id, robot_id, slug, name, differences_fr) VALUES
  ('var_demo_a_pro', 'rob_demo_a', 'pro', 'Demo Robot A Pro', 'Batterie plus grande (fictif).');

-- Facts. Source names and quotes are invented; every URL is on example.com.
INSERT INTO public_fact (claim_id, subject_id, robot_id, predicate, value, qualifiers, evidence_level, confidence,
                         quote_original, language, source_id, source_name, source_url, source_page_url,
                         source_is_official, source_published_at, source_date_precision, accessed_at, last_verified_at) VALUES
  ('clm_demo_a_height', 'rob_demo_a', 'rob_demo_a', 'dimensions.height', '{"kind":"number","value":1.3,"unit":"m"}', '{}',
   'manufacturer_claim', 0.6, 'Demo Robot A stands 1.3 m tall.', 'en',
   'src_demo_1', 'Demo Maker One (official site)', 'https://example.com/demo-maker-one', 'https://example.com/demo-maker-one/demo-robot-a',
   true, '2026-09-01T00:00:00Z', 'day', '2026-10-01T09:00:00Z', '2026-10-01T09:00:00Z'),
  ('clm_demo_a_weight', 'rob_demo_a', 'rob_demo_a', 'mass.weight', '{"kind":"number","value":35,"unit":"kg"}', '{}',
   'manufacturer_claim', 0.6, 'It weighs 35 kg.', 'en',
   'src_demo_1', 'Demo Maker One (official site)', 'https://example.com/demo-maker-one', 'https://example.com/demo-maker-one/demo-robot-a',
   true, '2026-09-01T00:00:00Z', 'day', '2026-10-01T09:00:00Z', '2026-10-01T09:00:00Z'),
  ('clm_demo_a_household', 'rob_demo_a', 'rob_demo_a', 'tasks.household', '{"kind":"tristate","value":"yes"}', '{}',
   'manufacturer_demo', 0.5, 'Demo Robot A folds laundry and loads the dishwasher.', 'en',
   'src_demo_1', 'Demo Maker One (official site)', 'https://example.com/demo-maker-one', 'https://example.com/demo-maker-one/demo-robot-a',
   true, '2026-09-01T00:00:00Z', 'day', '2026-10-01T09:00:00Z', '2026-10-01T09:00:00Z'),
  ('clm_demo_a_python', 'rob_demo_a', 'rob_demo_a', 'software.python', '{"kind":"tristate","value":"yes"}', '{}',
   'independently_reported', 0.7, 'A Python SDK is available for Demo Robot A.', 'en',
   'src_demo_2', 'Example Robotics Review', 'https://example.com/review', 'https://example.com/review/demo-robot-a',
   false, '2026-09-20T00:00:00Z', 'day', '2026-10-01T09:00:00Z', '2026-10-01T09:00:00Z'),
  ('clm_demo_a_msrp', 'rob_demo_a', 'rob_demo_a', 'price.msrp', '{"kind":"money","amount":19900,"currency":"EUR","priceType":"msrp"}', '{"market":"FR"}',
   'manufacturer_claim', 0.6, 'Price: 19,900 EUR.', 'en',
   'src_demo_1', 'Demo Maker One (official site)', 'https://example.com/demo-maker-one', 'https://example.com/demo-maker-one/demo-robot-a',
   true, '2026-09-01T00:00:00Z', 'day', '2026-10-01T09:00:00Z', '2026-10-01T09:00:00Z'),
  ('clm_demo_a_avail', 'rob_demo_a', 'rob_demo_a', 'availability.state', '{"kind":"enum","value":"available"}', '{"market":"FR"}',
   'manufacturer_claim', 0.6, 'Available now in France.', 'en',
   'src_demo_1', 'Demo Maker One (official site)', 'https://example.com/demo-maker-one', 'https://example.com/demo-maker-one/demo-robot-a',
   true, '2026-09-01T00:00:00Z', 'day', '2026-10-01T09:00:00Z', '2026-10-01T09:00:00Z'),
  ('clm_demo_a_announced', 'rob_demo_a', 'rob_demo_a', 'lifecycle.announced_date', '{"kind":"date","value":"2025-03-10","precision":"day"}', '{}',
   'manufacturer_claim', 0.6, 'Announced on 10 March 2025.', 'en',
   'src_demo_1', 'Demo Maker One (official site)', 'https://example.com/demo-maker-one', 'https://example.com/demo-maker-one/news',
   true, '2025-03-10T00:00:00Z', 'day', '2026-10-01T09:00:00Z', '2026-10-01T09:00:00Z'),
  ('clm_demo_b_height', 'rob_demo_b', 'rob_demo_b', 'dimensions.height', '{"kind":"number","value":1.7,"unit":"m"}', '{}',
   'manufacturer_claim', 0.6, 'Demo Robot B is 1.7 m tall.', 'en',
   'src_demo_3', 'Demo Maker Two (official site)', 'https://example.com/demo-maker-two', 'https://example.com/demo-maker-two/demo-robot-b',
   true, '2026-09-15T00:00:00Z', 'day', '2026-10-05T09:00:00Z', '2026-10-05T09:00:00Z'),
  ('clm_demo_b_weight', 'rob_demo_b', 'rob_demo_b', 'mass.weight', '{"kind":"number","value":60,"unit":"kg"}', '{}',
   'manufacturer_claim', 0.6, 'It weighs 60 kg.', 'en',
   'src_demo_3', 'Demo Maker Two (official site)', 'https://example.com/demo-maker-two', 'https://example.com/demo-maker-two/demo-robot-b',
   true, '2026-09-15T00:00:00Z', 'day', '2026-10-05T09:00:00Z', '2026-10-05T09:00:00Z'),
  ('clm_demo_b_avail', 'rob_demo_b', 'rob_demo_b', 'availability.state', '{"kind":"enum","value":"preorder"}', '{"market":"US"}',
   'manufacturer_claim', 0.6, 'Pre-orders are open in the United States.', 'en',
   'src_demo_3', 'Demo Maker Two (official site)', 'https://example.com/demo-maker-two', 'https://example.com/demo-maker-two/demo-robot-b',
   true, '2026-09-15T00:00:00Z', 'day', '2026-10-05T09:00:00Z', '2026-10-05T09:00:00Z'),
  ('clm_demo_c_household', 'rob_demo_c', 'rob_demo_c', 'tasks.household', '{"kind":"tristate","value":"yes"}', '{}',
   'manufacturer_claim', 0.6, 'Vacuums every room on its own.', 'en',
   'src_demo_1', 'Demo Maker One (official site)', 'https://example.com/demo-maker-one', 'https://example.com/demo-maker-one/demo-robot-c',
   true, '2026-08-01T00:00:00Z', 'day', '2026-10-10T09:00:00Z', '2026-10-10T09:00:00Z');

INSERT INTO public_fact_observation (claim_id, robot_id, predicate, value, evidence_level, lifecycle_status,
                                     source_id, source_name, source_url, source_is_official, source_published_at, accessed_at,
                                     valid_from, valid_to, supersedes_claim_id) VALUES
  ('clm_demo_a_weight', 'rob_demo_a', 'mass.weight', '{"kind":"number","value":35,"unit":"kg"}', 'manufacturer_claim', 'active',
   'src_demo_1', 'Demo Maker One (official site)', 'https://example.com/demo-maker-one', true, '2026-09-01T00:00:00Z', '2026-10-01T09:00:00Z',
   '2026-09-01T00:00:00Z', NULL, 'clm_demo_a_weight_old'),
  ('clm_demo_a_weight_old', 'rob_demo_a', 'mass.weight', '{"kind":"number","value":38,"unit":"kg"}', 'independently_reported', 'superseded',
   'src_demo_2', 'Example Robotics Review', 'https://example.com/review', false, '2025-04-01T00:00:00Z', '2025-04-02T09:00:00Z',
   '2025-04-01T00:00:00Z', '2026-09-01T00:00:00Z', NULL);

INSERT INTO public_price (claim_id, robot_id, market, price_type, amount, currency, observed_at) VALUES
  ('clm_demo_a_msrp', 'rob_demo_a', 'FR', 'msrp', 19900, 'EUR', '2026-10-01T09:00:00Z');

INSERT INTO public_availability (claim_id, robot_id, market, state, observed_at) VALUES
  ('clm_demo_a_avail', 'rob_demo_a', 'FR', 'available', '2026-10-01T09:00:00Z'),
  ('clm_demo_b_avail', 'rob_demo_b', 'US', 'preorder', '2026-10-05T09:00:00Z');

INSERT INTO public_robot_capability (robot_id, capability, claim_id, evidence_level) VALUES
  ('rob_demo_a', 'marcher', 'clm_demo_a_household', 'manufacturer_demo'),
  ('rob_demo_b', 'marcher', 'clm_demo_b_height', 'manufacturer_claim');

INSERT INTO public_robot_identifier (robot_id, kind, marketplace, variant, value, verified_at) VALUES
  ('rob_demo_a', 'mpn', 'manufacturer', '', 'DEMO-A-0001', '2026-10-01T09:00:00Z');

INSERT INTO public_component_link (robot_slug, company_slug, company_name, company_url, component, detail, detail_en, url) VALUES
  ('demo-robot-a', 'example-motors', 'Example Motors', 'https://example.com/example-motors', 'motor',
   'Moteurs des jambes (fictif)', 'Leg motors (fictitious)', 'https://example.com/demo-maker-one/demo-robot-a');

INSERT INTO public_robot_programmability (robot_id, slug, sdk_public, python, official_repositories, top_stars,
                                          programming_facts, is_programmable) VALUES
  ('rob_demo_a', 'demo-robot-a', true, true, 1, 42, 1, true);

INSERT INTO public_repository (slug, full_name, url, description_fr, description_original, license_spdx, stars, topics,
                               is_official, pushed_at, api_fetched_at) VALUES
  ('example-demo-robot-sdk', 'example/demo-robot-sdk', 'https://example.com/example/demo-robot-sdk',
   'SDK Python fictif du Demo Robot A.', 'Fictitious Python SDK for Demo Robot A.', 'MIT', 42, '{robotics,python}',
   true, '2026-10-01T09:00:00Z', '2026-10-02T09:00:00Z');

INSERT INTO public_article (id, slug, locale, kind, title, standfirst, body, sources, published_at, updated_at) VALUES
  ('art_demo_1', 'demo-robot-a-en-vente', 'fr', 'news', 'Le Demo Robot A est en vente (exemple fictif)',
   'Un article de démonstration.', '[{"text":"Ce texte est fictif : il sert à tester l''outil get_article."}]',
   '[{"name":"Demo Maker One","url":"https://example.com/demo-maker-one/news"}]', '2026-10-01T09:00:00Z', '2026-10-01T09:00:00Z'),
  ('art_demo_1', 'demo-robot-a-on-sale', 'en', 'news', 'Demo Robot A goes on sale (fictitious example)',
   'A demonstration article.', '[{"text":"This text is fictitious: it is here to test the get_article tool."}]',
   '[{"name":"Demo Maker One","url":"https://example.com/demo-maker-one/news"}]', '2026-10-01T09:00:00Z', '2026-10-01T09:00:00Z');

INSERT INTO public_change (id, entity_type, entity_id, kind, summary_fr, summary_en, created_at) VALUES
  ('chg_demo_1', 'robot', 'rob_demo_c', 'published', 'Publication de la fiche « Demo Robot C »', NULL, '2026-08-01T09:00:00Z'),
  ('chg_demo_2', 'robot', 'rob_demo_a', 'published', 'Publication de la fiche « Demo Robot A »', NULL, '2026-09-01T09:00:00Z'),
  ('chg_demo_3', 'robot', 'rob_demo_b', 'published', 'Publication de la fiche « Demo Robot B »', NULL, '2026-09-15T09:00:00Z'),
  ('chg_demo_4', 'robot', 'rob_demo_a', 'price_changed', 'Prix mis à jour', 'Price updated', '2026-10-01T09:00:00Z');
