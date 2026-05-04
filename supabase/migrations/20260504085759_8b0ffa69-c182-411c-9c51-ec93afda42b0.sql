
-- Lock down the two new SECURITY DEFINER functions
REVOKE ALL ON FUNCTION public.event_rsvp_counts(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.event_rsvp_counts(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.lead_feature_story(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.lead_feature_story(uuid) TO authenticated;
