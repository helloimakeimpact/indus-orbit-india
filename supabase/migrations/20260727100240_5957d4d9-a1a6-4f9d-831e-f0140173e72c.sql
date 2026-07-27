-- Scope has_role-based story policies to authenticated so anon can read approved stories without touching has_role.
DROP POLICY IF EXISTS "Admins/editors can update stories" ON public.stories;
CREATE POLICY "Admins/editors can update stories"
ON public.stories FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'editor'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'editor'::app_role));

DROP POLICY IF EXISTS "Admins/editors can view all stories" ON public.stories;
CREATE POLICY "Admins/editors can view all stories"
ON public.stories FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'editor'::app_role));

DROP POLICY IF EXISTS "Authors can view their own stories" ON public.stories;
CREATE POLICY "Authors can view their own stories"
ON public.stories FOR SELECT TO authenticated
USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "Leads can update chapter stories" ON public.stories;
CREATE POLICY "Leads can update chapter stories"
ON public.stories FOR UPDATE TO authenticated
USING (
  (author_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR (
    chapter_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.chapter_members cm
      WHERE cm.chapter_id = stories.chapter_id AND cm.user_id = auth.uid() AND cm.role = 'lead'
    )
  )
);
