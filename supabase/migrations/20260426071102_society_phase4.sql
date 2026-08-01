ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'chapter_lead';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'editor';
COMMIT;

CREATE TABLE public.chapters (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    city text,
    country text,
    description text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view chapters" ON public.chapters FOR SELECT USING (true);
CREATE POLICY "Admins can manage chapters" ON public.chapters FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.chapter_members (
    chapter_id uuid REFERENCES public.chapters(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
    role text NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'lead')),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    PRIMARY KEY (chapter_id, user_id)
);

ALTER TABLE public.chapter_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view chapter members" ON public.chapter_members FOR SELECT USING (true);
CREATE POLICY "Users can join chapters" ON public.chapter_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave chapters" ON public.chapter_members FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins and leads can update chapter members" ON public.chapter_members FOR UPDATE USING (
    public.has_role(auth.uid(), 'admin') OR 
    EXISTS (SELECT 1 FROM public.chapter_members WHERE chapter_id = chapter_members.chapter_id AND user_id = auth.uid() AND role = 'lead')
);

CREATE TABLE public.stories (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    author_id uuid REFERENCES public.profiles(user_id) NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined', 'featured')),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    published_at timestamp with time zone
);

ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view approved stories" ON public.stories FOR SELECT USING (status IN ('approved', 'featured'));
CREATE POLICY "Authors can view their own stories" ON public.stories FOR SELECT USING (auth.uid() = author_id);
CREATE POLICY "Admins/editors can view all stories" ON public.stories FOR SELECT USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));
CREATE POLICY "Users can create stories" ON public.stories FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Admins/editors can update stories" ON public.stories FOR UPDATE USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

CREATE TABLE public.events (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    chapter_id uuid REFERENCES public.chapters(id),
    organizer_id uuid REFERENCES public.profiles(user_id) NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone NOT NULL,
    location_type text NOT NULL CHECK (location_type IN ('virtual', 'irl')),
    location text,
    link text,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view approved events" ON public.events FOR SELECT USING (status = 'approved');
CREATE POLICY "Organizers can view their events" ON public.events FOR SELECT USING (auth.uid() = organizer_id);
CREATE POLICY "Admins can view all events" ON public.events FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can create events" ON public.events FOR INSERT WITH CHECK (auth.uid() = organizer_id);
CREATE POLICY "Admins can update events" ON public.events FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.spotlights (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(user_id) NOT NULL,
    featured_by uuid REFERENCES public.profiles(user_id) NOT NULL,
    writeup text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.spotlights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view spotlights" ON public.spotlights FOR SELECT USING (true);
CREATE POLICY "Admins can create spotlights" ON public.spotlights FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

