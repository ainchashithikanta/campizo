-- ==============================================================================
-- College Hub Platform — Supabase Production & Test Seed Data
-- ==============================================================================

-- 1. Seed Core College Tenants
INSERT INTO college_tenants (id, name, slug, allowed_email_domains, theme, enabled_modules, moderation_policy, tier, custom_domain)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'Stanford University',
    'stanford',
    '["@stanford.edu"]'::jsonb,
    '{"primaryColor": "#8C1515", "secondaryColor": "#000000", "logoUrl": "https://stanford.edu/logo.png", "faviconUrl": "https://stanford.edu/favicon.ico", "darkModeDefault": true}'::jsonb,
    '["rate-my-professor", "materials-pyqs", "auth", "marketplace", "confessions", "connect"]'::jsonb,
    '{"confessionsAutoApprove": true, "professorsReviewModeration": "POST_MODERATION", "assignedModeratorUserIds": []}'::jsonb,
    'ENTERPRISE',
    'stanford.collegehub.edu'
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'Massachusetts Institute of Technology',
    'mit',
    '["@mit.edu"]'::jsonb,
    '{"primaryColor": "#A31F34", "secondaryColor": "#8A8B8C", "logoUrl": "https://mit.edu/logo.png", "faviconUrl": "https://mit.edu/favicon.ico", "darkModeDefault": false}'::jsonb,
    '["rate-my-professor", "marketplace", "confessions", "auth", "connect"]'::jsonb,
    '{"confessionsAutoApprove": false, "professorsReviewModeration": "PRE_MODERATION", "assignedModeratorUserIds": []}'::jsonb,
    'PRO',
    'mit.collegehub.edu'
  )
ON CONFLICT (slug) DO NOTHING;

-- 2. Seed Confession Categories
INSERT INTO confession_categories (code, name, description, display_order, is_active)
VALUES
  ('ACADEMICS', 'Academics & Exams', 'Coursework, exams, professors, and grading experiences', 1, true),
  ('CAMPUS_LIFE', 'Campus Life & Dorms', 'Dorm life, dining halls, events, and campus culture', 2, true),
  ('CAREER', 'Career & Internships', 'Interviews, placements, resumes, and career advice', 3, true),
  ('RELATIONSHIPS', 'Crushes & Friendships', 'Dating, friendships, and social dynamics on campus', 4, true),
  ('VENTING', 'Late Night Venting', 'Anonymous thoughts, stress relief, and general rants', 5, true)
ON CONFLICT (code) DO NOTHING;

-- 3. Seed Marketplace Categories
INSERT INTO marketplace_categories (code, display_name, description, display_order)
VALUES
  ('BOOKS', 'Textbooks & Study Material', 'Course textbooks, reference books, and lab notes', 1),
  ('ELECTRONICS', 'Electronics & Gadgets', 'Laptops, monitors, headphones, calculators, and chargers', 2),
  ('FURNITURE', 'Dorm & Hostel Furniture', 'Study chairs, desks, lamps, and mattresses', 3),
  ('CLOTHING', 'Apparel & Merch', 'College hoodies, jackets, and sports gear', 4),
  ('VEHICLES', 'Bicycles & Scooters', 'Campus bicycles, electric scooters, and helmets', 5),
  ('MISC', 'Miscellaneous Items', 'General items, sports equipment, and accessories', 6)
ON CONFLICT (code) DO NOTHING;

-- 4. Seed Marketplace Conditions
INSERT INTO marketplace_conditions (code, display_name, description)
VALUES
  ('NEW', 'Brand New', 'Unused in original packaging'),
  ('LIKE_NEW', 'Like New', 'Mint condition, used very briefly'),
  ('GOOD', 'Good Condition', 'Minor cosmetic wear, fully functional'),
  ('FAIR', 'Fair Condition', 'Noticeable signs of use, fully working')
ON CONFLICT (code) DO NOTHING;

-- 5. Seed Report Reasons
INSERT INTO report_reasons (code, label, severity_level, is_active)
VALUES
  ('SPAM', 'Spam / Commercial Advertising', 3, true),
  ('HARASSMENT', 'Harassment / Bullying', 1, true),
  ('HATE_SPEECH', 'Hate Speech / Discrimination', 1, true),
  ('DOXXING', 'Personal Info Exposure (Doxxing)', 1, true),
  ('COPYRIGHT', 'Copyright Infringement', 2, true)
ON CONFLICT (code) DO NOTHING;

-- 6. Seed Notification Channels
INSERT INTO notification_channels (id, channel_name, is_enabled, config)
VALUES
  ('chan-in-app', 'IN_APP', true, '{}'::jsonb),
  ('chan-email', 'EMAIL', true, '{}'::jsonb),
  ('chan-push', 'PUSH', true, '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;
