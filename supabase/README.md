# Supabase Migration & Storage Setup Guide

This directory contains the production-ready SQL scripts to initialize and configure Supabase PostgreSQL and Supabase Storage for the **College Hub** platform.

---

## SQL Execution Order in Supabase SQL Editor

To set up your database and storage on Supabase, navigate to the **SQL Editor** in your Supabase Dashboard and execute the SQL scripts in the following exact order:

```mermaid
graph TD
    A["1. functions.sql"] --> B["2. schema.sql"]
    B --> C["3. storage.sql"]
    C --> D["4. policies.sql"]
    D --> E["5. seed.sql"]
```

### 1. `functions.sql`
- **Purpose**: Creates helper functions for multi-tenant Row Level Security (`set_tenant_context`, `current_tenant_id`, `is_super_admin`) and trigger functions (`trigger_update_updated_at`).
- **Execution**: Paste the contents of `supabase/functions.sql` into the SQL Editor and click **Run**.

### 2. `schema.sql`
- **Purpose**: Enables PostgreSQL extensions (`uuid-ossp`, `pgcrypto`, `vector`), creates all database tables across all platform modules (Core Database, Feature Flags, Academic Resource Hub, Confessions, Campus Connect, Marketplace, Notifications, Placement Guidance, Rate My Professor), and creates all primary and secondary indexes.
- **Execution**: Paste the contents of `supabase/schema.sql` into the SQL Editor and click **Run**.

### 3. `storage.sql`
- **Purpose**: Initializes the 6 production storage buckets in `storage.buckets` with appropriate public visibility, maximum file size limits, and MIME type restrictions:
  - `avatars` (Public, 10MB limit, image formats)
  - `marketplace` (Public, 20MB limit, image/video formats)
  - `materials` (Private, 50MB limit, PDF/ZIP/docs/images)
  - `documents` (Private, 50MB limit, PDF/Word/Excel/CSV)
  - `events` (Public, 20MB limit, image/video formats)
  - `misc` (Private, 50MB limit, general files)
- **Execution**: Paste the contents of `supabase/storage.sql` into the SQL Editor and click **Run**.

### 4. `policies.sql`
- **Purpose**: Configures Row Level Security (RLS) policies on `storage.objects` for bucket access and translates multi-tenant isolation policies (`college_id`) for database tables.
- **Execution**: Paste the contents of `supabase/policies.sql` into the SQL Editor and click **Run**.

### 5. `seed.sql`
- **Purpose**: Populates initial core foundation tenants (Stanford University, MIT), default confession categories, marketplace categories, conditions, report reasons, and notification channels.
- **Execution**: Paste the contents of `supabase/seed.sql` into the SQL Editor and click **Run**.

---

## Environment Variables Configuration

In your `.env` file, ensure the following environment variables are configured with your Supabase project credentials:

```ini
# PostgreSQL Database (Points to Supabase PostgreSQL connection string)
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres

# Storage Provider Engine
STORAGE_PROVIDER=supabase

# Supabase Credentials
SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
SUPABASE_ANON_KEY=[YOUR-SUPABASE-ANON-KEY]
SUPABASE_SERVICE_ROLE_KEY=[YOUR-SUPABASE-SERVICE-ROLE-KEY]

# Configurable Storage Bucket Names
SUPABASE_STORAGE_BUCKET_AVATARS=avatars
SUPABASE_STORAGE_BUCKET_MARKETPLACE=marketplace
SUPABASE_STORAGE_BUCKET_MATERIALS=materials
SUPABASE_STORAGE_BUCKET_DOCUMENTS=documents
SUPABASE_STORAGE_BUCKET_EVENTS=events
SUPABASE_STORAGE_BUCKET_MISC=misc
```

---

## Verifying Supabase Setup

Run the system verification command to validate build and setup:

```bash
pnpm verify
```
