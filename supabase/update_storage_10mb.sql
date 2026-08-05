-- ==============================================================================
-- Update file size limit to 10MB (10485760 bytes) for all Supabase Storage buckets
-- ==============================================================================

UPDATE storage.buckets
SET file_size_limit = 10485760;
