GRANT SELECT ON public.soda_ideas TO anon;
CREATE POLICY "Anyone can view published soda ideas"
ON public.soda_ideas
FOR SELECT
TO anon
USING (status = 'published');