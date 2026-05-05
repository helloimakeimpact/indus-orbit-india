-- Allow admins to delete stories
CREATE POLICY "Admins can delete stories"
ON public.stories
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to delete events
CREATE POLICY "Admins can delete events"
ON public.events
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
