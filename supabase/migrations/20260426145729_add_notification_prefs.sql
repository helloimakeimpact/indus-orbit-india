ALTER TABLE profiles ADD COLUMN notification_prefs JSONB DEFAULT '{"connect_requests": {"in_app": true, "email": true}, "vouches": {"in_app": true, "email": true}, "mentorship": {"in_app": true, "email": true}, "mission_updates": {"in_app": true, "email": true}, "system_alerts": {"in_app": true, "email": true}}'::jsonb;

