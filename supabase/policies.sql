-- ==============================================================================
-- College Hub Platform — Supabase RLS Security & Access Control Policies
-- ==============================================================================

-- ==============================================================================
-- PART 1: SUPABASE STORAGE OBJECT POLICIES
-- ==============================================================================

-- 1. Public Read Access for Public Buckets (avatars, marketplace, events)
DROP POLICY IF EXISTS "Public read access for public buckets" ON storage.objects;
CREATE POLICY "Public read access for public buckets" ON storage.objects
  FOR SELECT
  USING (bucket_id IN ('avatars', 'marketplace', 'events'));

-- 2. Authenticated Read Access for Private Buckets (materials, documents, misc)
DROP POLICY IF EXISTS "Authenticated read access for private buckets" ON storage.objects;
CREATE POLICY "Authenticated read access for private buckets" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id IN ('materials', 'documents', 'misc'));

-- 3. Authenticated Insert/Upload Access for All Buckets
DROP POLICY IF EXISTS "Authenticated insert access" ON storage.objects;
CREATE POLICY "Authenticated insert access" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id IN ('avatars', 'marketplace', 'materials', 'documents', 'events', 'misc'));

-- 4. Owner / Authenticated Update Access
DROP POLICY IF EXISTS "Authenticated update access" ON storage.objects;
CREATE POLICY "Authenticated update access" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id IN ('avatars', 'marketplace', 'materials', 'documents', 'events', 'misc'));

-- 5. Owner / Authenticated Delete Access
DROP POLICY IF EXISTS "Authenticated delete access" ON storage.objects;
CREATE POLICY "Authenticated delete access" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id IN ('avatars', 'marketplace', 'materials', 'documents', 'events', 'misc'));

-- 6. Service Role Full Access Override (For backend servers & worker microservices)
DROP POLICY IF EXISTS "Service role storage bypass" ON storage.objects;
CREATE POLICY "Service role storage bypass" ON storage.objects
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- ==============================================================================
-- PART 2: MULTI-TENANT DATABASE ROW LEVEL SECURITY POLICIES
-- ==============================================================================

