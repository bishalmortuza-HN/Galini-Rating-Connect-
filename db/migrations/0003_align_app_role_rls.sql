-- Align row-level security with the actual application DB role.
-- Keep agency isolation and site-admin checks; do not grant blanket access.
ALTER POLICY agencies_select_related_or_admin ON app.agencies TO galini_app, galini_runtime;
ALTER POLICY agency_memberships_select_related ON app.agency_memberships TO galini_app, galini_runtime;
ALTER POLICY api_events_scope ON app.api_events TO galini_app, galini_runtime;
ALTER POLICY appetite_rules_admin_write ON app.appetite_rules TO galini_app, galini_runtime;
ALTER POLICY appetite_rules_read_active ON app.appetite_rules TO galini_app, galini_runtime;
ALTER POLICY applicants_agency_scope ON app.applicants TO galini_app, galini_runtime;
ALTER POLICY audit_logs_agency_scope ON app.audit_logs TO galini_app, galini_runtime;
ALTER POLICY audit_logs_insert_scope ON app.audit_logs TO galini_app, galini_runtime;
ALTER POLICY carrier_connections_admin_only ON app.carrier_connections TO galini_app, galini_runtime;
ALTER POLICY carrier_products_admin_write ON app.carrier_products TO galini_app, galini_runtime;
ALTER POLICY carrier_products_read_active ON app.carrier_products TO galini_app, galini_runtime;
ALTER POLICY carrier_submission_records_scope ON app.carrier_submission_records TO galini_app, galini_runtime;
ALTER POLICY carriers_admin_write ON app.carriers TO galini_app, galini_runtime;
ALTER POLICY carriers_read_active ON app.carriers TO galini_app, galini_runtime;
ALTER POLICY commercial_risks_scope ON app.commercial_risks TO galini_app, galini_runtime;
ALTER POLICY documents_agency_scope ON app.documents TO galini_app, galini_runtime;
ALTER POLICY personal_risks_scope ON app.personal_risks TO galini_app, galini_runtime;
ALTER POLICY policies_agency_scope ON app.policies TO galini_app, galini_runtime;
ALTER POLICY quote_coverages_scope ON app.quote_coverages TO galini_app, galini_runtime;
ALTER POLICY quotes_scope ON app.quotes TO galini_app, galini_runtime;
ALTER POLICY renewals_agency_scope ON app.renewals TO galini_app, galini_runtime;
ALTER POLICY schema_migrations_admin_only ON app.schema_migrations TO galini_app, galini_runtime;
ALTER POLICY submissions_agency_scope ON app.submissions TO galini_app, galini_runtime;
ALTER POLICY users_insert_self_pending ON app.users TO galini_app, galini_runtime;
ALTER POLICY users_select_self_or_admin ON app.users TO galini_app, galini_runtime;

-- Replace legacy policies that compared the auth subject to the internal user UUID.
-- The helper functions map the auth subject to the app.users UUID safely.
DROP POLICY agency_scope_applicants ON app.applicants;
CREATE POLICY agency_scope_applicants ON app.applicants FOR ALL TO galini_app, galini_runtime
  USING (app.has_active_membership(agency_id) OR app.is_site_admin())
  WITH CHECK (app.has_active_membership(agency_id) OR app.is_site_admin());

DROP POLICY agency_scope_audit_logs ON app.audit_logs;
CREATE POLICY agency_scope_audit_logs ON app.audit_logs FOR ALL TO galini_app, galini_runtime
  USING ((agency_id IS NULL AND app.is_site_admin()) OR (agency_id IS NOT NULL AND (app.has_active_membership(agency_id) OR app.is_site_admin())))
  WITH CHECK ((agency_id IS NULL AND app.is_site_admin()) OR (agency_id IS NOT NULL AND (app.has_active_membership(agency_id) OR app.is_site_admin())));

DROP POLICY agency_scope_documents ON app.documents;
CREATE POLICY agency_scope_documents ON app.documents FOR ALL TO galini_app, galini_runtime
  USING (app.has_active_membership(agency_id) OR app.is_site_admin())
  WITH CHECK (app.has_active_membership(agency_id) OR app.is_site_admin());

DROP POLICY agency_scope_policies ON app.policies;
CREATE POLICY agency_scope_policies ON app.policies FOR ALL TO galini_app, galini_runtime
  USING (app.has_active_membership(agency_id) OR app.is_site_admin())
  WITH CHECK (app.has_active_membership(agency_id) OR app.is_site_admin());

DROP POLICY agency_scope_renewals ON app.renewals;
CREATE POLICY agency_scope_renewals ON app.renewals FOR ALL TO galini_app, galini_runtime
  USING (app.has_active_membership(agency_id) OR app.is_site_admin())
  WITH CHECK (app.has_active_membership(agency_id) OR app.is_site_admin());

DROP POLICY agency_scope_submissions ON app.submissions;
CREATE POLICY agency_scope_submissions ON app.submissions FOR ALL TO galini_app, galini_runtime
  USING (app.has_active_membership(agency_id) OR app.is_site_admin())
  WITH CHECK (app.has_active_membership(agency_id) OR app.is_site_admin());
