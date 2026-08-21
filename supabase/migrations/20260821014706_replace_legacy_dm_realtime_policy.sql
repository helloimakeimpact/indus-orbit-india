-- Private Realtime policies are permissive by default, so every matching policy
-- is combined with OR. Remove the historical topic-substring rule now that the
-- exact participant and member-block aware authorization function is released.

drop policy if exists "DM participants can subscribe"
on realtime.messages;

