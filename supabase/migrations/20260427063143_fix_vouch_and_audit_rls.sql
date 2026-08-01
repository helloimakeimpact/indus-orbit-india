-- Fix audit_log to allow users to insert their own logs
DROP POLICY IF EXISTS "Admins insert audit log" ON public.audit_log;
CREATE POLICY "Users insert own audit log" ON public.audit_log
FOR INSERT TO authenticated
WITH CHECK (actor_id = auth.uid());

-- Fix notifications to allow users to trigger notifications for others
-- (e.g. when redeeming a code, sending connection request, etc.)
DROP POLICY IF EXISTS "Users can manage their own notifications" ON public.notifications;
CREATE POLICY "Users can read/update own notifications" ON public.notifications
FOR SELECT TO public
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
FOR UPDATE TO public
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications" ON public.notifications
FOR DELETE TO public
USING (auth.uid() = user_id);

CREATE POLICY "Anyone can insert notifications" ON public.notifications
FOR INSERT TO authenticated
WITH CHECK (true);

-- Fix vouch_codes
CREATE POLICY "Issuer creates codes" ON public.vouch_codes
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = issuer_id);

-- Allow redeemers to update vouch codes to redeemed
CREATE POLICY "Redeemer can update code" ON public.vouch_codes
FOR UPDATE TO authenticated
USING (status = 'active')
WITH CHECK (status = 'redeemed' AND redeemer_id = auth.uid());

-- Fix vouch_events
CREATE POLICY "Issuer inserts events" ON public.vouch_events
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = issuer_id);

CREATE POLICY "Redeemer updates events" ON public.vouch_events
FOR UPDATE TO authenticated
USING (true)
WITH CHECK (recipient_id = auth.uid());

-- Fix connection_requests
-- Need to make sure people can insert requests
CREATE POLICY "Users create connection requests" ON public.connection_requests
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users update received connection requests" ON public.connection_requests
FOR UPDATE TO authenticated
USING (auth.uid() = recipient_id OR auth.uid() = sender_id);

