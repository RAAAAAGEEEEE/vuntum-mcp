-- Minimal schema of the Vuntum MCP server.
--
-- The server reads `public_*` relations only. On vuntum.com they are views over
-- the editorial tables (claims, sources, snapshots, reviews), filtered to what
-- is published; drafts, sample data, rejected claims and review notes never
-- reach them. Here they are plain tables with exactly the columns the server
-- reads, so that anyone can run it on a laptop with the fictitious seed
-- (`seed.sql`). Load your own data in the same shape, or replace these tables
-- with views over your own model.
--
-- Run as the database owner. The server itself connects with a read-only role
-- (see the README and `docker/initdb/30-readonly-role.sh`).

-- ------------------------------------------------------------------ makers

CREATE TABLE public_manufacturer (
  id            text PRIMARY KEY,
  slug          text NOT NULL UNIQUE,
  name_usual    text NOT NULL,
  country_code  text
);

-- ------------------------------------------------------------------ robots

CREATE TABLE public_robot (
  id                  text PRIMARY KEY,
  slug                text NOT NULL UNIQUE,
  manufacturer_id     text NOT NULL REFERENCES public_manufacturer (id),
  manufacturer_slug   text NOT NULL,
  manufacturer_name   text NOT NULL,
  manufacturer_country text,
  name_usual          text NOT NULL,
  name_native         text,
  name_gloss_fr       text,
  name_gloss_en       text,
  aliases             text[] NOT NULL DEFAULT '{}',
  -- Form of the robot: 'humanoide', 'quadrupede', 'bras', 'aspirateur'...
  category_slug       text,
  -- concept | prototype | announced | preorder | shipping_limited | shipping | discontinued | unknown
  commercial_status   text NOT NULL DEFAULT 'unknown',
  announced_year      integer,
  summary_fr          text,
  summary_en          text,
  -- companion | utility | toy | research_education | professional | industrial | defense
  segment             text,
  -- Keys of `robotUtilities` (src/domain/utilities.ts), French slugs: 'menage', 'recherche'...
  utilities           text[] NOT NULL DEFAULT '{}',
  -- 'full', or 'light' for an identity-only sheet backed by one page
  -- floor_cleaning | lawn_mowing | pool_cleaning | window_cleaning | other (household robots only)
  home_task           text,
  sheet_level         text NOT NULL DEFAULT 'full',
  light_source_url    text,
  light_source_name   text,
  light_source_kind   text,
  light_checked_at    timestamptz,
  last_verified_at    timestamptz,
  published_at        timestamptz,
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public_robot_variant (
  id              text PRIMARY KEY,
  robot_id        text NOT NULL REFERENCES public_robot (id),
  slug            text NOT NULL,
  name            text NOT NULL,
  differences_fr  text
);

-- ------------------------------------------------------------------ facts

-- One row per published claim: a value, its conditions, its level of
-- evidence, the verbatim quote and the source it was read on.
CREATE TABLE public_fact (
  claim_id              text PRIMARY KEY,
  subject_type          text NOT NULL DEFAULT 'robot',
  subject_id            text NOT NULL,
  robot_id              text REFERENCES public_robot (id),
  robot_variant_id      text,
  -- A key of the predicate registry (src/domain/predicates.ts): 'mass.weight', 'price.msrp'...
  predicate             text NOT NULL,
  -- A ClaimValue (src/domain/claim-value.ts): {"kind":"number","value":1.3,"unit":"m"}...
  value                 jsonb NOT NULL,
  qualifiers            jsonb NOT NULL DEFAULT '{}',
  qualifiers_en         jsonb,
  -- manufacturer_claim | manufacturer_demo | independently_reported | independently_tested | vuntum_tested | unverified
  evidence_level        text NOT NULL,
  -- active | disputed | outdated | superseded | retracted
  lifecycle_status      text NOT NULL DEFAULT 'active',
  confidence            numeric NOT NULL DEFAULT 0.5,
  quote_original        text NOT NULL,
  quote_translated      text,
  language              text NOT NULL DEFAULT 'en',
  source_id             text NOT NULL,
  source_name           text NOT NULL,
  source_url            text,
  source_page_url       text,
  source_is_official    boolean NOT NULL DEFAULT false,
  source_published_at   timestamptz,
  source_date_precision text NOT NULL DEFAULT 'unknown',
  accessed_at           timestamptz NOT NULL,
  last_verified_at      timestamptz NOT NULL
);
CREATE INDEX public_fact_robot ON public_fact (robot_id);
CREATE INDEX public_fact_predicate ON public_fact (predicate);

-- Every accepted observation of a fact, replaced and outdated ones included (pro tool `get_fact_sources`).
CREATE TABLE public_fact_observation (
  claim_id             text PRIMARY KEY,
  robot_id             text NOT NULL REFERENCES public_robot (id),
  robot_variant_id     text,
  predicate            text NOT NULL,
  -- Same fact = same robot or variant, same predicate, same conditions.
  qualifiers_key       text NOT NULL DEFAULT '',
  qualifiers           jsonb NOT NULL DEFAULT '{}',
  value                jsonb NOT NULL,
  evidence_level       text NOT NULL,
  lifecycle_status     text NOT NULL,
  source_id            text NOT NULL,
  source_name          text NOT NULL,
  source_url           text,
  source_is_official   boolean NOT NULL DEFAULT false,
  source_published_at  timestamptz,
  accessed_at          timestamptz,
  valid_from           timestamptz,
  valid_to             timestamptz,
  supersedes_claim_id  text
);

CREATE TABLE public_price (
  claim_id     text PRIMARY KEY,
  robot_id     text NOT NULL REFERENCES public_robot (id),
  market       text NOT NULL,
  price_type   text NOT NULL,
  amount       numeric NOT NULL,
  currency     text NOT NULL,
  observed_at  timestamptz NOT NULL
);

CREATE TABLE public_availability (
  claim_id     text PRIMARY KEY,
  robot_id     text NOT NULL REFERENCES public_robot (id),
  market       text NOT NULL,
  state        text NOT NULL,
  observed_at  timestamptz NOT NULL
);

-- A capability (src/domain/capabilities.ts) shown by an accepted claim.
CREATE TABLE public_robot_capability (
  robot_id        text NOT NULL REFERENCES public_robot (id),
  capability      text NOT NULL,
  claim_id        text NOT NULL,
  evidence_level  text NOT NULL,
  PRIMARY KEY (robot_id, capability, claim_id)
);

CREATE TABLE public_robot_identifier (
  robot_id     text NOT NULL REFERENCES public_robot (id),
  -- asin | gtin | mpn
  kind         text NOT NULL,
  marketplace  text NOT NULL,
  variant      text NOT NULL DEFAULT '',
  value        text NOT NULL,
  verified_at  timestamptz NOT NULL
);

-- A company that an official page names inside a robot.
CREATE TABLE public_component_link (
  robot_slug         text NOT NULL,
  robot_name         text NOT NULL,
  manufacturer_name  text NOT NULL,
  company_slug       text NOT NULL,
  company_name       text NOT NULL,
  company_url        text NOT NULL,
  country_code       text,
  -- the company's ownership, as its official page words it (null when not stated)
  ownership          text,
  -- motor | gearbox | sensor | hand | chip | battery
  component          text NOT NULL,
  detail             text,
  detail_en          text,
  url                text NOT NULL,
  confirmed_at       timestamptz NOT NULL DEFAULT now()
);

-- A dated promise of a maker (release, delivery...), for the humanoid tracker.
CREATE TABLE public_promise (
  robot_id            text NOT NULL REFERENCES public_robot (id),
  kind                text NOT NULL,
  due_on              date NOT NULL,
  due_precision       text NOT NULL,
  source_url          text NOT NULL,
  source_name         text NOT NULL,
  source_is_official  boolean NOT NULL DEFAULT false,
  announced_on        date
);

-- One row per robot: the ways it can be programmed, from accepted claims and linked repositories.
CREATE TABLE public_robot_programmability (
  robot_id                 text PRIMARY KEY REFERENCES public_robot (id),
  slug                     text NOT NULL,
  sdk_public               boolean,
  python                   boolean,
  cpp                      boolean,
  ros2                     boolean,
  ros                      boolean,
  mcp                      boolean,
  visual_programming       boolean,
  home_assistant           boolean,
  llm_control              boolean,
  alt_firmware             boolean,
  local_control            boolean,
  cloud_required           boolean,
  simulation               boolean,
  official_repositories    integer NOT NULL DEFAULT 0,
  community_repositories   integer NOT NULL DEFAULT 0,
  top_stars                integer NOT NULL DEFAULT 0,
  programming_facts        integer NOT NULL DEFAULT 0,
  last_push                timestamptz,
  ros_released             boolean NOT NULL DEFAULT false,
  is_programmable          boolean NOT NULL DEFAULT false
);

CREATE TABLE public_repository (
  slug                  text PRIMARY KEY,
  full_name             text NOT NULL,
  url                   text NOT NULL,
  description_fr        text,
  description_original  text,
  license_spdx          text,
  stars                 integer,
  topics                text[],
  is_official           boolean NOT NULL DEFAULT false,
  pushed_at             timestamptz,
  api_fetched_at        timestamptz
);

-- ------------------------------------------------------------------ registers

-- Robot forms (`public_robot.category_slug`), in display order.
CREATE TABLE public_robot_category (
  slug      text PRIMARY KEY,
  label_fr  text NOT NULL,
  label_en  text,
  position  integer NOT NULL DEFAULT 0
);

-- Fairs, competitions and conferences, each with the organiser's official page.
CREATE TABLE public_event (
  slug            text PRIMARY KEY,
  name            text NOT NULL,
  -- fair | competition | conference
  kind            text NOT NULL,
  starts_on       date NOT NULL,
  ends_on         date NOT NULL,
  city            text,
  country_fr      text,
  country_en      text,
  online          boolean NOT NULL DEFAULT false,
  url             text NOT NULL,
  description_fr  text NOT NULL,
  description_en  text NOT NULL,
  confirmed_at    timestamptz NOT NULL
);

-- The public log of corrections made to published data.
CREATE TABLE public_correction (
  id            text PRIMARY KEY,
  subject_type  text NOT NULL,
  summary_fr    text NOT NULL,
  detail_fr     text,
  -- null while the English text is not written: the tool then leaves the correction out of the English list
  summary_en    text,
  detail_en     text,
  corrected_at  timestamptz NOT NULL
);

-- Rankings of robot competitions, each row with the official ranking page.
CREATE TABLE public_competition_result (
  id                text PRIMARY KEY,
  competition_slug  text NOT NULL,
  competition_name  text NOT NULL,
  edition_year      integer NOT NULL,
  place_fr          text NOT NULL,
  place_en          text NOT NULL,
  discipline_fr     text NOT NULL,
  discipline_en     text NOT NULL,
  rank              integer NOT NULL,
  team              text NOT NULL,
  institution       text,
  robot             text,
  detail_fr         text,
  detail_en         text,
  autonomy          text NOT NULL,
  autonomy_text     text,
  autonomy_url      text,
  url               text NOT NULL,
  confirmed_at      timestamptz NOT NULL
);

-- Funding and headcount of a company, as of a date, from a page of that company.
CREATE TABLE public_company_figure (
  id                 text PRIMARY KEY,
  company_name       text NOT NULL,
  manufacturer_slug  text,
  -- round | valuation | headcount | total_raised (src/domain/figures.ts)
  kind               text NOT NULL,
  amount             numeric,
  currency           text,
  headcount          integer,
  -- over | nearly | about, or null when the figure is exact (src/domain/figures.ts)
  qualifier          text,
  stage              text,
  as_of              date NOT NULL,
  note_fr            text,
  note_en            text,
  url                text NOT NULL
);

-- An integrator and the maker programme it claims, with the quoted words.
CREATE TABLE public_integrator_partnership (
  id                 text PRIMARY KEY,
  integrator_slug    text NOT NULL,
  integrator_name    text NOT NULL,
  country_code       text NOT NULL,
  website_url        text,
  manufacturer_slug  text NOT NULL,
  program            text NOT NULL,
  -- who wrote the quoted words: manufacturer | integrator
  author             text NOT NULL,
  quote              text NOT NULL,
  url                text NOT NULL,
  published_on       date NOT NULL,
  confirmed_at       timestamptz NOT NULL
);

-- The signatories of the site.
CREATE TABLE public_author (
  slug    text PRIMARY KEY,
  name    text NOT NULL,
  bio_fr  text,
  bio_en  text
);

-- The glossary, one row per entry and language.
CREATE TABLE public_glossary_entry (
  slug          text NOT NULL,
  locale        text NOT NULL,
  term          text NOT NULL,
  other_term    text,
  abbreviation  text,
  definition    text NOT NULL,
  -- slugs, in the same language, of related entries
  related       text[] NOT NULL DEFAULT '{}',
  -- [{"label": "...", "url": "..."}, ...]
  "references"  jsonb NOT NULL DEFAULT '[]',
  verified_on   date,
  noindex       boolean NOT NULL DEFAULT false,
  PRIMARY KEY (slug, locale)
);

-- ------------------------------------------------------------------ articles and changes

CREATE TABLE public_article (
  id            text NOT NULL,
  slug          text NOT NULL,
  locale        text NOT NULL,
  kind          text NOT NULL,
  title         text NOT NULL,
  standfirst    text,
  -- [{"text": "..."}, ...]
  body          jsonb NOT NULL DEFAULT '[]',
  ai_assisted   boolean NOT NULL DEFAULT false,
  -- [{"name": "...", "url": "..."}, ...]
  sources       jsonb NOT NULL DEFAULT '[]',
  published_at  timestamptz,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (slug, locale)
);

CREATE TABLE public_change (
  id           text PRIMARY KEY,
  entity_type  text NOT NULL,
  entity_id    text NOT NULL,
  -- created | published | value_changed | price_changed | availability_changed | corrected | retracted | unpublished
  kind         text NOT NULL,
  summary_fr   text NOT NULL,
  summary_en   text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------ site search

-- Robots, makers and articles, by relevance. tier 0: every word found;
-- tier 1: some words only. (vuntum.com also uses full-text search, unaccent
-- and pg_trgm for close spellings, tier 2; this portable version needs no
-- extension.)
CREATE FUNCTION search_site(q text, lang text, lim integer)
RETURNS TABLE (kind text, id text, slug text, title text, extra text, snippet text, rank real, tier integer)
LANGUAGE sql STABLE AS $$
  WITH words AS (
    SELECT DISTINCT w FROM regexp_split_to_table(lower(trim(q)), '\s+') AS w WHERE length(w) >= 2
  ),
  docs AS (
    SELECT 'robot'::text AS kind, r.id, r.slug, r.name_usual AS title, r.manufacturer_name AS extra,
           CASE WHEN lang = 'en' THEN r.summary_en ELSE r.summary_fr END AS snippet,
           lower(concat_ws(' ', r.name_usual, r.manufacturer_name, array_to_string(r.aliases, ' '),
                           CASE WHEN lang = 'en' THEN r.summary_en ELSE r.summary_fr END)) AS doc
      FROM public_robot r
    UNION ALL
    SELECT 'manufacturer', m.id, m.slug, m.name_usual, m.country_code, NULL, lower(m.name_usual)
      FROM public_manufacturer m
    UNION ALL
    SELECT 'article', a.id, a.slug, a.title, a.kind, a.standfirst,
           lower(concat_ws(' ', a.title, a.standfirst, a.body::text))
      FROM public_article a WHERE a.locale = lang
  ),
  scored AS (
    SELECT d.*,
           (SELECT count(*) FROM words WHERE strpos(d.doc, words.w) > 0) AS hits,
           (SELECT count(*) FROM words) AS total
      FROM docs d
  )
  SELECT kind, id, slug, title, extra, snippet,
         (hits::real / greatest(total, 1)
           + CASE WHEN strpos(lower(title), lower(trim(q))) > 0 THEN 1 ELSE 0 END)::real AS rank,
         CASE WHEN hits = total THEN 0 ELSE 1 END AS tier
    FROM scored
   WHERE hits > 0
   ORDER BY tier, rank DESC, title
   LIMIT lim
$$;

-- ------------------------------------------------------------------ pro keys

-- The key itself is never stored: only its SHA-256 (hex). The read-only role
-- gets no right on this table, only EXECUTE on the lookup function below.
CREATE TABLE api_key (
  id           text PRIMARY KEY,
  key_hash     text NOT NULL UNIQUE,
  key_prefix   text NOT NULL,
  holder       text NOT NULL,
  tier         text NOT NULL DEFAULT 'pro',
  daily_quota  integer NOT NULL DEFAULT 20000,
  created_at   timestamptz NOT NULL DEFAULT now(),
  revoked_at   timestamptz
);

CREATE FUNCTION public_api_key_lookup(p_hash text)
RETURNS TABLE (key_id text, tier text, daily_quota integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, tier, daily_quota FROM api_key WHERE key_hash = p_hash AND revoked_at IS NULL
$$;
