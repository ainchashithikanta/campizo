-- ==============================================================================
-- Public Read Policies for Reference & Category Tables
-- ==============================================================================

DROP POLICY IF EXISTS "Public read reference policy" ON confession_categories;
CREATE POLICY "Public read reference policy" ON confession_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read reference policy" ON marketplace_categories;
CREATE POLICY "Public read reference policy" ON marketplace_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read reference policy" ON marketplace_conditions;
CREATE POLICY "Public read reference policy" ON marketplace_conditions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read reference policy" ON report_reasons;
CREATE POLICY "Public read reference policy" ON report_reasons FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read reference policy" ON academic_schemes;
CREATE POLICY "Public read reference policy" ON academic_schemes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read reference policy" ON resource_types;
CREATE POLICY "Public read reference policy" ON resource_types FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read reference policy" ON notification_channels;
CREATE POLICY "Public read reference policy" ON notification_channels FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read reference policy" ON rate_my_professor_departments;
CREATE POLICY "Public read reference policy" ON rate_my_professor_departments FOR SELECT USING (true);
