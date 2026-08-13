-- ==============================================================================
-- College Hub Platform — Comprehensive Supabase PostgreSQL Database Schema
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ==============================================================================
-- SECTION 1: CORE PLATFORM & TENANCY (packages/database)
-- ==============================================================================

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
CREATE INDEX IF NOT EXISTS user_sessions_token_hash_idx ON user_sessions (refresh_token_hash);
CREATE INDEX IF NOT EXISTS user_sessions_device_id_idx ON user_sessions (user_id, device_id);

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

CREATE INDEX IF NOT EXISTS email_otps_email_college_idx ON email_otps (college_id, email);
CREATE INDEX IF NOT EXISTS email_otps_expires_at_idx ON email_otps (expires_at);

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

CREATE INDEX IF NOT EXISTS audit_logs_college_id_idx ON audit_logs (college_id);
CREATE INDEX IF NOT EXISTS audit_logs_actor_user_id_idx ON audit_logs (actor_user_id);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON audit_logs (college_id, action);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs (created_at);

-- ==============================================================================
-- SECTION 2: PLATFORM FEATURE FLAGS (packages/platform-feature-flags)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS feature_flags (
  id VARCHAR(64) PRIMARY KEY,
  flag_key VARCHAR(128) NOT NULL,
  environment VARCHAR(32) NOT NULL DEFAULT 'PRODUCTION',
  default_state BOOLEAN NOT NULL DEFAULT FALSE,
  lifecycle_stage VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
  version INT NOT NULL DEFAULT 1,
  created_by VARCHAR(128) NOT NULL DEFAULT 'system',
  updated_by VARCHAR(128) NOT NULL DEFAULT 'system',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_feature_flags_key_env ON feature_flags (flag_key, environment);
CREATE INDEX IF NOT EXISTS idx_feature_flags_lifecycle ON feature_flags (lifecycle_stage);
CREATE INDEX IF NOT EXISTS idx_feature_flags_deleted ON feature_flags (deleted_at);

CREATE TABLE IF NOT EXISTS feature_groups (
  id VARCHAR(64) PRIMARY KEY,
  group_key VARCHAR(128) UNIQUE NOT NULL,
  title VARCHAR(256) NOT NULL,
  description TEXT,
  is_group_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  version INT NOT NULL DEFAULT 1,
  created_by VARCHAR(128) NOT NULL DEFAULT 'system',
  updated_by VARCHAR(128) NOT NULL DEFAULT 'system',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_feature_groups_key ON feature_groups (group_key);
CREATE INDEX IF NOT EXISTS idx_feature_groups_deleted ON feature_groups (deleted_at);

CREATE TABLE IF NOT EXISTS feature_group_members (
  group_id VARCHAR(64) NOT NULL REFERENCES feature_groups (id) ON DELETE CASCADE,
  flag_key VARCHAR(128) NOT NULL,
  added_by VARCHAR(128) NOT NULL DEFAULT 'system',
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (group_id, flag_key)
);

CREATE INDEX IF NOT EXISTS idx_group_members_flag ON feature_group_members (flag_key);

CREATE TABLE IF NOT EXISTS feature_dependencies (
  id VARCHAR(64) PRIMARY KEY,
  parent_flag_key VARCHAR(128) NOT NULL,
  child_flag_key VARCHAR(128) NOT NULL,
  dependency_type VARCHAR(32) NOT NULL DEFAULT 'REQUIRED',
  validation_status VARCHAR(32) NOT NULL DEFAULT 'VALIDATED',
  created_by VARCHAR(128) NOT NULL DEFAULT 'system',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_feature_deps_parent_child ON feature_dependencies (parent_flag_key, child_flag_key);
CREATE INDEX IF NOT EXISTS idx_feature_deps_child ON feature_dependencies (child_flag_key);

CREATE TABLE IF NOT EXISTS feature_metadata (
  flag_key VARCHAR(128) PRIMARY KEY,
  owner_team VARCHAR(128) NOT NULL,
  lead_email VARCHAR(256) NOT NULL,
  description TEXT NOT NULL,
  documentation_url TEXT,
  production_ready BOOLEAN NOT NULL DEFAULT FALSE,
  removal_target_date TIMESTAMP WITH TIME ZONE,
  created_by VARCHAR(128) NOT NULL DEFAULT 'system',
  updated_by VARCHAR(128) NOT NULL DEFAULT 'system',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feature_metadata_owner ON feature_metadata (owner_team);

CREATE TABLE IF NOT EXISTS feature_tags (
  flag_key VARCHAR(128) NOT NULL,
  tag_key VARCHAR(64) NOT NULL,
  tag_value VARCHAR(128) NOT NULL,
  PRIMARY KEY (flag_key, tag_key)
);

CREATE INDEX IF NOT EXISTS idx_feature_tags_kv ON feature_tags (tag_key, tag_value);

CREATE TABLE IF NOT EXISTS feature_documentation (
  id VARCHAR(64) PRIMARY KEY,
  flag_key VARCHAR(128) NOT NULL,
  runbook_markdown TEXT NOT NULL,
  architecture_spec_url TEXT,
  updated_by VARCHAR(128) NOT NULL DEFAULT 'system',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feature_doc_flag ON feature_documentation (flag_key);

CREATE TABLE IF NOT EXISTS rollout_policies (
  id VARCHAR(64) PRIMARY KEY,
  flag_key VARCHAR(128) NOT NULL,
  policy_type VARCHAR(32) NOT NULL DEFAULT 'CANARY',
  percentage INT NOT NULL DEFAULT 0,
  is_paused BOOLEAN NOT NULL DEFAULT FALSE,
  version INT NOT NULL DEFAULT 1,
  created_by VARCHAR(128) NOT NULL DEFAULT 'system',
  updated_by VARCHAR(128) NOT NULL DEFAULT 'system',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rollout_policies_flag ON rollout_policies (flag_key);

CREATE TABLE IF NOT EXISTS rollout_targets (
  id VARCHAR(64) PRIMARY KEY,
  policy_id VARCHAR(64) NOT NULL REFERENCES rollout_policies (id) ON DELETE CASCADE,
  target_attribute VARCHAR(64) NOT NULL,
  target_value VARCHAR(256) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rollout_targets_policy ON rollout_targets (policy_id);

CREATE TABLE IF NOT EXISTS college_overrides (
  id VARCHAR(64) PRIMARY KEY,
  college_id VARCHAR(128) NOT NULL,
  flag_key VARCHAR(128) NOT NULL,
  override_state BOOLEAN NOT NULL,
  reason_note TEXT,
  created_by VARCHAR(128) NOT NULL DEFAULT 'system',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_college_overrides_tenant_flag ON college_overrides (college_id, flag_key);
CREATE INDEX IF NOT EXISTS idx_college_overrides_college ON college_overrides (college_id);

CREATE TABLE IF NOT EXISTS role_overrides (
  id VARCHAR(64) PRIMARY KEY,
  role_name VARCHAR(64) NOT NULL,
  flag_key VARCHAR(128) NOT NULL,
  override_state BOOLEAN NOT NULL,
  created_by VARCHAR(128) NOT NULL DEFAULT 'system',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_role_overrides_role_flag ON role_overrides (role_name, flag_key);

CREATE TABLE IF NOT EXISTS user_overrides (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL,
  flag_key VARCHAR(128) NOT NULL,
  override_state BOOLEAN NOT NULL,
  created_by VARCHAR(128) NOT NULL DEFAULT 'system',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_overrides_user_flag ON user_overrides (user_id, flag_key);
CREATE INDEX IF NOT EXISTS idx_user_overrides_user ON user_overrides (user_id);

CREATE TABLE IF NOT EXISTS maintenance_windows (
  id VARCHAR(64) PRIMARY KEY,
  module_key VARCHAR(128) NOT NULL,
  college_id VARCHAR(128),
  is_maintenance_active BOOLEAN NOT NULL DEFAULT TRUE,
  reason_note TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  created_by VARCHAR(128) NOT NULL DEFAULT 'system',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_maint_module_active ON maintenance_windows (module_key, is_maintenance_active);

CREATE TABLE IF NOT EXISTS kill_switches (
  id VARCHAR(64) PRIMARY KEY,
  flag_key VARCHAR(128) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  emergency_reason TEXT NOT NULL,
  operator_user_id VARCHAR(128) NOT NULL,
  tripped_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  released_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_kill_switches_flag_active ON kill_switches (flag_key, is_active);

CREATE TABLE IF NOT EXISTS feature_versions (
  id VARCHAR(64) PRIMARY KEY,
  flag_key VARCHAR(128) NOT NULL,
  version INT NOT NULL,
  snapshot_payload_json JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_feature_versions_key_ver ON feature_versions (flag_key, version);

CREATE TABLE IF NOT EXISTS feature_audit_logs (
  id VARCHAR(64) PRIMARY KEY,
  flag_key VARCHAR(128) NOT NULL,
  actor_user_id VARCHAR(128) NOT NULL,
  actor_ip_address VARCHAR(64),
  action_type VARCHAR(64) NOT NULL,
  previous_state_json JSONB,
  new_state_json JSONB NOT NULL,
  reason_note TEXT NOT NULL,
  request_id VARCHAR(128),
  approval_request_id VARCHAR(64),
  hmac_signature VARCHAR(256) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_flag_created ON feature_audit_logs (flag_key, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON feature_audit_logs (actor_user_id);

CREATE TABLE IF NOT EXISTS approval_requests (
  id VARCHAR(64) PRIMARY KEY,
  flag_key VARCHAR(128) NOT NULL,
  requester_user_id VARCHAR(128) NOT NULL,
  policy_template VARCHAR(64) NOT NULL DEFAULT 'HIGH_RISK',
  status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  proposed_changes_json JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_approval_req_flag_status ON approval_requests (flag_key, status);

CREATE TABLE IF NOT EXISTS approval_actions (
  id VARCHAR(64) PRIMARY KEY,
  request_id VARCHAR(64) NOT NULL REFERENCES approval_requests (id) ON DELETE CASCADE,
  reviewer_user_id VARCHAR(128) NOT NULL,
  decision VARCHAR(32) NOT NULL,
  reason_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_actions_req ON approval_actions (request_id);

CREATE TABLE IF NOT EXISTS rollout_history (
  id VARCHAR(64) PRIMARY KEY,
  flag_key VARCHAR(128) NOT NULL,
  previous_percentage INT NOT NULL,
  new_percentage INT NOT NULL,
  operator_user_id VARCHAR(128) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rollout_history_flag ON rollout_history (flag_key);

CREATE TABLE IF NOT EXISTS feature_snapshots (
  id VARCHAR(64) PRIMARY KEY,
  environment VARCHAR(32) NOT NULL,
  created_by_user_id VARCHAR(128) NOT NULL,
  reason_note TEXT NOT NULL,
  snapshot_payload_json JSONB NOT NULL,
  hmac_signature VARCHAR(256) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feature_snapshots_env_created ON feature_snapshots (environment, created_at);

CREATE TABLE IF NOT EXISTS feature_usage_statistics (
  id VARCHAR(64) PRIMARY KEY,
  flag_key VARCHAR(128) NOT NULL,
  college_id VARCHAR(128) NOT NULL DEFAULT 'global',
  time_bucket TIMESTAMP WITH TIME ZONE NOT NULL,
  evaluations_count INT NOT NULL DEFAULT 0,
  enabled_count INT NOT NULL DEFAULT 0,
  disabled_count INT NOT NULL DEFAULT 0,
  unique_users_count INT NOT NULL DEFAULT 0,
  error_count INT NOT NULL DEFAULT 0,
  cache_hit_count INT NOT NULL DEFAULT 0,
  cache_miss_count INT NOT NULL DEFAULT 0,
  last_evaluated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_usage_stats_key_college_bucket ON feature_usage_statistics (flag_key, college_id, time_bucket);

CREATE TABLE IF NOT EXISTS stale_feature_reports (
  id VARCHAR(64) PRIMARY KEY,
  flag_key VARCHAR(128) NOT NULL,
  days_constant_evaluations INT NOT NULL,
  constant_value BOOLEAN NOT NULL,
  owner_team VARCHAR(128) NOT NULL,
  reported_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stale_reports_flag ON stale_feature_reports (flag_key);

-- ==============================================================================
-- SECTION 3: ACADEMIC RESOURCE HUB (modules/academic-resource-hub)
-- ==============================================================================

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

CREATE UNIQUE INDEX IF NOT EXISTS academic_schemes_code_idx ON academic_schemes (code);

CREATE TABLE IF NOT EXISTS exam_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INT NOT NULL DEFAULT 1,
  code VARCHAR(32) NOT NULL,
  display_label VARCHAR(64) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP(3) WITH TIME ZONE
);

CREATE UNIQUE INDEX IF NOT EXISTS exam_types_code_idx ON exam_types (code);

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

CREATE UNIQUE INDEX IF NOT EXISTS resource_types_code_idx ON resource_types (code);

CREATE TABLE IF NOT EXISTS colleges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INT NOT NULL DEFAULT 1,
  name VARCHAR(256) NOT NULL,
  slug VARCHAR(128) NOT NULL,
  created_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP(3) WITH TIME ZONE
);

CREATE UNIQUE INDEX IF NOT EXISTS colleges_slug_idx ON colleges (slug);

CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INT NOT NULL DEFAULT 1,
  college_id UUID NOT NULL REFERENCES colleges (id) ON DELETE CASCADE,
  code VARCHAR(32) NOT NULL,
  name VARCHAR(128) NOT NULL,
  created_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP(3) WITH TIME ZONE
);

CREATE UNIQUE INDEX IF NOT EXISTS departments_college_code_idx ON departments (college_id, code);

CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INT NOT NULL DEFAULT 1,
  college_id UUID NOT NULL REFERENCES colleges (id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments (id) ON DELETE CASCADE,
  code VARCHAR(32) NOT NULL,
  name VARCHAR(256) NOT NULL,
  semester_number INT NOT NULL,
  created_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP(3) WITH TIME ZONE
);

CREATE UNIQUE INDEX IF NOT EXISTS subjects_college_code_idx ON subjects (college_id, code);
CREATE INDEX IF NOT EXISTS subjects_college_sem_idx ON subjects (college_id, semester_number);

CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INT NOT NULL DEFAULT 1,
  college_id UUID NOT NULL REFERENCES colleges (id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments (id) ON DELETE CASCADE,
  code VARCHAR(32) NOT NULL,
  title VARCHAR(256) NOT NULL,
  created_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP(3) WITH TIME ZONE
);

CREATE UNIQUE INDEX IF NOT EXISTS courses_college_code_idx ON courses (college_id, code);

CREATE TABLE IF NOT EXISTS academic_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INT NOT NULL DEFAULT 1,
  college_id UUID NOT NULL REFERENCES colleges (id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments (id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects (id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses (id) ON DELETE SET NULL,
  scheme_id UUID REFERENCES academic_schemes (id) ON DELETE SET NULL,
  exam_type_id UUID REFERENCES exam_types (id) ON DELETE SET NULL,
  resource_type_id UUID NOT NULL REFERENCES resource_types (id) ON DELETE RESTRICT,
  uploader_user_id UUID NOT NULL,
  title VARCHAR(256) NOT NULL,
  slug VARCHAR(300) NOT NULL,
  description TEXT,
  academic_year VARCHAR(16) NOT NULL,
  semester_number INT NOT NULL,
  is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
  author_display_name VARCHAR(128),
  status VARCHAR(32) NOT NULL DEFAULT 'APPROVED',
  verification_status VARCHAR(32) NOT NULL DEFAULT 'UNVERIFIED',
  current_version_id UUID,
  created_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP(3) WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS academic_resources_college_subject_status_idx ON academic_resources (college_id, subject_id, status);
CREATE INDEX IF NOT EXISTS academic_resources_college_uploader_idx ON academic_resources (college_id, uploader_user_id);

CREATE TABLE IF NOT EXISTS resource_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INT NOT NULL DEFAULT 1,
  resource_id UUID NOT NULL REFERENCES academic_resources (id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  changelog_notes TEXT,
  created_by_user_id UUID NOT NULL,
  created_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP(3) WITH TIME ZONE
);

CREATE UNIQUE INDEX IF NOT EXISTS resource_versions_resource_version_idx ON resource_versions (resource_id, version_number);

CREATE TABLE IF NOT EXISTS resource_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INT NOT NULL DEFAULT 1,
  version_id UUID NOT NULL REFERENCES resource_versions (id) ON DELETE CASCADE,
  storage_provider VARCHAR(32) NOT NULL DEFAULT 'S3',
  storage_key VARCHAR(512) NOT NULL,
  file_name VARCHAR(256) NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  mime_type VARCHAR(128) NOT NULL,
  sha256_hash VARCHAR(64) NOT NULL,
  page_count INT,
  has_preview BOOLEAN NOT NULL DEFAULT FALSE,
  virus_scan_status VARCHAR(32) NOT NULL DEFAULT 'CLEAN',
  created_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP(3) WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS resource_files_sha256_hash_idx ON resource_files (sha256_hash);
CREATE INDEX IF NOT EXISTS resource_files_version_idx ON resource_files (version_id);

CREATE TABLE IF NOT EXISTS study_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INT NOT NULL DEFAULT 1,
  college_id UUID NOT NULL REFERENCES colleges (id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL,
  title VARCHAR(256) NOT NULL,
  description TEXT,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP(3) WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS study_collections_college_owner_idx ON study_collections (college_id, owner_user_id);

CREATE TABLE IF NOT EXISTS collection_resources (
  collection_id UUID NOT NULL REFERENCES study_collections (id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES academic_resources (id) ON DELETE CASCADE,
  position_order INT NOT NULL DEFAULT 0,
  section_header VARCHAR(128),
  created_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (collection_id, resource_id)
);

CREATE TABLE IF NOT EXISTS resource_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INT NOT NULL DEFAULT 1,
  source_resource_id UUID NOT NULL REFERENCES academic_resources (id) ON DELETE CASCADE,
  target_resource_id UUID NOT NULL REFERENCES academic_resources (id) ON DELETE CASCADE,
  relationship_type VARCHAR(64) NOT NULL,
  created_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP(3) WITH TIME ZONE
);

CREATE UNIQUE INDEX IF NOT EXISTS resource_relationships_unique_idx ON resource_relationships (source_resource_id, target_resource_id, relationship_type);

CREATE TABLE IF NOT EXISTS resource_votes (
  college_id UUID NOT NULL REFERENCES colleges (id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES academic_resources (id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  vote_type VARCHAR(16) NOT NULL,
  created_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (resource_id, user_id)
);

CREATE TABLE IF NOT EXISTS resource_bookmarks (
  college_id UUID NOT NULL REFERENCES colleges (id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES academic_resources (id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (resource_id, user_id)
);

CREATE TABLE IF NOT EXISTS resource_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INT NOT NULL DEFAULT 1,
  college_id UUID NOT NULL REFERENCES colleges (id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES academic_resources (id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  ip_address VARCHAR(64),
  downloaded_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS resource_downloads_college_resource_idx ON resource_downloads (college_id, resource_id);

CREATE TABLE IF NOT EXISTS resource_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INT NOT NULL DEFAULT 1,
  college_id UUID NOT NULL REFERENCES colleges (id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES academic_resources (id) ON DELETE CASCADE,
  user_id UUID,
  ip_address VARCHAR(64),
  viewed_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS resource_views_college_resource_idx ON resource_views (college_id, resource_id);

CREATE TABLE IF NOT EXISTS resource_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INT NOT NULL DEFAULT 1,
  college_id UUID NOT NULL REFERENCES colleges (id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES academic_resources (id) ON DELETE CASCADE,
  reporter_user_id UUID NOT NULL,
  reason VARCHAR(64) NOT NULL,
  details TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP(3) WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS resource_reports_resource_status_idx ON resource_reports (resource_id, status);

CREATE TABLE IF NOT EXISTS resource_statistics (
  resource_id UUID PRIMARY KEY REFERENCES academic_resources (id) ON DELETE CASCADE,
  college_id UUID NOT NULL REFERENCES colleges (id) ON DELETE CASCADE,
  total_downloads INT NOT NULL DEFAULT 0,
  total_views INT NOT NULL DEFAULT 0,
  helpful_votes INT NOT NULL DEFAULT 0,
  unhelpful_votes INT NOT NULL DEFAULT 0,
  report_count INT NOT NULL DEFAULT 0,
  bookmark_count INT NOT NULL DEFAULT 0,
  bayesian_quality_score NUMERIC(4, 2) NOT NULL DEFAULT 0.00,
  last_calculated_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS resource_statistics_college_score_idx ON resource_statistics (college_id, bayesian_quality_score);

CREATE TABLE IF NOT EXISTS contributors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INT NOT NULL DEFAULT 1,
  college_id UUID NOT NULL REFERENCES colleges (id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reputation_score INT NOT NULL DEFAULT 0,
  total_uploads INT NOT NULL DEFAULT 0,
  total_helpful_votes_received INT NOT NULL DEFAULT 0,
  badge_level VARCHAR(64) NOT NULL DEFAULT 'CONTRIBUTOR',
  created_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP(3) WITH TIME ZONE
);

CREATE UNIQUE INDEX IF NOT EXISTS contributors_user_college_idx ON contributors (user_id, college_id);

-- ==============================================================================
-- SECTION 4: CONFESSIONS MODULE (modules/confessions)
-- ==============================================================================

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
  is_anonymous BOOLEAN NOT NULL DEFAULT TRUE,
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
CREATE INDEX IF NOT EXISTS idx_confessions_tenant_category ON confessions (college_id, category_code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_confessions_tenant_slug ON confessions (college_id, slug);

CREATE TABLE IF NOT EXISTS confession_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id VARCHAR(64) NOT NULL,
  confession_id UUID NOT NULL REFERENCES confessions (id) ON DELETE CASCADE,
  root_comment_id UUID,
  parent_comment_id UUID,
  depth INT NOT NULL DEFAULT 1,
  author_thread_pseudonym VARCHAR(64) NOT NULL,
  content TEXT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  upvotes_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_confession_root ON confession_comments (confession_id, root_comment_id);
CREATE INDEX IF NOT EXISTS idx_comments_tenant_confession ON confession_comments (college_id, confession_id);
CREATE INDEX IF NOT EXISTS idx_comments_tree_flat ON confession_comments (confession_id, root_comment_id, depth);

CREATE TABLE IF NOT EXISTS confession_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id VARCHAR(64) NOT NULL,
  confession_id UUID NOT NULL REFERENCES confessions (id) ON DELETE CASCADE,
  voter_user_id VARCHAR(64) NOT NULL,
  vote_type VARCHAR(16) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_confession_votes_user_unique ON confession_votes (confession_id, voter_user_id);

CREATE TABLE IF NOT EXISTS comment_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id VARCHAR(64) NOT NULL,
  comment_id UUID NOT NULL REFERENCES confession_comments (id) ON DELETE CASCADE,
  voter_user_id VARCHAR(64) NOT NULL,
  vote_type VARCHAR(16) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_comment_votes_user_unique ON comment_votes (comment_id, voter_user_id);

CREATE TABLE IF NOT EXISTS confession_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id VARCHAR(64) NOT NULL,
  confession_id UUID NOT NULL REFERENCES confessions (id) ON DELETE CASCADE,
  user_id VARCHAR(64) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookmarks_user_confession_unique ON confession_bookmarks (user_id, confession_id);

CREATE TABLE IF NOT EXISTS confession_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id VARCHAR(64) NOT NULL,
  confession_id UUID NOT NULL REFERENCES confessions (id) ON DELETE CASCADE,
  reporter_user_id VARCHAR(64) NOT NULL,
  reason_code VARCHAR(32) NOT NULL,
  details TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_user_confession_unique ON confession_reports (reporter_user_id, confession_id);

CREATE TABLE IF NOT EXISTS anonymous_thread_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id VARCHAR(64) NOT NULL,
  confession_id UUID NOT NULL REFERENCES confessions (id) ON DELETE CASCADE,
  user_id_hash VARCHAR(128) NOT NULL,
  assigned_pseudonym VARCHAR(64) NOT NULL,
  is_op BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_anon_identity_thread_user ON anonymous_thread_identities (confession_id, user_id_hash);

CREATE TABLE IF NOT EXISTS moderation_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id VARCHAR(64) NOT NULL,
  confession_id UUID NOT NULL REFERENCES confessions (id) ON DELETE CASCADE,
  severity_level INT NOT NULL DEFAULT 3,
  status VARCHAR(32) NOT NULL DEFAULT 'OPEN',
  total_reports INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mod_cases_severity_status ON moderation_cases (severity_level, status);

CREATE TABLE IF NOT EXISTS moderation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id VARCHAR(64) NOT NULL,
  case_id UUID NOT NULL REFERENCES moderation_cases (id) ON DELETE CASCADE,
  moderator_user_id VARCHAR(64) NOT NULL,
  action VARCHAR(32) NOT NULL,
  reason_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS moderator_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id VARCHAR(64) NOT NULL,
  case_id UUID NOT NULL REFERENCES moderation_cases (id) ON DELETE CASCADE,
  moderator_user_id VARCHAR(64) NOT NULL,
  note_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS confession_statistics (
  confession_id UUID PRIMARY KEY REFERENCES confessions (id) ON DELETE CASCADE,
  college_id VARCHAR(64) NOT NULL,
  total_views INT NOT NULL DEFAULT 0,
  total_upvotes INT NOT NULL DEFAULT 0,
  total_comments INT NOT NULL DEFAULT 0,
  total_reports INT NOT NULL DEFAULT 0,
  trending_score NUMERIC(10, 4) NOT NULL DEFAULT 0.0000,
  hot_score NUMERIC(10, 4) NOT NULL DEFAULT 0.0000,
  recent_score NUMERIC(10, 4) NOT NULL DEFAULT 0.0000,
  controversial_score NUMERIC(10, 4) NOT NULL DEFAULT 0.0000,
  last_calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS confession_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id VARCHAR(64) NOT NULL,
  recipient_user_id VARCHAR(64) NOT NULL,
  notification_type VARCHAR(32) NOT NULL,
  payload_json TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS confession_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id VARCHAR(64) NOT NULL,
  action VARCHAR(64) NOT NULL,
  actor_type VARCHAR(32) NOT NULL,
  entity_id VARCHAR(64) NOT NULL,
  details_json TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ranking_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id VARCHAR(64) NOT NULL,
  snapshot_type VARCHAR(32) NOT NULL,
  top_confession_ids_json TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS report_reasons (
  code VARCHAR(32) PRIMARY KEY,
  label VARCHAR(64) NOT NULL,
  severity_level INT NOT NULL DEFAULT 3,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS confession_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id VARCHAR(64) NOT NULL,
  confession_id UUID NOT NULL REFERENCES confessions (id) ON DELETE CASCADE,
  media_type VARCHAR(32) NOT NULL,
  media_url TEXT NOT NULL,
  mime_type VARCHAR(64) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- SECTION 5: CAMPUS CONNECT MODULE (modules/connect)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS connect_student_profiles (
  id VARCHAR(64) PRIMARY KEY,
  college_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  major VARCHAR(120) NOT NULL,
  class_year INT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  is_verified_student BOOLEAN NOT NULL DEFAULT TRUE,
  trust_score INT NOT NULL DEFAULT 100 CHECK (trust_score >= 0 AND trust_score <= 100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by VARCHAR(64) NOT NULL,
  updated_by VARCHAR(64) NOT NULL,
  version INT NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_connect_student_profiles_college_id ON connect_student_profiles (college_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_connect_student_profiles_user_college ON connect_student_profiles (college_id, user_id);

CREATE TABLE IF NOT EXISTS connect_student_intents (
  id VARCHAR(64) PRIMARY KEY,
  college_id VARCHAR(64) NOT NULL,
  student_profile_id VARCHAR(64) NOT NULL REFERENCES connect_student_profiles (id) ON DELETE CASCADE,
  intent_type VARCHAR(64) NOT NULL,
  title VARCHAR(120) NOT NULL,
  description TEXT,
  course_code VARCHAR(32),
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  priority INT NOT NULL DEFAULT 1 CHECK (priority >= 1 AND priority <= 5),
  availability_state VARCHAR(64) NOT NULL DEFAULT 'AVAILABLE_NOW',
  target_college_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by VARCHAR(64) NOT NULL,
  updated_by VARCHAR(64) NOT NULL,
  version INT NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_connect_student_intents_college_id ON connect_student_intents (college_id);
CREATE INDEX IF NOT EXISTS idx_connect_student_intents_profile ON connect_student_intents (college_id, student_profile_id);
CREATE INDEX IF NOT EXISTS idx_connect_student_intents_discovery ON connect_student_intents (college_id, status, intent_type);

CREATE TABLE IF NOT EXISTS connect_intent_history (
  id VARCHAR(64) PRIMARY KEY,
  college_id VARCHAR(64) NOT NULL,
  intent_id VARCHAR(64) NOT NULL REFERENCES connect_student_intents (id) ON DELETE CASCADE,
  previous_status VARCHAR(32) NOT NULL,
  new_status VARCHAR(32) NOT NULL,
  transition_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by VARCHAR(64) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_connect_intent_history_college_id ON connect_intent_history (college_id);
CREATE INDEX IF NOT EXISTS idx_connect_intent_history_intent ON connect_intent_history (college_id, intent_id);

CREATE TABLE IF NOT EXISTS connect_skills (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(64) UNIQUE NOT NULL,
  category VARCHAR(64) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_connect_skills_name ON connect_skills (name);

CREATE TABLE IF NOT EXISTS connect_student_skills (
  id VARCHAR(64) PRIMARY KEY,
  college_id VARCHAR(64) NOT NULL,
  student_profile_id VARCHAR(64) NOT NULL REFERENCES connect_student_profiles (id) ON DELETE CASCADE,
  skill_id VARCHAR(64) NOT NULL REFERENCES connect_skills (id) ON DELETE RESTRICT,
  proficiency_level VARCHAR(32) NOT NULL DEFAULT 'INTERMEDIATE',
  endorsement_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by VARCHAR(64) NOT NULL,
  updated_by VARCHAR(64) NOT NULL,
  version INT NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_connect_student_skills_college_id ON connect_student_skills (college_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_connect_student_skills_profile_skill ON connect_student_skills (college_id, student_profile_id, skill_id);

CREATE TABLE IF NOT EXISTS connect_interests (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(64) UNIQUE NOT NULL,
  category VARCHAR(64) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_connect_interests_name ON connect_interests (name);

CREATE TABLE IF NOT EXISTS connect_student_interests (
  id VARCHAR(64) PRIMARY KEY,
  college_id VARCHAR(64) NOT NULL,
  student_profile_id VARCHAR(64) NOT NULL REFERENCES connect_student_profiles (id) ON DELETE CASCADE,
  interest_id VARCHAR(64) NOT NULL REFERENCES connect_interests (id) ON DELETE RESTRICT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by VARCHAR(64) NOT NULL,
  updated_by VARCHAR(64) NOT NULL,
  version INT NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_connect_student_interests_college_id ON connect_student_interests (college_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_connect_student_interests_profile_interest ON connect_student_interests (college_id, student_profile_id, interest_id);

CREATE TABLE IF NOT EXISTS connect_clubs (
  id VARCHAR(64) PRIMARY KEY,
  college_id VARCHAR(64) NOT NULL,
  name VARCHAR(120) NOT NULL,
  category VARCHAR(64) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by VARCHAR(64) NOT NULL,
  updated_by VARCHAR(64) NOT NULL,
  version INT NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_connect_clubs_college_id ON connect_clubs (college_id);

CREATE TABLE IF NOT EXISTS connect_student_clubs (
  id VARCHAR(64) PRIMARY KEY,
  college_id VARCHAR(64) NOT NULL,
  student_profile_id VARCHAR(64) NOT NULL REFERENCES connect_student_profiles (id) ON DELETE CASCADE,
  club_id VARCHAR(64) NOT NULL REFERENCES connect_clubs (id) ON DELETE CASCADE,
  role VARCHAR(32) NOT NULL DEFAULT 'MEMBER',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by VARCHAR(64) NOT NULL,
  updated_by VARCHAR(64) NOT NULL,
  version INT NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_connect_student_clubs_college_id ON connect_student_clubs (college_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_connect_student_clubs_profile_club ON connect_student_clubs (college_id, student_profile_id, club_id);

CREATE TABLE IF NOT EXISTS connect_courses (
  id VARCHAR(64) PRIMARY KEY,
  college_id VARCHAR(64) NOT NULL,
  course_code VARCHAR(32) NOT NULL,
  title VARCHAR(120) NOT NULL,
  department VARCHAR(64) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by VARCHAR(64) NOT NULL,
  updated_by VARCHAR(64) NOT NULL,
  version INT NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_connect_courses_college_id ON connect_courses (college_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_connect_courses_college_code ON connect_courses (college_id, course_code);

CREATE TABLE IF NOT EXISTS connect_student_courses (
  id VARCHAR(64) PRIMARY KEY,
  college_id VARCHAR(64) NOT NULL,
  student_profile_id VARCHAR(64) NOT NULL REFERENCES connect_student_profiles (id) ON DELETE CASCADE,
  course_id VARCHAR(64) NOT NULL REFERENCES connect_courses (id) ON DELETE CASCADE,
  academic_term VARCHAR(32) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by VARCHAR(64) NOT NULL,
  updated_by VARCHAR(64) NOT NULL,
  version INT NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_connect_student_courses_college_id ON connect_student_courses (college_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_connect_student_courses_profile_course ON connect_student_courses (college_id, student_profile_id, course_id);

CREATE TABLE IF NOT EXISTS connect_connection_requests (
  id VARCHAR(64) PRIMARY KEY,
  college_id VARCHAR(64) NOT NULL,
  sender_profile_id VARCHAR(64) NOT NULL REFERENCES connect_student_profiles (id) ON DELETE CASCADE,
  receiver_profile_id VARCHAR(64) NOT NULL REFERENCES connect_student_profiles (id) ON DELETE CASCADE,
  originating_intent_id VARCHAR(64) NOT NULL REFERENCES connect_student_intents (id) ON DELETE CASCADE,
  note TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by VARCHAR(64) NOT NULL,
  updated_by VARCHAR(64) NOT NULL,
  version INT NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_connect_connection_requests_college_id ON connect_connection_requests (college_id);
CREATE INDEX IF NOT EXISTS idx_connect_connection_requests_receiver ON connect_connection_requests (college_id, receiver_profile_id, status);

CREATE TABLE IF NOT EXISTS connect_connections (
  id VARCHAR(64) PRIMARY KEY,
  college_id VARCHAR(64) NOT NULL,
  student_a_id VARCHAR(64) NOT NULL REFERENCES connect_student_profiles (id) ON DELETE CASCADE,
  student_b_id VARCHAR(64) NOT NULL REFERENCES connect_student_profiles (id) ON DELETE CASCADE,
  status VARCHAR(32) NOT NULL DEFAULT 'CONNECTED',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by VARCHAR(64) NOT NULL,
  updated_by VARCHAR(64) NOT NULL,
  version INT NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_connect_connections_college_id ON connect_connections (college_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_connect_connections_pairwise ON connect_connections (college_id, student_a_id, student_b_id);

CREATE TABLE IF NOT EXISTS connect_conversations (
  id VARCHAR(64) PRIMARY KEY,
  college_id VARCHAR(64) NOT NULL,
  conversation_type VARCHAR(32) NOT NULL DEFAULT 'DIRECT',
  context_type VARCHAR(64) NOT NULL,
  context_id VARCHAR(64) NOT NULL,
  title VARCHAR(120),
  lifecycle_state VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by VARCHAR(64) NOT NULL,
  updated_by VARCHAR(64) NOT NULL,
  version INT NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_connect_conversations_college_id ON connect_conversations (college_id);
CREATE INDEX IF NOT EXISTS idx_connect_conversations_context ON connect_conversations (college_id, context_type, context_id);

CREATE TABLE IF NOT EXISTS connect_conversation_members (
  id VARCHAR(64) PRIMARY KEY,
  college_id VARCHAR(64) NOT NULL,
  conversation_id VARCHAR(64) NOT NULL REFERENCES connect_conversations (id) ON DELETE CASCADE,
  student_profile_id VARCHAR(64) NOT NULL REFERENCES connect_student_profiles (id) ON DELETE CASCADE,
  last_read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by VARCHAR(64) NOT NULL,
  updated_by VARCHAR(64) NOT NULL,
  version INT NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_connect_conv_members_college_id ON connect_conversation_members (college_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_connect_conv_members_conv_student ON connect_conversation_members (college_id, conversation_id, student_profile_id);

CREATE TABLE IF NOT EXISTS connect_messages (
  id VARCHAR(64) PRIMARY KEY,
  college_id VARCHAR(64) NOT NULL,
  conversation_id VARCHAR(64) NOT NULL REFERENCES connect_conversations (id) ON DELETE CASCADE,
  sender_profile_id VARCHAR(64) NOT NULL REFERENCES connect_student_profiles (id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_soft_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by VARCHAR(64) NOT NULL,
  updated_by VARCHAR(64) NOT NULL,
  version INT NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_connect_messages_college_id ON connect_messages (college_id);
CREATE INDEX IF NOT EXISTS idx_connect_messages_conversation ON connect_messages (college_id, conversation_id, created_at);

CREATE TABLE IF NOT EXISTS connect_message_attachments (
  id VARCHAR(64) PRIMARY KEY,
  college_id VARCHAR(64) NOT NULL,
  message_id VARCHAR(64) NOT NULL REFERENCES connect_messages (id) ON DELETE CASCADE,
  attachment_type VARCHAR(32) NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by VARCHAR(64) NOT NULL,
  updated_by VARCHAR(64) NOT NULL,
  version INT NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_connect_msg_attachments_college_id ON connect_message_attachments (college_id);
CREATE INDEX IF NOT EXISTS idx_connect_msg_attachments_message ON connect_message_attachments (college_id, message_id);

CREATE TABLE IF NOT EXISTS connect_study_groups (
  id VARCHAR(64) PRIMARY KEY,
  college_id VARCHAR(64) NOT NULL,
  course_code VARCHAR(32) NOT NULL,
  title VARCHAR(120) NOT NULL,
  max_capacity INT NOT NULL DEFAULT 5 CHECK (max_capacity >= 2 AND max_capacity <= 20),
  status VARCHAR(32) NOT NULL DEFAULT 'OPEN',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by VARCHAR(64) NOT NULL,
  updated_by VARCHAR(64) NOT NULL,
  version INT NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_connect_study_groups_college_id ON connect_study_groups (college_id);
CREATE INDEX IF NOT EXISTS idx_connect_study_groups_course ON connect_study_groups (college_id, course_code);

CREATE TABLE IF NOT EXISTS connect_project_teams (
  id VARCHAR(64) PRIMARY KEY,
  college_id VARCHAR(64) NOT NULL,
  title VARCHAR(120) NOT NULL,
  description TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'OPEN',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by VARCHAR(64) NOT NULL,
  updated_by VARCHAR(64) NOT NULL,
  version INT NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_connect_project_teams_college_id ON connect_project_teams (college_id);

CREATE TABLE IF NOT EXISTS connect_project_members (
  id VARCHAR(64) PRIMARY KEY,
  college_id VARCHAR(64) NOT NULL,
  project_team_id VARCHAR(64) NOT NULL REFERENCES connect_project_teams (id) ON DELETE CASCADE,
  student_profile_id VARCHAR(64) NOT NULL REFERENCES connect_student_profiles (id) ON DELETE CASCADE,
  role VARCHAR(64) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by VARCHAR(64) NOT NULL,
  updated_by VARCHAR(64) NOT NULL,
  version INT NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_connect_proj_members_college_id ON connect_project_members (college_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_connect_proj_members_team_student ON connect_project_members (college_id, project_team_id, student_profile_id);

CREATE TABLE IF NOT EXISTS connect_mentorships (
  id VARCHAR(64) PRIMARY KEY,
  college_id VARCHAR(64) NOT NULL,
  mentor_profile_id VARCHAR(64) NOT NULL REFERENCES connect_student_profiles (id) ON DELETE CASCADE,
  mentee_profile_id VARCHAR(64) NOT NULL REFERENCES connect_student_profiles (id) ON DELETE CASCADE,
  status VARCHAR(32) NOT NULL DEFAULT 'REQUESTED',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by VARCHAR(64) NOT NULL,
  updated_by VARCHAR(64) NOT NULL,
  version INT NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_connect_mentorships_college_id ON connect_mentorships (college_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_connect_mentorships_pair ON connect_mentorships (college_id, mentor_profile_id, mentee_profile_id);

CREATE TABLE IF NOT EXISTS connect_recommendation_snapshots (
  id VARCHAR(64) PRIMARY KEY,
  college_id VARCHAR(64) NOT NULL,
  source_student_id VARCHAR(64) NOT NULL REFERENCES connect_student_profiles (id) ON DELETE CASCADE,
  target_student_id VARCHAR(64) NOT NULL REFERENCES connect_student_profiles (id) ON DELETE CASCADE,
  overall_compatibility_pct NUMERIC(5, 2) NOT NULL CHECK (overall_compatibility_pct >= 0.00 AND overall_compatibility_pct <= 100.00),
  algorithm_version VARCHAR(32) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by VARCHAR(64) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_connect_rec_snapshots_college_id ON connect_recommendation_snapshots (college_id);
CREATE INDEX IF NOT EXISTS idx_connect_rec_snapshots_source ON connect_recommendation_snapshots (college_id, source_student_id);

CREATE TABLE IF NOT EXISTS connect_recommendation_reasons (
  id VARCHAR(64) PRIMARY KEY,
  college_id VARCHAR(64) NOT NULL,
  snapshot_id VARCHAR(64) NOT NULL REFERENCES connect_recommendation_snapshots (id) ON DELETE CASCADE,
  reason_code VARCHAR(64) NOT NULL,
  weight NUMERIC(3, 2) NOT NULL CHECK (weight >= 0.00 AND weight <= 1.00),
  human_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by VARCHAR(64) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_connect_rec_reasons_college_id ON connect_recommendation_reasons (college_id);
CREATE INDEX IF NOT EXISTS idx_connect_rec_reasons_snapshot ON connect_recommendation_reasons (college_id, snapshot_id);

CREATE TABLE IF NOT EXISTS connect_privacy_settings (
  student_profile_id VARCHAR(64) PRIMARY KEY REFERENCES connect_student_profiles (id) ON DELETE CASCADE,
  college_id VARCHAR(64) NOT NULL,
  is_ghost_mode BOOLEAN NOT NULL DEFAULT FALSE,
  is_incognito_mode BOOLEAN NOT NULL DEFAULT FALSE,
  show_online_indicator BOOLEAN NOT NULL DEFAULT TRUE,
  show_last_active BOOLEAN NOT NULL DEFAULT TRUE,
  daily_request_limit INT NOT NULL DEFAULT 5 CHECK (daily_request_limit >= 1 AND daily_request_limit <= 20),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by VARCHAR(64) NOT NULL,
  updated_by VARCHAR(64) NOT NULL,
  version INT NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_connect_privacy_settings_college_id ON connect_privacy_settings (college_id);

CREATE TABLE IF NOT EXISTS connect_visibility_preferences (
  student_profile_id VARCHAR(64) PRIMARY KEY REFERENCES connect_student_profiles (id) ON DELETE CASCADE,
  college_id VARCHAR(64) NOT NULL,
  visibility_scope VARCHAR(32) NOT NULL DEFAULT 'VISIBLE_ALL',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by VARCHAR(64) NOT NULL,
  updated_by VARCHAR(64) NOT NULL,
  version INT NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_connect_visibility_prefs_college_id ON connect_visibility_preferences (college_id);

CREATE TABLE IF NOT EXISTS connect_notifications (
  id VARCHAR(64) PRIMARY KEY,
  college_id VARCHAR(64) NOT NULL,
  recipient_profile_id VARCHAR(64) NOT NULL REFERENCES connect_student_profiles (id) ON DELETE CASCADE,
  category VARCHAR(64) NOT NULL,
  title VARCHAR(120) NOT NULL,
  body TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by VARCHAR(64) NOT NULL,
  updated_by VARCHAR(64) NOT NULL,
  version INT NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_connect_notifications_college_id ON connect_notifications (college_id);
CREATE INDEX IF NOT EXISTS idx_connect_notifications_recipient ON connect_notifications (college_id, recipient_profile_id, is_read);

CREATE TABLE IF NOT EXISTS connect_activity_feed (
  id VARCHAR(64) PRIMARY KEY,
  college_id VARCHAR(64) NOT NULL,
  actor_profile_id VARCHAR(64) NOT NULL REFERENCES connect_student_profiles (id) ON DELETE CASCADE,
  action_type VARCHAR(64) NOT NULL,
  display_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by VARCHAR(64) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_connect_activity_feed_college_id ON connect_activity_feed (college_id);

CREATE TABLE IF NOT EXISTS connect_moderation_cases (
  id VARCHAR(64) PRIMARY KEY,
  college_id VARCHAR(64) NOT NULL,
  reported_profile_id VARCHAR(64) NOT NULL REFERENCES connect_student_profiles (id) ON DELETE CASCADE,
  reporter_profile_id VARCHAR(64) NOT NULL REFERENCES connect_student_profiles (id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'OPEN',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by VARCHAR(64) NOT NULL,
  updated_by VARCHAR(64) NOT NULL,
  version INT NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_connect_mod_cases_college_id ON connect_moderation_cases (college_id);

CREATE TABLE IF NOT EXISTS connect_moderation_actions (
  id VARCHAR(64) PRIMARY KEY,
  college_id VARCHAR(64) NOT NULL,
  case_id VARCHAR(64) NOT NULL REFERENCES connect_moderation_cases (id) ON DELETE CASCADE,
  action_taken VARCHAR(64) NOT NULL,
  moderator_id VARCHAR(64) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by VARCHAR(64) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_connect_mod_actions_college_id ON connect_moderation_actions (college_id);

CREATE TABLE IF NOT EXISTS connect_reports (
  id VARCHAR(64) PRIMARY KEY,
  college_id VARCHAR(64) NOT NULL,
  reporter_profile_id VARCHAR(64) NOT NULL REFERENCES connect_student_profiles (id) ON DELETE CASCADE,
  target_profile_id VARCHAR(64) NOT NULL REFERENCES connect_student_profiles (id) ON DELETE CASCADE,
  reason_category VARCHAR(64) NOT NULL,
  evidence_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by VARCHAR(64) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_connect_reports_college_id ON connect_reports (college_id);

CREATE TABLE IF NOT EXISTS connect_audit_logs (
  id VARCHAR(64) PRIMARY KEY,
  college_id VARCHAR(64) NOT NULL,
  actor_id VARCHAR(64) NOT NULL,
  action VARCHAR(64) NOT NULL,
  target_entity VARCHAR(64) NOT NULL,
  target_id VARCHAR(64) NOT NULL,
  payload_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by VARCHAR(64) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_connect_audit_logs_college_id ON connect_audit_logs (college_id);

CREATE TABLE IF NOT EXISTS connect_feature_usage_statistics (
  id VARCHAR(64) PRIMARY KEY,
  college_id VARCHAR(64) NOT NULL,
  feature_key VARCHAR(64) NOT NULL,
  evaluation_count INT NOT NULL DEFAULT 0,
  success_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by VARCHAR(64) NOT NULL,
  updated_by VARCHAR(64) NOT NULL,
  version INT NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_connect_feature_stats_college_id ON connect_feature_usage_statistics (college_id);

CREATE TABLE IF NOT EXISTS connect_future_intercollege_links (
  id VARCHAR(64) PRIMARY KEY,
  home_college_id VARCHAR(64) NOT NULL,
  target_college_id VARCHAR(64) NOT NULL,
  is_federation_approved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by VARCHAR(64) NOT NULL,
  updated_by VARCHAR(64) NOT NULL,
  version INT NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_connect_intercollege_home ON connect_future_intercollege_links (home_college_id);

-- ==============================================================================
-- SECTION 6: MARKETPLACE MODULE (modules/marketplace)
-- ==============================================================================

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

CREATE TABLE IF NOT EXISTS marketplace_listing_statuses (
  code VARCHAR(32) PRIMARY KEY,
  display_name VARCHAR(128) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trust_badges (
  code VARCHAR(32) PRIMARY KEY,
  display_name VARCHAR(128) NOT NULL,
  min_sales_required INT NOT NULL DEFAULT 0,
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
  listing_type VARCHAR(32) NOT NULL DEFAULT 'SELL',
  price_inr NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  is_negotiable BOOLEAN NOT NULL DEFAULT TRUE,
  pickup_location_name VARCHAR(256) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'PUBLISHED',
  current_reservation_id VARCHAR(64),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_mp_listings_college_cat ON marketplace_listings (college_id, status, category_code);
CREATE INDEX IF NOT EXISTS idx_mp_listings_college_seller ON marketplace_listings (college_id, seller_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_mp_listings_college_slug ON marketplace_listings (college_id, slug);

CREATE TABLE IF NOT EXISTS listing_media (
  id VARCHAR(64) PRIMARY KEY,
  listing_id VARCHAR(64) NOT NULL REFERENCES marketplace_listings (id),
  storage_key VARCHAR(512) NOT NULL,
  media_url TEXT NOT NULL,
  position_order INT NOT NULL DEFAULT 1,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listing_media_listing_id ON listing_media (listing_id, position_order);

CREATE TABLE IF NOT EXISTS listing_tags (
  listing_id VARCHAR(64) NOT NULL REFERENCES marketplace_listings (id),
  tag VARCHAR(64) NOT NULL,
  PRIMARY KEY (listing_id, tag)
);

CREATE TABLE IF NOT EXISTS marketplace_offers (
  id VARCHAR(64) PRIMARY KEY,
  college_id VARCHAR(64) NOT NULL,
  listing_id VARCHAR(64) NOT NULL REFERENCES marketplace_listings (id),
  buyer_user_id VARCHAR(64) NOT NULL,
  seller_user_id VARCHAR(64) NOT NULL,
  offered_price_inr NUMERIC(10, 2) NOT NULL,
  counter_price_inr NUMERIC(10, 2),
  status VARCHAR(32) NOT NULL DEFAULT 'CREATED',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mp_offers_listing_buyer ON marketplace_offers (college_id, listing_id, buyer_user_id);

CREATE TABLE IF NOT EXISTS offer_history (
  id VARCHAR(64) PRIMARY KEY,
  offer_id VARCHAR(64) NOT NULL REFERENCES marketplace_offers (id),
  action_by_user_id VARCHAR(64) NOT NULL,
  action_type VARCHAR(32) NOT NULL,
  price_inr NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS marketplace_reservations (
  id VARCHAR(64) PRIMARY KEY,
  college_id VARCHAR(64) NOT NULL,
  listing_id VARCHAR(64) NOT NULL REFERENCES marketplace_listings (id),
  offer_id VARCHAR(64) NOT NULL REFERENCES marketplace_offers (id),
  buyer_user_id VARCHAR(64) NOT NULL,
  seller_user_id VARCHAR(64) NOT NULL,
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  cancel_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mp_reservations_listing ON marketplace_reservations (college_id, listing_id, status);

CREATE TABLE IF NOT EXISTS marketplace_conversations (
  id VARCHAR(64) PRIMARY KEY,
  college_id VARCHAR(64) NOT NULL,
  listing_id VARCHAR(64) NOT NULL REFERENCES marketplace_listings (id),
  buyer_user_id VARCHAR(64) NOT NULL,
  seller_user_id VARCHAR(64) NOT NULL,
  last_message_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mp_conv_listing_buyer ON marketplace_conversations (college_id, listing_id, buyer_user_id);

CREATE TABLE IF NOT EXISTS conversation_participants (
  conversation_id VARCHAR(64) NOT NULL REFERENCES marketplace_conversations (id),
  user_id VARCHAR(64) NOT NULL,
  role VARCHAR(32) NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS conversation_messages (
  id VARCHAR(64) PRIMARY KEY,
  conversation_id VARCHAR(64) NOT NULL REFERENCES marketplace_conversations (id),
  sender_user_id VARCHAR(64) NOT NULL,
  message_type VARCHAR(32) NOT NULL DEFAULT 'TEXT',
  content TEXT NOT NULL,
  offer_id VARCHAR(64),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conv_messages_conv_id ON conversation_messages (conversation_id, created_at);

CREATE TABLE IF NOT EXISTS seller_profiles (
  id VARCHAR(64) PRIMARY KEY,
  college_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  is_verified_student BOOLEAN NOT NULL DEFAULT TRUE,
  total_listings_posted INT NOT NULL DEFAULT 0,
  successful_sales_count INT NOT NULL DEFAULT 0,
  cancelled_reservations_count INT NOT NULL DEFAULT 0,
  response_rate_percent NUMERIC(5, 2) NOT NULL DEFAULT 100.00,
  badge_level VARCHAR(32) NOT NULL DEFAULT 'VERIFIED_STUDENT',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_seller_profiles_user ON seller_profiles (college_id, user_id);

CREATE TABLE IF NOT EXISTS marketplace_bookmarks (
  id VARCHAR(64) PRIMARY KEY,
  college_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  listing_id VARCHAR(64) NOT NULL REFERENCES marketplace_listings (id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mp_bookmarks_user_listing ON marketplace_bookmarks (college_id, user_id, listing_id);

CREATE TABLE IF NOT EXISTS marketplace_views (
  id VARCHAR(64) PRIMARY KEY,
  college_id VARCHAR(64) NOT NULL,
  listing_id VARCHAR(64) NOT NULL REFERENCES marketplace_listings (id),
  viewer_user_id VARCHAR(64) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS marketplace_reports (
  id VARCHAR(64) PRIMARY KEY,
  college_id VARCHAR(64) NOT NULL,
  reporter_user_id VARCHAR(64) NOT NULL,
  listing_id VARCHAR(64) NOT NULL REFERENCES marketplace_listings (id),
  reason_code VARCHAR(32) NOT NULL REFERENCES report_reasons (code),
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mp_reports_user_listing ON marketplace_reports (college_id, reporter_user_id, listing_id);

CREATE TABLE IF NOT EXISTS marketplace_statistics (
  listing_id VARCHAR(64) PRIMARY KEY REFERENCES marketplace_listings (id),
  college_id VARCHAR(64) NOT NULL,
  total_views INT NOT NULL DEFAULT 0,
  total_bookmarks INT NOT NULL DEFAULT 0,
  total_offers INT NOT NULL DEFAULT 0,
  popularity_score NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
  last_calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS marketplace_audit_logs (
  id VARCHAR(64) PRIMARY KEY,
  college_id VARCHAR(64) NOT NULL,
  aggregate_id VARCHAR(64) NOT NULL,
  aggregate_type VARCHAR(64) NOT NULL,
  action VARCHAR(64) NOT NULL,
  actor_user_id VARCHAR(64) NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- SECTION 7: NOTIFICATIONS ENGINE (modules/notifications)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  college_id TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'GENERAL',
  deduplication_key TEXT,
  aggregation_count INT NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  link TEXT,
  priority TEXT NOT NULL DEFAULT 'NORMAL',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_notif_recipient_unread ON notifications (college_id, recipient_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notif_recipient_cat ON notifications (recipient_id, category);
CREATE INDEX IF NOT EXISTS idx_notif_dedup_key ON notifications (recipient_id, deduplication_key);

CREATE TABLE IF NOT EXISTS notification_preferences (
  id TEXT PRIMARY KEY,
  college_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'IN_APP',
  enabled_event_types JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_muted BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pref_user_channel ON notification_preferences (college_id, user_id, channel);

CREATE TABLE IF NOT EXISTS notification_channels (
  id TEXT PRIMARY KEY,
  channel_name TEXT UNIQUE NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  config JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS notification_delivery_queue (
  id TEXT PRIMARY KEY,
  notification_id TEXT NOT NULL REFERENCES notifications (id) ON DELETE CASCADE,
  recipient_id TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'IN_APP',
  priority TEXT NOT NULL DEFAULT 'NORMAL',
  attempts INT NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'QUEUED',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_queue_status_next ON notification_delivery_queue (status, next_attempt_at);

CREATE TABLE IF NOT EXISTS notification_digest_jobs (
  id TEXT PRIMARY KEY,
  college_id TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  digest_type TEXT NOT NULL,
  items_count INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PENDING',
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_schedule (
  id TEXT PRIMARY KEY,
  college_id TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  notification_payload JSONB NOT NULL,
  execute_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'SCHEDULED',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_user_rules (
  id TEXT PRIMARY KEY,
  college_id TEXT NOT NULL,
  user_id TEXT UNIQUE NOT NULL,
  quiet_hours_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  quiet_hours_start TEXT NOT NULL DEFAULT '22:00',
  quiet_hours_end TEXT NOT NULL DEFAULT '07:00',
  timezone TEXT NOT NULL DEFAULT 'UTC',
  digest_frequency TEXT NOT NULL DEFAULT 'INSTANT',
  archive_after_days INT NOT NULL DEFAULT 30,
  muted_categories JSONB NOT NULL DEFAULT '[]'::jsonb,
  muted_event_types JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_rate_limits (
  id TEXT PRIMARY KEY,
  college_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  event_count INT NOT NULL DEFAULT 1,
  max_allowed INT NOT NULL DEFAULT 20,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_device_tokens (
  id TEXT PRIMARY KEY,
  college_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  platform TEXT NOT NULL DEFAULT 'WEB',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_delivery_attempts (
  id TEXT PRIMARY KEY,
  notification_id TEXT NOT NULL REFERENCES notifications (id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  attempt_count INT NOT NULL DEFAULT 1,
  last_error TEXT,
  delivered_at TIMESTAMP WITH TIME ZONE
);

-- ==============================================================================
-- SECTION 8: PLACEMENT GUIDANCE MODULE (modules/placement-guidance)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS placement_companies (
  id TEXT PRIMARY KEY,
  college_id TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  website TEXT,
  official_website TEXT,
  logo_url TEXT,
  banner_url TEXT,
  career_url TEXT,
  glassdoor_url TEXT,
  industry TEXT NOT NULL DEFAULT 'Technology',
  tier TEXT NOT NULL DEFAULT 'TIER_1',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_placement_comp_tenant_slug ON placement_companies (college_id, slug);
CREATE INDEX IF NOT EXISTS idx_placement_comp_college ON placement_companies (college_id);

CREATE TABLE IF NOT EXISTS placement_experiences (
  id TEXT PRIMARY KEY,
  college_id TEXT NOT NULL,
  company_id TEXT NOT NULL REFERENCES placement_companies (id),
  author_id TEXT NOT NULL,
  role_title TEXT NOT NULL,
  job_type TEXT NOT NULL,
  branch TEXT NOT NULL,
  cgpa NUMERIC(4, 2) NOT NULL,
  ctc_offered_lpa NUMERIC(6, 2),
  stipend_monthly NUMERIC(8, 2),
  offer_status TEXT NOT NULL DEFAULT 'ACCEPTED',
  difficulty_rating INT NOT NULL DEFAULT 3,
  overall_rating INT NOT NULL DEFAULT 4,
  summary TEXT NOT NULL,
  preparation_tips TEXT,
  version_number INT NOT NULL DEFAULT 1,
  helpful_count INT NOT NULL DEFAULT 0,
  reports_count INT NOT NULL DEFAULT 0,
  is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'APPROVED',
  vector_embedding JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_placement_exp_tenant ON placement_experiences (college_id);
CREATE INDEX IF NOT EXISTS idx_placement_exp_company ON placement_experiences (company_id);
CREATE INDEX IF NOT EXISTS idx_placement_exp_author ON placement_experiences (author_id);
CREATE INDEX IF NOT EXISTS idx_placement_exp_role_type ON placement_experiences (role_title, job_type);

CREATE TABLE IF NOT EXISTS placement_questions (
  id TEXT PRIMARY KEY,
  college_id TEXT NOT NULL,
  company_id TEXT REFERENCES placement_companies (id),
  company_name TEXT NOT NULL,
  role_title TEXT NOT NULL,
  question_text TEXT NOT NULL,
  topic TEXT NOT NULL DEFAULT 'ALGORITHMS',
  difficulty TEXT NOT NULL DEFAULT 'MEDIUM',
  round_type TEXT NOT NULL DEFAULT 'TECHNICAL',
  job_type TEXT NOT NULL DEFAULT 'FULL_TIME',
  branch TEXT NOT NULL DEFAULT 'Computer Science',
  batch_year INT NOT NULL DEFAULT 2026,
  frequency_count INT NOT NULL DEFAULT 1,
  helpful_count INT NOT NULL DEFAULT 0,
  reports_count INT NOT NULL DEFAULT 0,
  author_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_placement_q_tenant_company_topic ON placement_questions (college_id, company_name, topic);
CREATE INDEX IF NOT EXISTS idx_placement_q_difficulty_job ON placement_questions (difficulty, job_type);

CREATE TABLE IF NOT EXISTS placement_question_tags (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES placement_questions (id) ON DELETE CASCADE,
  tag_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_q_tag_pair ON placement_question_tags (question_id, tag_name);

CREATE TABLE IF NOT EXISTS placement_discussion_threads (
  id TEXT PRIMARY KEY,
  college_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id TEXT NOT NULL,
  author_name TEXT NOT NULL DEFAULT 'Verified Student',
  topic TEXT NOT NULL DEFAULT 'INTERVIEW_PREP',
  company_slug TEXT,
  upvotes_count INT NOT NULL DEFAULT 0,
  downvotes_count INT NOT NULL DEFAULT 0,
  replies_count INT NOT NULL DEFAULT 0,
  views_count INT NOT NULL DEFAULT 0,
  accepted_reply_id TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_disc_tenant_topic ON placement_discussion_threads (college_id, topic);
CREATE INDEX IF NOT EXISTS idx_disc_author ON placement_discussion_threads (author_id);

CREATE TABLE IF NOT EXISTS placement_discussion_replies (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL REFERENCES placement_discussion_threads (id) ON DELETE CASCADE,
  author_id TEXT NOT NULL,
  author_name TEXT NOT NULL DEFAULT 'Verified Senior',
  content TEXT NOT NULL,
  upvotes_count INT NOT NULL DEFAULT 0,
  downvotes_count INT NOT NULL DEFAULT 0,
  is_accepted_answer BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_reply_thread ON placement_discussion_replies (thread_id);

CREATE TABLE IF NOT EXISTS company_statistics_cache (
  id TEXT PRIMARY KEY,
  college_id TEXT NOT NULL,
  company_id TEXT NOT NULL REFERENCES placement_companies (id),
  interview_count INT NOT NULL DEFAULT 0,
  avg_ctc_lpa NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
  highest_ctc_lpa NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
  avg_difficulty NUMERIC(3, 2) NOT NULL DEFAULT 3.00,
  internship_count INT NOT NULL DEFAULT 0,
  full_time_count INT NOT NULL DEFAULT 0,
  most_common_topics JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_computed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_stat_tenant_comp ON company_statistics_cache (college_id, company_id);

CREATE TABLE IF NOT EXISTS placement_search_history (
  id TEXT PRIMARY KEY,
  college_id TEXT NOT NULL,
  student_profile_id TEXT NOT NULL,
  query_text TEXT NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_history_tenant ON placement_search_history (college_id, query_text);

CREATE TABLE IF NOT EXISTS placement_trending_metrics (
  id TEXT PRIMARY KEY,
  college_id TEXT NOT NULL,
  metric_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  target_name TEXT NOT NULL,
  score INT NOT NULL DEFAULT 0,
  last_calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trending_tenant_type ON placement_trending_metrics (college_id, metric_type);

CREATE TABLE IF NOT EXISTS placement_admin_roadmaps (
  id TEXT PRIMARY KEY,
  college_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_roadmap_tenant ON placement_admin_roadmaps (college_id);

CREATE TABLE IF NOT EXISTS placement_experience_versions (
  id TEXT PRIMARY KEY,
  experience_id TEXT NOT NULL REFERENCES placement_experiences (id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  role_title TEXT NOT NULL,
  job_type TEXT NOT NULL,
  branch TEXT NOT NULL,
  cgpa NUMERIC(4, 2) NOT NULL,
  ctc_offered_lpa NUMERIC(6, 2),
  summary TEXT NOT NULL,
  preparation_tips TEXT,
  created_by_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_exp_version_pair ON placement_experience_versions (experience_id, version_number);

CREATE TABLE IF NOT EXISTS company_ai_summaries (
  id TEXT PRIMARY KEY,
  college_id TEXT NOT NULL,
  company_id TEXT NOT NULL REFERENCES placement_companies (id),
  company_summary TEXT NOT NULL,
  top_topics JSONB NOT NULL DEFAULT '[]'::jsonb,
  difficulty_distribution JSONB NOT NULL DEFAULT '{}'::jsonb,
  salary_distribution JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_summary_tenant_comp ON company_ai_summaries (college_id, company_id);

CREATE TABLE IF NOT EXISTS placement_bookmarks (
  id TEXT PRIMARY KEY,
  college_id TEXT NOT NULL,
  student_profile_id TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_bookmark_pair ON placement_bookmarks (college_id, student_profile_id, target_type, target_id);

CREATE TABLE IF NOT EXISTS placement_analytics_events (
  id TEXT PRIMARY KEY,
  college_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  student_profile_id TEXT NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_tenant_event ON placement_analytics_events (college_id, event_type, target_id);

CREATE TABLE IF NOT EXISTS placement_interview_rounds (
  id TEXT PRIMARY KEY,
  experience_id TEXT NOT NULL REFERENCES placement_experiences (id) ON DELETE CASCADE,
  round_number INT NOT NULL,
  round_name TEXT NOT NULL,
  round_type TEXT NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 60,
  description TEXT NOT NULL,
  topics_covered JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interview_rounds_exp ON placement_interview_rounds (experience_id);

CREATE TABLE IF NOT EXISTS placement_interview_questions (
  id TEXT PRIMARY KEY,
  round_id TEXT NOT NULL REFERENCES placement_interview_rounds (id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_category TEXT NOT NULL DEFAULT 'ALGORITHMS',
  difficulty TEXT NOT NULL DEFAULT 'MEDIUM',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interview_questions_round ON placement_interview_questions (round_id);

CREATE TABLE IF NOT EXISTS placement_salary_insights (
  id TEXT PRIMARY KEY,
  college_id TEXT NOT NULL,
  company_id TEXT NOT NULL REFERENCES placement_companies (id),
  role_title TEXT NOT NULL,
  batch_year INT NOT NULL,
  avg_ctc_lpa NUMERIC(6, 2) NOT NULL,
  min_ctc_lpa NUMERIC(6, 2) NOT NULL,
  max_ctc_lpa NUMERIC(6, 2) NOT NULL,
  sample_size INT NOT NULL DEFAULT 1,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_salary_tenant_comp_role_year ON placement_salary_insights (college_id, company_id, role_title, batch_year);

CREATE TABLE IF NOT EXISTS placement_company_tags (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES placement_companies (id) ON DELETE CASCADE,
  tag_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_company_tag_pair ON placement_company_tags (company_id, tag_name);

-- ==============================================================================
-- SECTION 9: RATE MY PROFESSOR MODULE (modules/rate-my-professor)
-- ==============================================================================

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

CREATE UNIQUE INDEX IF NOT EXISTS dept_college_code_idx ON rate_my_professor_departments (college_id, code);
CREATE UNIQUE INDEX IF NOT EXISTS dept_college_slug_idx ON rate_my_professor_departments (college_id, slug);

CREATE TABLE IF NOT EXISTS professors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INT NOT NULL DEFAULT 1,
  college_id UUID NOT NULL,
  department_id UUID NOT NULL REFERENCES rate_my_professor_departments (id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  employee_code VARCHAR(100),
  designation VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  biography TEXT,
  photo_url VARCHAR(500),
  official_email VARCHAR(255),
  created_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP(3) WITH TIME ZONE
);

CREATE UNIQUE INDEX IF NOT EXISTS prof_college_slug_idx ON professors (college_id, slug);
CREATE INDEX IF NOT EXISTS prof_dept_idx ON professors (college_id, department_id);
CREATE INDEX IF NOT EXISTS prof_status_idx ON professors (college_id, status);

CREATE TABLE IF NOT EXISTS professor_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INT NOT NULL DEFAULT 1,
  college_id UUID NOT NULL,
  professor_id UUID NOT NULL REFERENCES professors (id) ON DELETE CASCADE,
  alias_name VARCHAR(255) NOT NULL
);

CREATE INDEX IF NOT EXISTS prof_alias_idx ON professor_aliases (college_id, alias_name);

CREATE TABLE IF NOT EXISTS rate_my_professor_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INT NOT NULL DEFAULT 1,
  college_id UUID NOT NULL,
  department_id UUID NOT NULL REFERENCES rate_my_professor_departments (id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP(3) WITH TIME ZONE
);

CREATE UNIQUE INDEX IF NOT EXISTS subj_college_code_idx ON rate_my_professor_subjects (college_id, code);

CREATE TABLE IF NOT EXISTS rate_my_professor_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INT NOT NULL DEFAULT 1,
  college_id UUID NOT NULL,
  subject_id UUID NOT NULL REFERENCES rate_my_professor_subjects (id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  credits INT NOT NULL DEFAULT 3,
  created_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP(3) WITH TIME ZONE
);

CREATE UNIQUE INDEX IF NOT EXISTS course_college_code_idx ON rate_my_professor_courses (college_id, code);

CREATE TABLE IF NOT EXISTS professor_course_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INT NOT NULL DEFAULT 1,
  college_id UUID NOT NULL,
  professor_id UUID NOT NULL REFERENCES professors (id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES rate_my_professor_courses (id) ON DELETE CASCADE,
  academic_year VARCHAR(20) NOT NULL,
  semester VARCHAR(50) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS prof_course_assign_uniq_idx ON professor_course_assignments (college_id, professor_id, course_id, academic_year, semester);

CREATE TABLE IF NOT EXISTS professor_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INT NOT NULL DEFAULT 1,
  college_id UUID NOT NULL,
  professor_id UUID NOT NULL REFERENCES professors (id) ON DELETE CASCADE,
  course_assignment_id UUID NOT NULL REFERENCES professor_course_assignments (id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL,
  author_anonymous_token VARCHAR(255) NOT NULL,
  is_anonymous BOOLEAN NOT NULL DEFAULT TRUE,
  grade_received VARCHAR(10),
  review_text TEXT NOT NULL,
  overall_rating NUMERIC(3, 2) NOT NULL,
  moderation_status VARCHAR(50) NOT NULL DEFAULT 'APPROVED',
  helpful_count INT NOT NULL DEFAULT 0,
  unhelpful_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP(3) WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS review_prof_status_idx ON professor_reviews (college_id, professor_id, moderation_status);
CREATE UNIQUE INDEX IF NOT EXISTS review_author_term_uniq_idx ON professor_reviews (college_id, professor_id, author_user_id, course_assignment_id);

CREATE TABLE IF NOT EXISTS review_rating_dimensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INT NOT NULL DEFAULT 1,
  college_id UUID NOT NULL,
  review_id UUID NOT NULL REFERENCES professor_reviews (id) ON DELETE CASCADE,
  dimension_key VARCHAR(100) NOT NULL,
  score NUMERIC(3, 2) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS review_dim_uniq_idx ON review_rating_dimensions (review_id, dimension_key);

CREATE TABLE IF NOT EXISTS review_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INT NOT NULL DEFAULT 1,
  college_id UUID NOT NULL,
  review_id UUID NOT NULL REFERENCES professor_reviews (id) ON DELETE CASCADE,
  voter_user_id UUID NOT NULL,
  vote_type VARCHAR(20) NOT NULL,
  created_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS vote_user_review_uniq_idx ON review_votes (review_id, voter_user_id);

CREATE TABLE IF NOT EXISTS review_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INT NOT NULL DEFAULT 1,
  college_id UUID NOT NULL,
  review_id UUID NOT NULL REFERENCES professor_reviews (id) ON DELETE CASCADE,
  reporter_user_id UUID NOT NULL,
  reason VARCHAR(100) NOT NULL,
  details TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS report_user_review_uniq_idx ON review_reports (review_id, reporter_user_id);

CREATE TABLE IF NOT EXISTS review_moderation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INT NOT NULL DEFAULT 1,
  college_id UUID NOT NULL,
  review_id UUID NOT NULL REFERENCES professor_reviews (id) ON DELETE CASCADE,
  moderator_user_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS mod_log_review_idx ON review_moderation_logs (college_id, review_id);

CREATE TABLE IF NOT EXISTS review_histories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INT NOT NULL DEFAULT 1,
  college_id UUID NOT NULL,
  review_id UUID NOT NULL REFERENCES professor_reviews (id) ON DELETE CASCADE,
  previous_text TEXT NOT NULL,
  previous_overall_rating NUMERIC(3, 2) NOT NULL,
  edited_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS review_history_idx ON review_histories (college_id, review_id);

CREATE TABLE IF NOT EXISTS faculty_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INT NOT NULL DEFAULT 1,
  college_id UUID NOT NULL,
  review_id UUID NOT NULL REFERENCES professor_reviews (id) ON DELETE CASCADE,
  professor_user_id UUID NOT NULL,
  response_text TEXT NOT NULL,
  created_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP(3) WITH TIME ZONE
);

CREATE UNIQUE INDEX IF NOT EXISTS faculty_resp_review_uniq_idx ON faculty_responses (review_id);

CREATE TABLE IF NOT EXISTS professor_statistics (
  professor_id UUID PRIMARY KEY REFERENCES professors (id) ON DELETE CASCADE,
  college_id UUID NOT NULL,
  bayesian_rating NUMERIC(3, 2) NOT NULL DEFAULT 0.00,
  raw_average_rating NUMERIC(3, 2) NOT NULL DEFAULT 0.00,
  total_reviews_count INT NOT NULL DEFAULT 0,
  recommendation_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
  star_5_count INT NOT NULL DEFAULT 0,
  star_4_count INT NOT NULL DEFAULT 0,
  star_3_count INT NOT NULL DEFAULT 0,
  star_2_count INT NOT NULL DEFAULT 0,
  star_1_count INT NOT NULL DEFAULT 0,
  last_calculated_at TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS prof_stats_bayesian_idx ON professor_statistics (college_id, bayesian_rating);
