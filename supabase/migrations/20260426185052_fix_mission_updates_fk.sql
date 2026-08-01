-- Fix mission_updates foreign key to point to profiles.user_id instead of auth.users
ALTER TABLE public.mission_updates 
DROP CONSTRAINT IF EXISTS mission_updates_author_id_fkey;

ALTER TABLE public.mission_updates
ADD CONSTRAINT mission_updates_author_id_fkey 
FOREIGN KEY (author_id) REFERENCES public.profiles(user_id)
ON DELETE CASCADE;

-- Also ensure mission_members join is clean by using explicit FK name if needed
-- but first let's fix the query.

