-- ==============================================================================
-- College Hub Platform — Supabase PostgreSQL Functions & Triggers
-- ==============================================================================

-- 1. Helper Function: set_tenant_context
-- Sets local session configuration variables for Row Level Security evaluation.
CREATE OR REPLACE FUNCTION set_tenant_context(p_college_id text, p_is_super_admin boolean DEFAULT false)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_college_id', p_college_id, true);
  PERFORM set_config('app.is_super_admin', CASE WHEN p_is_super_admin THEN 'true' ELSE 'false' END, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Helper Function: current_tenant_id
-- Returns current college ID from local session setting or JWT claim
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS text AS $$
BEGIN
  RETURN COALESCE(
    NULLIF(current_setting('app.current_college_id', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'college_id')
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- 3. Helper Function: is_super_admin
-- Returns boolean indicating if current user session has super admin status
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean AS $$
BEGIN
  RETURN (
    current_setting('app.is_super_admin', true) = 'true' OR
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'is_super_admin') = 'true' OR
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role') = 'SUPER_ADMIN'
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- 4. Trigger Function: trigger_update_updated_at
-- Automatically updates the updated_at column to current timestamp on record updates
CREATE OR REPLACE FUNCTION trigger_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
