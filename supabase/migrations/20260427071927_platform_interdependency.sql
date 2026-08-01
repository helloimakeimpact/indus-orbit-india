-- 1. Alter Events table
ALTER TABLE public.events ADD COLUMN mission_id UUID REFERENCES public.missions(id) ON DELETE CASCADE;

-- 2. Alter Stories table
ALTER TABLE public.stories ADD COLUMN mission_id UUID REFERENCES public.missions(id) ON DELETE SET NULL;
ALTER TABLE public.stories ADD COLUMN chapter_id UUID REFERENCES public.chapters(id) ON DELETE SET NULL;

-- 3. Alter mission_updates for pinning
ALTER TABLE public.mission_updates ADD COLUMN is_pinned BOOLEAN DEFAULT false;

-- 4. Create chapter_proposals table
CREATE TABLE public.chapter_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposer_id UUID REFERENCES auth.users(id) NOT NULL,
    proposed_name TEXT NOT NULL,
    city TEXT,
    country TEXT,
    target_audience TEXT,
    rationale TEXT NOT NULL,
    proposer_background TEXT NOT NULL,
    expected_size INTEGER,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.chapter_proposals ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for chapter_proposals
CREATE POLICY "Users can create proposals" ON public.chapter_proposals
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = proposer_id);

CREATE POLICY "Users can view own proposals" ON public.chapter_proposals
FOR SELECT TO authenticated
USING (auth.uid() = proposer_id);

CREATE POLICY "Admins can view all proposals" ON public.chapter_proposals
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update proposals" ON public.chapter_proposals
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 6. Update Mission Updates Policy for Leads
-- Allow members to insert, but only leads can update (e.g. to pin)
CREATE POLICY "Leads can update mission updates" ON public.mission_updates
FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.mission_members
        WHERE mission_members.mission_id = mission_updates.mission_id
        AND mission_members.user_id = auth.uid()
        AND mission_members.role = 'lead'
    )
);

