-- Galini Rate & Connect: enforce user and agency boundaries in PostgreSQL.
-- Apply only after this migration has been tested on a Neon branch.

CREATE OR REPLACE FUNCTION app.current_auth_id() RETURNS uuid
LANGUAGE sql STABLE
AS $$ SELECT NULLIF(current_setting('app.user_id', true), '')::uuid $$;

CREATE OR REPLACE FUNCTION app.current_app_user_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = app, pg_temp SET row_security = off
AS $$ SELECT id FROM app.users WHERE auth_subject = app.current_auth_id()::text LIMIT 1 $$;

CREATE OR REPLACE FUNCTION app.is_active_user() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = app, pg_temp SET row_security = off
AS $$ SELECT EXISTS (SELECT 1 FROM app.users WHERE auth_subject = app.current_auth_id()::text AND status = 'active') $$;

CREATE OR REPLACE FUNCTION app.is_site_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = app, pg_temp SET row_security = off
AS $$ SELECT EXISTS (SELECT 1 FROM app.users WHERE auth_subject = app.current_auth_id()::text AND status = 'active' AND site_role = 'site_admin') $$;

CREATE OR REPLACE FUNCTION app.has_agency_relationship(target_agency uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = app, pg_temp SET row_security = off
AS $$ SELECT EXISTS (SELECT 1 FROM app.agency_memberships am JOIN app.users u ON u.id = am.user_id WHERE am.agency_id = target_agency AND am.user_id = app.current_app_user_id() AND am.status IN ('invited','active') AND u.status IN ('pending','active')) $$;

CREATE OR REPLACE FUNCTION app.has_active_membership(target_agency uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = app, pg_temp SET row_security = off
AS $$ SELECT EXISTS (SELECT 1 FROM app.agency_memberships am JOIN app.agencies a ON a.id = am.agency_id JOIN app.users u ON u.id = am.user_id WHERE am.agency_id = target_agency AND am.user_id = app.current_app_user_id() AND am.status = 'active' AND a.status = 'approved' AND u.status = 'active') $$;

CREATE OR REPLACE FUNCTION app.is_agency_admin(target_agency uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = app, pg_temp SET row_security = off
AS $$ SELECT EXISTS (SELECT 1 FROM app.agency_memberships am JOIN app.agencies a ON a.id = am.agency_id JOIN app.users u ON u.id = am.user_id WHERE am.agency_id = target_agency AND am.user_id = app.current_app_user_id() AND am.role = 'agency_admin' AND am.status = 'active' AND a.status = 'approved' AND u.status = 'active') $$;

CREATE OR REPLACE FUNCTION app.can_access_applicant(target_applicant uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = app, pg_temp SET row_security = off
AS $$ SELECT EXISTS (SELECT 1 FROM app.applicants ap WHERE ap.id = target_applicant AND (app.has_active_membership(ap.agency_id) OR app.is_site_admin())) $$;

CREATE OR REPLACE FUNCTION app.can_access_submission(target_submission uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = app, pg_temp SET row_security = off
AS $$ SELECT EXISTS (SELECT 1 FROM app.submissions s WHERE s.id = target_submission AND (app.has_active_membership(s.agency_id) OR app.is_site_admin())) $$;

CREATE OR REPLACE FUNCTION app.can_access_quote(target_quote uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = app, pg_temp SET row_security = off
AS $$ SELECT EXISTS (SELECT 1 FROM app.quotes q WHERE q.id = target_quote AND app.can_access_submission(q.submission_id)) $$;

CREATE OR REPLACE FUNCTION app.request_agency(p_legal_name text, p_display_name text, p_npn text, p_contact_email text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = app, pg_temp SET row_security = off
AS $$
DECLARE v_user_id uuid; v_agency_id uuid;
BEGIN
  v_user_id := app.current_app_user_id();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Authenticated Galini profile required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM app.users WHERE id = v_user_id AND status IN ('pending','active')) THEN RAISE EXCEPTION 'Account is not eligible to request an agency'; END IF;
  IF EXISTS (SELECT 1 FROM app.agency_memberships WHERE user_id = v_user_id AND status = 'invited') THEN RAISE EXCEPTION 'An agency request is already awaiting review'; END IF;
  IF length(trim(p_legal_name)) < 2 OR length(trim(p_display_name)) < 2 THEN RAISE EXCEPTION 'Agency name is required'; END IF;
  INSERT INTO app.agencies (legal_name, display_name, npn, contact_email, status, state_license_status)
  VALUES (trim(p_legal_name), trim(p_display_name), nullif(trim(p_npn), ''), nullif(lower(trim(p_contact_email)), ''), 'pending', 'unverified')
  RETURNING id INTO v_agency_id;
  INSERT INTO app.agency_memberships (agency_id, user_id, role, status)
  VALUES (v_agency_id, v_user_id, 'agency_admin', 'invited');
  RETURN v_agency_id;
END
$$;

CREATE OR REPLACE FUNCTION app.admin_review_agency(p_agency_id uuid, p_decision text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = app, pg_temp SET row_security = off
AS $$
BEGIN
  IF NOT app.is_site_admin() THEN RAISE EXCEPTION 'Site administrator permission required'; END IF;
  IF p_decision NOT IN ('approved','rejected','suspended') THEN RAISE EXCEPTION 'Invalid agency decision'; END IF;
  UPDATE app.agencies SET status = p_decision, updated_at = now() WHERE id = p_agency_id;
  IF p_decision = 'approved' THEN
    UPDATE app.agency_memberships SET status = 'active' WHERE agency_id = p_agency_id AND role = 'agency_admin' AND status = 'invited';
    UPDATE app.users u SET status = 'active', updated_at = now()
    FROM app.agency_memberships am
    WHERE am.agency_id = p_agency_id AND am.user_id = u.id AND am.role = 'agency_admin' AND am.status = 'active';
  ELSE
    UPDATE app.agency_memberships SET status = 'suspended' WHERE agency_id = p_agency_id AND status <> 'suspended';
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION app.admin_update_user(p_user_id uuid, p_status text, p_site_role text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = app, pg_temp SET row_security = off
AS $$
BEGIN
  IF NOT app.is_site_admin() THEN RAISE EXCEPTION 'Site administrator permission required'; END IF;
  IF p_status NOT IN ('pending','active','suspended','rejected') OR p_site_role NOT IN ('site_admin','agency_admin','agent') THEN RAISE EXCEPTION 'Invalid user status or role'; END IF;
  UPDATE app.users SET status = p_status, site_role = p_site_role, updated_at = now() WHERE id = p_user_id;
END
$$;

REVOKE ALL ON FUNCTION app.current_auth_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION app.current_app_user_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION app.is_active_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION app.is_site_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION app.has_agency_relationship(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.has_active_membership(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.is_agency_admin(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.can_access_applicant(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.can_access_submission(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.can_access_quote(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.request_agency(text,text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.admin_review_agency(uuid,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.admin_update_user(uuid,text,text) FROM PUBLIC;

GRANT USAGE ON SCHEMA app TO galini_runtime;
GRANT EXECUTE ON FUNCTION app.current_auth_id(), app.current_app_user_id(), app.is_active_user(), app.is_site_admin(),
  app.has_agency_relationship(uuid), app.has_active_membership(uuid), app.is_agency_admin(uuid),
  app.can_access_applicant(uuid), app.can_access_submission(uuid), app.can_access_quote(uuid),
  app.request_agency(text,text,text,text), app.admin_review_agency(uuid,text), app.admin_update_user(uuid,text,text)
TO galini_runtime;

DROP POLICY IF EXISTS users_select_self_or_admin ON app.users;
DROP POLICY IF EXISTS users_insert_self_pending ON app.users;
DROP POLICY IF EXISTS agencies_select_related_or_admin ON app.agencies;
DROP POLICY IF EXISTS agency_memberships_select_related ON app.agency_memberships;
DROP POLICY IF EXISTS applicants_agency_scope ON app.applicants;
DROP POLICY IF EXISTS submissions_agency_scope ON app.submissions;
DROP POLICY IF EXISTS documents_agency_scope ON app.documents;
DROP POLICY IF EXISTS policies_agency_scope ON app.policies;
DROP POLICY IF EXISTS renewals_agency_scope ON app.renewals;
DROP POLICY IF EXISTS audit_logs_agency_scope ON app.audit_logs;
DROP POLICY IF EXISTS audit_logs_insert_scope ON app.audit_logs;
DROP POLICY IF EXISTS personal_risks_scope ON app.personal_risks;
DROP POLICY IF EXISTS commercial_risks_scope ON app.commercial_risks;
DROP POLICY IF EXISTS carrier_submission_records_scope ON app.carrier_submission_records;
DROP POLICY IF EXISTS quotes_scope ON app.quotes;
DROP POLICY IF EXISTS quote_coverages_scope ON app.quote_coverages;
DROP POLICY IF EXISTS api_events_scope ON app.api_events;
DROP POLICY IF EXISTS carriers_read_active ON app.carriers;
DROP POLICY IF EXISTS carrier_products_read_active ON app.carrier_products;
DROP POLICY IF EXISTS appetite_rules_read_active ON app.appetite_rules;
DROP POLICY IF EXISTS carrier_connections_admin_only ON app.carrier_connections;
DROP POLICY IF EXISTS carriers_admin_write ON app.carriers;
DROP POLICY IF EXISTS carrier_products_admin_write ON app.carrier_products;
DROP POLICY IF EXISTS appetite_rules_admin_write ON app.appetite_rules;
DROP POLICY IF EXISTS schema_migrations_admin_only ON app.schema_migrations;

CREATE POLICY users_select_self_or_admin ON app.users FOR SELECT TO galini_runtime
USING (auth_subject = app.current_auth_id()::text OR app.is_site_admin());
CREATE POLICY users_insert_self_pending ON app.users FOR INSERT TO galini_runtime
WITH CHECK (auth_subject = app.current_auth_id()::text AND site_role = 'agent' AND status = 'pending');
CREATE POLICY agencies_select_related_or_admin ON app.agencies FOR SELECT TO galini_runtime
USING (app.has_agency_relationship(id) OR app.is_site_admin());
CREATE POLICY agency_memberships_select_related ON app.agency_memberships FOR SELECT TO galini_runtime
USING (user_id = app.current_app_user_id() OR app.is_agency_admin(agency_id) OR app.is_site_admin());
CREATE POLICY applicants_agency_scope ON app.applicants FOR ALL TO galini_runtime
USING (app.has_active_membership(agency_id) OR app.is_site_admin())
WITH CHECK (app.has_active_membership(agency_id) OR app.is_site_admin());
CREATE POLICY submissions_agency_scope ON app.submissions FOR ALL TO galini_runtime
USING (app.has_active_membership(agency_id) OR app.is_site_admin())
WITH CHECK (app.has_active_membership(agency_id) OR app.is_site_admin());
CREATE POLICY documents_agency_scope ON app.documents FOR ALL TO galini_runtime
USING (app.has_active_membership(agency_id) OR app.is_site_admin())
WITH CHECK (app.has_active_membership(agency_id) OR app.is_site_admin());
CREATE POLICY policies_agency_scope ON app.policies FOR ALL TO galini_runtime
USING (app.has_active_membership(agency_id) OR app.is_site_admin())
WITH CHECK (app.has_active_membership(agency_id) OR app.is_site_admin());
CREATE POLICY renewals_agency_scope ON app.renewals FOR ALL TO galini_runtime
USING (app.has_active_membership(agency_id) OR app.is_site_admin())
WITH CHECK (app.has_active_membership(agency_id) OR app.is_site_admin());
CREATE POLICY audit_logs_agency_scope ON app.audit_logs FOR SELECT TO galini_runtime
USING ((agency_id IS NULL AND app.is_site_admin()) OR (agency_id IS NOT NULL AND (app.has_active_membership(agency_id) OR app.is_site_admin())));
CREATE POLICY audit_logs_insert_scope ON app.audit_logs FOR INSERT TO galini_runtime
WITH CHECK ((agency_id IS NULL AND app.is_site_admin()) OR (agency_id IS NOT NULL AND (app.has_active_membership(agency_id) OR app.is_site_admin())));
CREATE POLICY personal_risks_scope ON app.personal_risks FOR ALL TO galini_runtime
USING (app.can_access_applicant(applicant_id)) WITH CHECK (app.can_access_applicant(applicant_id));
CREATE POLICY commercial_risks_scope ON app.commercial_risks FOR ALL TO galini_runtime
USING (app.can_access_applicant(applicant_id)) WITH CHECK (app.can_access_applicant(applicant_id));
CREATE POLICY carrier_submission_records_scope ON app.carrier_submission_records FOR ALL TO galini_runtime
USING (app.can_access_submission(submission_id)) WITH CHECK (app.can_access_submission(submission_id));
CREATE POLICY quotes_scope ON app.quotes FOR ALL TO galini_runtime
USING (app.can_access_submission(submission_id)) WITH CHECK (app.can_access_submission(submission_id));
CREATE POLICY quote_coverages_scope ON app.quote_coverages FOR ALL TO galini_runtime
USING (app.can_access_quote(quote_id)) WITH CHECK (app.can_access_quote(quote_id));
CREATE POLICY api_events_scope ON app.api_events FOR ALL TO galini_runtime
USING ((submission_id IS NOT NULL AND app.can_access_submission(submission_id)) OR (submission_id IS NULL AND app.is_site_admin()))
WITH CHECK ((submission_id IS NOT NULL AND app.can_access_submission(submission_id)) OR (submission_id IS NULL AND app.is_site_admin()));
CREATE POLICY carriers_read_active ON app.carriers FOR SELECT TO galini_runtime
USING (app.is_active_user() OR app.is_site_admin());
CREATE POLICY carrier_products_read_active ON app.carrier_products FOR SELECT TO galini_runtime
USING (app.is_active_user() OR app.is_site_admin());
CREATE POLICY appetite_rules_read_active ON app.appetite_rules FOR SELECT TO galini_runtime
USING (app.is_active_user() OR app.is_site_admin());
CREATE POLICY carrier_connections_admin_only ON app.carrier_connections FOR ALL TO galini_runtime
USING (app.is_site_admin()) WITH CHECK (app.is_site_admin());
CREATE POLICY carriers_admin_write ON app.carriers FOR ALL TO galini_runtime
USING (app.is_site_admin()) WITH CHECK (app.is_site_admin());
CREATE POLICY carrier_products_admin_write ON app.carrier_products FOR ALL TO galini_runtime
USING (app.is_site_admin()) WITH CHECK (app.is_site_admin());
CREATE POLICY appetite_rules_admin_write ON app.appetite_rules FOR ALL TO galini_runtime
USING (app.is_site_admin()) WITH CHECK (app.is_site_admin());
CREATE POLICY schema_migrations_admin_only ON app.schema_migrations FOR ALL TO galini_runtime
USING (app.is_site_admin()) WITH CHECK (app.is_site_admin());

ALTER TABLE app.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.agency_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.applicants ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.personal_risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.commercial_risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.carriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.carrier_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.carrier_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.appetite_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.carrier_submission_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.quote_coverages ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.renewals ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.api_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.schema_migrations ENABLE ROW LEVEL SECURITY;

REVOKE UPDATE, DELETE ON app.users FROM galini_runtime;
GRANT SELECT, INSERT ON app.users TO galini_runtime;
GRANT SELECT ON app.agencies, app.agency_memberships TO galini_runtime;
