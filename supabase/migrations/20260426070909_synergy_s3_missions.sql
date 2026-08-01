CREATE TABLE public.missions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    theme text NOT NULL,
    description text NOT NULL,
    status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    created_by uuid REFERENCES public.profiles(user_id) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view missions" ON public.missions
    FOR SELECT USING (true);

CREATE POLICY "Only admins can create missions" ON public.missions
    FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update missions" ON public.missions
    FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.mission_members (
    mission_id uuid REFERENCES public.missions(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
    role text NOT NULL CHECK (role IN ('contributor', 'founder')),
    commitment_type text,
    message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    PRIMARY KEY (mission_id, user_id)
);

ALTER TABLE public.mission_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view mission members" ON public.mission_members
    FOR SELECT USING (true);

CREATE POLICY "Users can join missions" ON public.mission_members
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their mission participation" ON public.mission_members
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can leave missions" ON public.mission_members
    FOR DELETE USING (auth.uid() = user_id);

