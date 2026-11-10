-- The read-only role the MCP server connects with.
-- Run as the database owner, after schema.sql:
--   psql -v ro_password='choose-a-password' -f sql/readonly-role.sql "postgres://owner@host/db"
-- It can SELECT the public_* tables, run the site search and look a key up
-- by its hash. It cannot see the api_key table, nor write anything.

CREATE ROLE vuntum_mcp_ro LOGIN PASSWORD :'ro_password';
ALTER ROLE vuntum_mcp_ro SET default_transaction_read_only = on;
ALTER ROLE vuntum_mcp_ro SET statement_timeout = '5s';

GRANT USAGE ON SCHEMA public TO vuntum_mcp_ro;
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'public\_%' LOOP
    EXECUTE format('GRANT SELECT ON %I TO vuntum_mcp_ro', t);
  END LOOP;
END
$$;
REVOKE ALL ON api_key FROM vuntum_mcp_ro;
GRANT EXECUTE ON FUNCTION search_site(text, text, integer) TO vuntum_mcp_ro;
REVOKE EXECUTE ON FUNCTION public_api_key_lookup(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public_api_key_lookup(text) TO vuntum_mcp_ro;
