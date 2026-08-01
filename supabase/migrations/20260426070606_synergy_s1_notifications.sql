CREATE TABLE public.mentor_sessions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    expert_id uuid REFERENCES public.profiles(user_id) NOT NULL,
    booker_id uuid REFERENCES public.profiles(user_id) NOT NULL,
    duration_mins integer NOT NULL DEFAULT 30,
    message text NOT NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'completed', 'cancelled')),
    meeting_url text,
    scheduled_for timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.mentor_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sessions" ON public.mentor_sessions
    FOR SELECT USING (auth.uid() = expert_id OR auth.uid() = booker_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create sessions" ON public.mentor_sessions
    FOR INSERT WITH CHECK (auth.uid() = booker_id);

CREATE POLICY "Participants can update their sessions" ON public.mentor_sessions
    FOR UPDATE USING (auth.uid() = expert_id OR auth.uid() = booker_id);

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(user_id) NOT NULL,
    type text NOT NULL,
    message text NOT NULL,
    link text,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own notifications" ON public.notifications
    FOR ALL USING (auth.uid() = user_id);

