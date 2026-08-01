
-- ============================================
-- FIX 1: Correct broken RLS policies (chapter_members)
-- The bug was cm.chapter_id = cm.chapter_id (always true!) instead of
-- cm.chapter_id = chapter_members.chapter_id
-- ============================================
DROP POLICY IF EXISTS "Leads can delete chapter members" ON public.chapter_members;
DROP POLICY IF EXISTS "Leads can insert chapter members" ON public.chapter_members;
DROP POLICY IF EXISTS "Admins and leads can update chapter members" ON public.chapter_members;

-- Corrected policies with proper cross-table reference
CREATE POLICY "Leads can delete chapter members" ON public.chapter_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.chapter_members cm2
      WHERE cm2.chapter_id = chapter_members.chapter_id
        AND cm2.user_id = auth.uid()
        AND cm2.role = 'lead'
    )
  );

CREATE POLICY "Leads can insert chapter members" ON public.chapter_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chapter_members cm2
      WHERE cm2.chapter_id = chapter_members.chapter_id
        AND cm2.user_id = auth.uid()
        AND cm2.role = 'lead'
    )
  );

CREATE POLICY "Leads can update chapter members" ON public.chapter_members
  FOR UPDATE USING (
    has_role(auth.uid(), 'admin') OR
    EXISTS (
      SELECT 1 FROM public.chapter_members cm2
      WHERE cm2.chapter_id = chapter_members.chapter_id
        AND cm2.user_id = auth.uid()
        AND cm2.role = 'lead'
    )
  );

-- ============================================
-- FIX 2: Correct broken RLS policies (mission_members)
-- Same bug as above
-- ============================================
DROP POLICY IF EXISTS "Leads can delete mission members" ON public.mission_members;
DROP POLICY IF EXISTS "Leads can insert mission members" ON public.mission_members;
DROP POLICY IF EXISTS "Leads can update mission members" ON public.mission_members;

CREATE POLICY "Leads can delete mission members" ON public.mission_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.mission_members mm2
      WHERE mm2.mission_id = mission_members.mission_id
        AND mm2.user_id = auth.uid()
        AND mm2.role = 'lead'
    )
  );

CREATE POLICY "Leads can insert mission members" ON public.mission_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.mission_members mm2
      WHERE mm2.mission_id = mission_members.mission_id
        AND mm2.user_id = auth.uid()
        AND mm2.role = 'lead'
    )
  );

CREATE POLICY "Leads can update mission members" ON public.mission_members
  FOR UPDATE USING (
    has_role(auth.uid(), 'admin') OR
    EXISTS (
      SELECT 1 FROM public.mission_members mm2
      WHERE mm2.mission_id = mission_members.mission_id
        AND mm2.user_id = auth.uid()
        AND mm2.role = 'lead'
    )
  );

-- ============================================
-- FIX 3: Allow chapter leads to CREATE missions for their chapter
-- ============================================
-- Historical reconciliation note (2026-08-01): the deployed demo schema had
-- this column when the policies below were created, but the recovered local
-- migration ledger did not contain the out-of-band ALTER TABLE. Restore the
-- missing prerequisite here so an empty database can replay the recorded
-- policy migration deterministically.
ALTER TABLE public.missions
  ADD COLUMN IF NOT EXISTS chapter_id uuid REFERENCES public.chapters(id) ON DELETE SET NULL;

DROP POLICY IF EXISTS "Chapter leads can insert missions" ON public.missions;
CREATE POLICY "Chapter leads can insert missions" ON public.missions
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'admin') OR
    (chapter_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.chapter_members cm
      WHERE cm.chapter_id = missions.chapter_id
        AND cm.user_id = auth.uid()
        AND cm.role = 'lead'
    ))
  );

DROP POLICY IF EXISTS "Chapter leads can update their chapter missions" ON public.missions;
CREATE POLICY "Chapter leads can update their chapter missions" ON public.missions
  FOR UPDATE USING (
    created_by = auth.uid() OR
    has_role(auth.uid(), 'admin') OR
    (chapter_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.chapter_members cm
      WHERE cm.chapter_id = missions.chapter_id
        AND cm.user_id = auth.uid()
        AND cm.role = 'lead'
    ))
  );

-- ============================================
-- FIX 4: Allow chapter leads to CREATE stories for their chapter
-- ============================================
DROP POLICY IF EXISTS "Chapter leads can publish chapter stories" ON public.stories;
CREATE POLICY "Chapter leads can publish chapter stories" ON public.stories
  FOR INSERT WITH CHECK (
    author_id = auth.uid() AND (
      -- Admin can always post
      has_role(auth.uid(), 'admin') OR
      -- Chapter lead posting for their chapter
      (chapter_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.chapter_members cm
        WHERE cm.chapter_id = stories.chapter_id
          AND cm.user_id = auth.uid()
          AND cm.role = 'lead'
      )) OR
      -- Regular story submission (goes through admin review)
      chapter_id IS NULL
    )
  );

-- Allow chapter leads to auto-approve their own chapter stories
DROP POLICY IF EXISTS "Leads can update chapter stories" ON public.stories;
CREATE POLICY "Leads can update chapter stories" ON public.stories
  FOR UPDATE USING (
    author_id = auth.uid() OR
    has_role(auth.uid(), 'admin') OR
    (chapter_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.chapter_members cm
      WHERE cm.chapter_id = stories.chapter_id
        AND cm.user_id = auth.uid()
        AND cm.role = 'lead'
    ))
  );

-- ============================================
-- FIX 5: Allow chapter leads to CREATE events for their chapter
-- ============================================
DROP POLICY IF EXISTS "Chapter leads can create chapter events" ON public.events;
CREATE POLICY "Chapter leads can create chapter events" ON public.events
  FOR INSERT WITH CHECK (
    organizer_id = auth.uid() AND (
      has_role(auth.uid(), 'admin') OR
      (chapter_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.chapter_members cm
        WHERE cm.chapter_id = events.chapter_id
          AND cm.user_id = auth.uid()
          AND cm.role = 'lead'
      ))
    )
  );

DROP POLICY IF EXISTS "Chapter leads can update chapter events" ON public.events;
CREATE POLICY "Chapter leads can update chapter events" ON public.events
  FOR UPDATE USING (
    organizer_id = auth.uid() OR
    has_role(auth.uid(), 'admin') OR
    (chapter_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.chapter_members cm
      WHERE cm.chapter_id = events.chapter_id
        AND cm.user_id = auth.uid()
        AND cm.role = 'lead'
    ))
  );