-- 1. Tenants Table
ALTER TABLE college_tenants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_policy" ON college_tenants;
CREATE POLICY "tenant_isolation_policy" ON college_tenants
  AS RESTRICTIVE
  USING (
    current_setting('app.is_super_admin', true) = 'true' OR
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role') = 'SUPER_ADMIN' OR
    id::text = COALESCE(NULLIF(current_setting('app.current_college_id', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'college_id'))
  )
  WITH CHECK (
    current_setting('app.is_super_admin', true) = 'true' OR
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role') = 'SUPER_ADMIN' OR
    id::text = COALESCE(NULLIF(current_setting('app.current_college_id', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'college_id'))
  );

-- 2. Users Table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_policy" ON users;
CREATE POLICY "tenant_isolation_policy" ON users
  AS RESTRICTIVE
  USING (
    current_setting('app.is_super_admin', true) = 'true' OR
    college_id::text = COALESCE(NULLIF(current_setting('app.current_college_id', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'college_id'))
  )
  WITH CHECK (
    current_setting('app.is_super_admin', true) = 'true' OR
    college_id::text = COALESCE(NULLIF(current_setting('app.current_college_id', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'college_id'))
  );

-- 3. User Sessions Table
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_policy" ON user_sessions;
CREATE POLICY "tenant_isolation_policy" ON user_sessions
  AS RESTRICTIVE
  USING (
    current_setting('app.is_super_admin', true) = 'true' OR
    college_id::text = COALESCE(NULLIF(current_setting('app.current_college_id', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'college_id'))
  )
  WITH CHECK (
    current_setting('app.is_super_admin', true) = 'true' OR
    college_id::text = COALESCE(NULLIF(current_setting('app.current_college_id', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'college_id'))
  );

-- 4. Audit Logs Table
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_policy" ON audit_logs;
CREATE POLICY "tenant_isolation_policy" ON audit_logs
  AS RESTRICTIVE
  USING (
    current_setting('app.is_super_admin', true) = 'true' OR
    college_id::text = COALESCE(NULLIF(current_setting('app.current_college_id', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'college_id'))
  )
  WITH CHECK (
    current_setting('app.is_super_admin', true) = 'true' OR
    college_id::text = COALESCE(NULLIF(current_setting('app.current_college_id', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'college_id'))
  );

-- 5. Academic Resources Table
ALTER TABLE academic_resources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_policy" ON academic_resources;
CREATE POLICY "tenant_isolation_policy" ON academic_resources
  AS RESTRICTIVE
  USING (
    current_setting('app.is_super_admin', true) = 'true' OR
    college_id::text = COALESCE(NULLIF(current_setting('app.current_college_id', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'college_id'))
  )
  WITH CHECK (
    current_setting('app.is_super_admin', true) = 'true' OR
    college_id::text = COALESCE(NULLIF(current_setting('app.current_college_id', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'college_id'))
  );

-- 6. Confessions Table
ALTER TABLE confessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_policy" ON confessions;
CREATE POLICY "tenant_isolation_policy" ON confessions
  AS RESTRICTIVE
  USING (
    current_setting('app.is_super_admin', true) = 'true' OR
    college_id::text = COALESCE(NULLIF(current_setting('app.current_college_id', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'college_id'))
  )
  WITH CHECK (
    current_setting('app.is_super_admin', true) = 'true' OR
    college_id::text = COALESCE(NULLIF(current_setting('app.current_college_id', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'college_id'))
  );

-- 7. Marketplace Listings Table
ALTER TABLE marketplace_listings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_policy" ON marketplace_listings;
CREATE POLICY "tenant_isolation_policy" ON marketplace_listings
  AS RESTRICTIVE
  USING (
    current_setting('app.is_super_admin', true) = 'true' OR
    college_id::text = COALESCE(NULLIF(current_setting('app.current_college_id', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'college_id'))
  )
  WITH CHECK (
    current_setting('app.is_super_admin', true) = 'true' OR
    college_id::text = COALESCE(NULLIF(current_setting('app.current_college_id', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'college_id'))
  );

-- 8. Campus Connect Profiles Table
ALTER TABLE connect_student_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_policy" ON connect_student_profiles;
CREATE POLICY "tenant_isolation_policy" ON connect_student_profiles
  AS RESTRICTIVE
  USING (
    current_setting('app.is_super_admin', true) = 'true' OR
    college_id::text = COALESCE(NULLIF(current_setting('app.current_college_id', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'college_id'))
  )
  WITH CHECK (
    current_setting('app.is_super_admin', true) = 'true' OR
    college_id::text = COALESCE(NULLIF(current_setting('app.current_college_id', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'college_id'))
  );

-- 9. Notifications Table
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_policy" ON notifications;
CREATE POLICY "tenant_isolation_policy" ON notifications
  AS RESTRICTIVE
  USING (
    current_setting('app.is_super_admin', true) = 'true' OR
    college_id::text = COALESCE(NULLIF(current_setting('app.current_college_id', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'college_id'))
  )
  WITH CHECK (
    current_setting('app.is_super_admin', true) = 'true' OR
    college_id::text = COALESCE(NULLIF(current_setting('app.current_college_id', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'college_id'))
  );

-- 10. Placement Companies Table
ALTER TABLE placement_companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_policy" ON placement_companies;
CREATE POLICY "tenant_isolation_policy" ON placement_companies
  AS RESTRICTIVE
  USING (
    current_setting('app.is_super_admin', true) = 'true' OR
    college_id::text = COALESCE(NULLIF(current_setting('app.current_college_id', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'college_id'))
  )
  WITH CHECK (
    current_setting('app.is_super_admin', true) = 'true' OR
    college_id::text = COALESCE(NULLIF(current_setting('app.current_college_id', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'college_id'))
  );

-- 11. Rate My Professor Professors Table
ALTER TABLE professors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_policy" ON professors;
CREATE POLICY "tenant_isolation_policy" ON professors
  AS RESTRICTIVE
  USING (
    current_setting('app.is_super_admin', true) = 'true' OR
    college_id::text = COALESCE(NULLIF(current_setting('app.current_college_id', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'college_id'))
  )
  WITH CHECK (
    current_setting('app.is_super_admin', true) = 'true' OR
    college_id::text = COALESCE(NULLIF(current_setting('app.current_college_id', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'college_id'))
  );


-- ==============================================================================
-- PART 3: SENSITIVE CONTENT TABLES — TENANT-ISOLATED RLS
-- (confession moderation, anonymity boundary, professor reviews)
-- ==============================================================================

-- 12. Professor Reviews — reviewers must never read each other's identity.
ALTER TABLE professor_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_policy" ON professor_reviews;
CREATE POLICY "tenant_isolation_policy" ON professor_reviews
  AS RESTRICTIVE
  USING (
    current_setting('app.is_super_admin', true) = 'true' OR
    college_id::text = COALESCE(NULLIF(current_setting('app.current_college_id', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'college_id'))
  )
  WITH CHECK (
    current_setting('app.is_super_admin', true) = 'true' OR
    college_id::text = COALESCE(NULLIF(current_setting('app.current_college_id', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'college_id'))
  );

-- 13. Confession Comments
ALTER TABLE confession_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_policy" ON confession_comments;
CREATE POLICY "tenant_isolation_policy" ON confession_comments
  AS RESTRICTIVE
  USING (
    current_setting('app.is_super_admin', true) = 'true' OR
    college_id::text = COALESCE(NULLIF(current_setting('app.current_college_id', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'college_id'))
  )
  WITH CHECK (
    current_setting('app.is_super_admin', true) = 'true' OR
    college_id::text = COALESCE(NULLIF(current_setting('app.current_college_id', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'college_id'))
  );

-- 14. Confession Reports — moderation-only visibility within the tenant
ALTER TABLE confession_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_policy" ON confession_reports;
CREATE POLICY "tenant_isolation_policy" ON confession_reports
  AS RESTRICTIVE
  USING (
    current_setting('app.is_super_admin', true) = 'true' OR
    college_id::text = COALESCE(NULLIF(current_setting('app.current_college_id', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'college_id'))
  )
  WITH CHECK (
    current_setting('app.is_super_admin', true) = 'true' OR
    college_id::text = COALESCE(NULLIF(current_setting('app.current_college_id', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'college_id'))
  );

-- 15. Moderation Cases — moderation-only visibility
ALTER TABLE moderation_cases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_policy" ON moderation_cases;
CREATE POLICY "tenant_isolation_policy" ON moderation_cases
  AS RESTRICTIVE
  USING (
    current_setting('app.is_super_admin', true) = 'true' OR
    college_id::text = COALESCE(NULLIF(current_setting('app.current_college_id', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'college_id'))
  )
  WITH CHECK (
    current_setting('app.is_super_admin', true) = 'true' OR
    college_id::text = COALESCE(NULLIF(current_setting('app.current_college_id', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'college_id'))
  );

-- 16. Moderation Actions — immutable moderation audit trail
ALTER TABLE moderation_actions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_policy" ON moderation_actions;
CREATE POLICY "tenant_isolation_policy" ON moderation_actions
  AS RESTRICTIVE
  USING (
    current_setting('app.is_super_admin', true) = 'true' OR
    college_id::text = COALESCE(NULLIF(current_setting('app.current_college_id', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'college_id'))
  )
  WITH CHECK (
    current_setting('app.is_super_admin', true) = 'true' OR
    college_id::text = COALESCE(NULLIF(current_setting('app.current_college_id', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'college_id'))
  );

-- 17. Moderator Notes — internal to moderators only
ALTER TABLE moderator_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_policy" ON moderator_notes;
CREATE POLICY "tenant_isolation_policy" ON moderator_notes
  AS RESTRICTIVE
  USING (
    current_setting('app.is_super_admin', true) = 'true' OR
    college_id::text = COALESCE(NULLIF(current_setting('app.current_college_id', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'college_id'))
  )
  WITH CHECK (
    current_setting('app.is_super_admin', true) = 'true' OR
    college_id::text = COALESCE(NULLIF(current_setting('app.current_college_id', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'college_id'))
  );

-- 18. Anonymous Thread Identities — the anonymity security boundary.
-- Access must be restricted to super admins and the tenant context; ordinary
-- users must never read this table (would deanonymize pseudonyms).
ALTER TABLE anonymous_thread_identities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_policy" ON anonymous_thread_identities;
CREATE POLICY "tenant_isolation_policy" ON anonymous_thread_identities
  AS RESTRICTIVE
  USING (
    current_setting('app.is_super_admin', true) = 'true' OR
    college_id::text = COALESCE(NULLIF(current_setting('app.current_college_id', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'college_id'))
  )
  WITH CHECK (
    current_setting('app.is_super_admin', true) = 'true' OR
    college_id::text = COALESCE(NULLIF(current_setting('app.current_college_id', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'college_id'))
  );
