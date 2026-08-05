-- ==============================================================================
-- College Hub Platform — Combined Supabase Production Migration Script
-- ==============================================================================

-- 1. Helper Functions & Session Context
CREATE OR REPLACE FUNCTION set_tenant_context(p_college_id text, p_is_super_admin boolean DEFAULT false)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_college_id', p_college_id, true);
  PERFORM set_config('app.is_super_admin', CASE WHEN p_is_super_admin THEN 'true' ELSE 'false' END, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS text AS $$
BEGIN
  RETURN COALESCE(
    NULLIF(current_setting('app.current_college_id', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'college_id')
  );
END;
$$ LANGUAGE plpgsql STABLE;

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

CREATE OR REPLACE FUNCTION trigger_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 3. Core Database Tables
CREATE TABLE IF NOT EXISTS college_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INT NOT NULL DEFAULT 1,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  allowed_email_domains JSONB NOT NULL,
  theme JSONB NOT NULL,
  enabled_modules JSONB NOT NULL,
  moderation_policy JSONB NOT NULL,
  tier VARCHAR(50) NOT NULL DEFAULT 'FREE',
  custom_domain VARCHAR(255),
  created_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP(3) WITH TIME ZONE
);

CREATE UNIQUE INDEX IF NOT EXISTS college_tenants_slug_idx ON college_tenants (slug);
CREATE INDEX IF NOT EXISTS college_tenants_custom_domain_idx ON college_tenants (custom_domain);
CREATE INDEX IF NOT EXISTS college_tenants_deleted_at_idx ON college_tenants (deleted_at);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INT NOT NULL DEFAULT 1,
  college_id UUID NOT NULL REFERENCES college_tenants (id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  username VARCHAR(100) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'STUDENT',
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING_VERIFICATION',
  is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  avatar_url VARCHAR(500),
  failed_login_attempts INT NOT NULL DEFAULT 0,
  lockout_until TIMESTAMP(3) WITH TIME ZONE,
  anonymous_token_salt VARCHAR(255),
  created_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP(3) WITH TIME ZONE
);

CREATE UNIQUE INDEX IF NOT EXISTS users_username_idx ON users (username);
CREATE UNIQUE INDEX IF NOT EXISTS users_college_email_idx ON users (college_id, email);
CREATE INDEX IF NOT EXISTS users_college_id_idx ON users (college_id);
CREATE INDEX IF NOT EXISTS users_deleted_at_idx ON users (deleted_at);

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INT NOT NULL DEFAULT 1,
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  college_id UUID NOT NULL REFERENCES college_tenants (id) ON DELETE CASCADE,
  refresh_token_hash VARCHAR(255) NOT NULL,
  device_id VARCHAR(255) NOT NULL,
  device_info VARCHAR(500) NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMP(3) WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_sessions_user_id_idx ON user_sessions (user_id);
CREATE INDEX IF NOT EXISTS user_sessions_college_id_idx ON user_sessions (college_id);

CREATE TABLE IF NOT EXISTS email_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INT NOT NULL DEFAULT 1,
  college_id UUID NOT NULL REFERENCES college_tenants (id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  otp_hash VARCHAR(255) NOT NULL,
  attempts_count INT NOT NULL DEFAULT 0,
  is_used BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMP(3) WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INT NOT NULL DEFAULT 1,
  college_id UUID NOT NULL REFERENCES college_tenants (id) ON DELETE CASCADE,
  actor_user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  actor_role VARCHAR(50) NOT NULL,
  action VARCHAR(100) NOT NULL,
  target_entity_id VARCHAR(255) NOT NULL,
  target_entity_type VARCHAR(100) NOT NULL,
  old_value JSONB,
  new_value JSONB,
  ip_address VARCHAR(45) NOT NULL,
  user_agent TEXT NOT NULL,
  created_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS academic_schemes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INT NOT NULL DEFAULT 1,
  code VARCHAR(32) NOT NULL,
  title VARCHAR(128) NOT NULL,
  effective_year INT NOT NULL,
  created_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP(3) WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS resource_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INT NOT NULL DEFAULT 1,
  code VARCHAR(32) NOT NULL,
  display_label VARCHAR(64) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP(3) WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS academic_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INT NOT NULL DEFAULT 1,
  college_id UUID NOT NULL REFERENCES college_tenants (id) ON DELETE CASCADE,
  uploader_user_id UUID NOT NULL,
  title VARCHAR(256) NOT NULL,
  slug VARCHAR(300) NOT NULL,
  description TEXT,
  academic_year VARCHAR(16) NOT NULL,
  semester_number INT NOT NULL,
  is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
  status VARCHAR(32) NOT NULL DEFAULT 'APPROVED',
  created_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP(3) WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS academic_resources_college_uploader_idx ON academic_resources (college_id, uploader_user_id);

CREATE TABLE IF NOT EXISTS confession_categories (
  code VARCHAR(32) PRIMARY KEY,
  name VARCHAR(64) NOT NULL,
  description TEXT,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS confessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id VARCHAR(64) NOT NULL,
  category_code VARCHAR(32) NOT NULL REFERENCES confession_categories (code),
  title VARCHAR(256) NOT NULL,
  slug VARCHAR(300) NOT NULL,
  content TEXT NOT NULL,
  author_thread_pseudonym VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'PUBLISHED',
  upvotes_count INT NOT NULL DEFAULT 0,
  comments_count INT NOT NULL DEFAULT 0,
  reports_count INT NOT NULL DEFAULT 0,
  rank_score NUMERIC(10, 4) NOT NULL DEFAULT 0.0000,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_confessions_tenant_status_rank ON confessions (college_id, status, rank_score);

CREATE TABLE IF NOT EXISTS marketplace_categories (
  code VARCHAR(32) PRIMARY KEY,
  display_name VARCHAR(128) NOT NULL,
  description TEXT,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS marketplace_conditions (
  code VARCHAR(32) PRIMARY KEY,
  display_name VARCHAR(128) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS marketplace_listings (
  id VARCHAR(64) PRIMARY KEY,
  college_id VARCHAR(64) NOT NULL,
  seller_user_id VARCHAR(64) NOT NULL,
  category_code VARCHAR(32) NOT NULL REFERENCES marketplace_categories (code),
  title VARCHAR(256) NOT NULL,
  slug VARCHAR(300) NOT NULL,
  description TEXT,
  condition_code VARCHAR(32) NOT NULL REFERENCES marketplace_conditions (code),
  price_inr NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  pickup_location_name VARCHAR(256) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'PUBLISHED',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_mp_listings_college_cat ON marketplace_listings (college_id, status, category_code);

CREATE TABLE IF NOT EXISTS rate_my_professor_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INT NOT NULL DEFAULT 1,
  college_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  created_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP(3) WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS professors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INT NOT NULL DEFAULT 1,
  college_id UUID NOT NULL,
  department_id UUID NOT NULL REFERENCES rate_my_professor_departments (id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  designation VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP(3) WITH TIME ZONE
);

CREATE UNIQUE INDEX IF NOT EXISTS prof_college_slug_idx ON professors (college_id, slug);

CREATE TABLE IF NOT EXISTS report_reasons (
  code VARCHAR(32) PRIMARY KEY,
  label VARCHAR(64) NOT NULL,
  severity_level INT NOT NULL DEFAULT 3,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS notification_channels (
  id TEXT PRIMARY KEY,
  channel_name TEXT UNIQUE NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  config JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- 4. Storage Buckets Setup
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'marketplace',
  'marketplace',
  true,
  20971520,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'materials',
  'materials',
  false,
  52428800,
  ARRAY['application/pdf', 'application/zip', 'application/x-zip-compressed', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png', 'image/webp', 'text/plain']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  52428800,
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain', 'text/csv']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'events',
  'events',
  true,
  20971520,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'misc',
  'misc',
  false,
  52428800,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 5. Row Level Security Policies
DROP POLICY IF EXISTS "Public read access for public buckets" ON storage.objects;
CREATE POLICY "Public read access for public buckets" ON storage.objects
  FOR SELECT USING (bucket_id IN ('avatars', 'marketplace', 'events'));

DROP POLICY IF EXISTS "Authenticated read access for private buckets" ON storage.objects;
CREATE POLICY "Authenticated read access for private buckets" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id IN ('materials', 'documents', 'misc'));

DROP POLICY IF EXISTS "Authenticated insert access" ON storage.objects;
CREATE POLICY "Authenticated insert access" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id IN ('avatars', 'marketplace', 'materials', 'documents', 'events', 'misc'));

DROP POLICY IF EXISTS "Service role storage bypass" ON storage.objects;
CREATE POLICY "Service role storage bypass" ON storage.objects
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE college_tenants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_policy" ON college_tenants;
CREATE POLICY "tenant_isolation_policy" ON college_tenants
  AS RESTRICTIVE
  USING (
    current_setting('app.is_super_admin', true) = 'true' OR
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role') = 'SUPER_ADMIN' OR
    id::text = COALESCE(NULLIF(current_setting('app.current_college_id', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'college_id'))
  );

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_policy" ON users;
CREATE POLICY "tenant_isolation_policy" ON users
  AS RESTRICTIVE
  USING (
    current_setting('app.is_super_admin', true) = 'true' OR
    college_id::text = COALESCE(NULLIF(current_setting('app.current_college_id', true), ''), (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'college_id'))
  );

-- 6. Foundation Seed Data
INSERT INTO college_tenants (id, name, slug, allowed_email_domains, theme, enabled_modules, moderation_policy, tier, custom_domain)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'Stanford University',
    'stanford',
    '["@stanford.edu"]'::jsonb,
    '{"primaryColor": "#8C1515", "darkModeDefault": true}'::jsonb,
    '["rate-my-professor", "materials-pyqs", "auth", "marketplace", "confessions", "connect"]'::jsonb,
    '{"confessionsAutoApprove": true}'::jsonb,
    'ENTERPRISE',
    'stanford.collegehub.edu'
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'Massachusetts Institute of Technology',
    'mit',
    '["@mit.edu"]'::jsonb,
    '{"primaryColor": "#A31F34", "darkModeDefault": false}'::jsonb,
    '["rate-my-professor", "marketplace", "confessions", "auth", "connect"]'::jsonb,
    '{"confessionsAutoApprove": false}'::jsonb,
    'PRO',
    'mit.collegehub.edu'
  )
ON CONFLICT (slug) DO NOTHING;

INSERT INTO confession_categories (code, name, description, display_order, is_active)
VALUES
  ('ACADEMICS', 'Academics & Exams', 'Coursework, exams, professors, and grading experiences', 1, true),
  ('CAMPUS_LIFE', 'Campus Life & Dorms', 'Dorm life, dining halls, events, and campus culture', 2, true),
  ('CAREER', 'Career & Internships', 'Interviews, placements, resumes, and career advice', 3, true),
  ('RELATIONSHIPS', 'Crushes & Friendships', 'Dating, friendships, and social dynamics on campus', 4, true),
  ('VENTING', 'Late Night Venting', 'Anonymous thoughts, stress relief, and general rants', 5, true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO marketplace_categories (code, display_name, description, display_order)
VALUES
  ('BOOKS', 'Textbooks & Study Material', 'Course textbooks, reference books, and lab notes', 1),
  ('ELECTRONICS', 'Electronics & Gadgets', 'Laptops, monitors, headphones, calculators, and chargers', 2),
  ('FURNITURE', 'Dorm & Hostel Furniture', 'Study chairs, desks, lamps, and mattresses', 3),
  ('CLOTHING', 'Apparel & Merch', 'College hoodies, jackets, and sports gear', 4),
  ('VEHICLES', 'Bicycles & Scooters', 'Campus bicycles, electric scooters, and helmets', 5),
  ('MISC', 'Miscellaneous Items', 'General items, sports equipment, and accessories', 6)
ON CONFLICT (code) DO NOTHING;

INSERT INTO marketplace_conditions (code, display_name, description)
VALUES
  ('NEW', 'Brand New', 'Unused in original packaging'),
  ('LIKE_NEW', 'Like New', 'Mint condition, used very briefly'),
  ('GOOD', 'Good Condition', 'Minor cosmetic wear, fully functional'),
  ('FAIR', 'Fair Condition', 'Noticeable signs of use, fully working')
ON CONFLICT (code) DO NOTHING;

INSERT INTO report_reasons (code, label, severity_level, is_active)
VALUES
  ('SPAM', 'Spam / Commercial Advertising', 3, true),
  ('HARASSMENT', 'Harassment / Bullying', 1, true),
  ('HATE_SPEECH', 'Hate Speech / Discrimination', 1, true),
  ('DOXXING', 'Personal Info Exposure (Doxxing)', 1, true),
  ('COPYRIGHT', 'Copyright Infringement', 2, true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO notification_channels (id, channel_name, is_enabled, config)
VALUES
  ('chan-in-app', 'IN_APP', true, '{}'::jsonb),
  ('chan-email', 'EMAIL', true, '{}'::jsonb),
  ('chan-push', 'PUSH', true, '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;
