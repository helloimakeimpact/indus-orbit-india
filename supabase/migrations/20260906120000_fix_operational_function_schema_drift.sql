-- Repair four latent function-body errors exposed by a full clean replay with
-- `supabase db lint`. The first two functions are already released. The Room
-- administration functions are repaired only when the structured-Spaces
-- migration that defines them is present, so this forward migration is also
-- safe on environments where that feature has not been released yet.

do $migration$
declare
  target_function regprocedure;
  function_definition text;
begin
  target_function := to_regprocedure(
    'public.admin_trust_case_queue(text,text,boolean,timestamptz,uuid,integer)'
  );
  if target_function is null then
    raise exception 'admin_trust_case_queue is required before applying this migration';
  end if;

  function_definition := pg_get_functiondef(target_function);
  if position('message.body' in function_definition) > 0 then
    function_definition := replace(function_definition, 'message.body', 'message.content');
    execute function_definition;
  elsif position('message.content' in function_definition) = 0 then
    raise exception 'admin_trust_case_queue does not contain the expected message excerpt expression';
  end if;

  target_function := to_regprocedure('public.admin_io_payment_queue(integer)');
  if target_function is null then
    raise exception 'admin_io_payment_queue is required before applying this migration';
  end if;

  function_definition := pg_get_functiondef(target_function);
  if position('intent.failed_at' in function_definition) > 0 then
    function_definition := replace(
      function_definition,
      'intent.failed_at',
      $$case when intent.state = 'failed' then intent.updated_at else null end$$
    );
    execute function_definition;
  elsif position($$intent.state = 'failed'$$ in function_definition) = 0 then
    raise exception 'admin_io_payment_queue does not contain the expected failure timestamp expression';
  end if;

  target_function := to_regprocedure(
    'public.reorder_managed_conversation_rooms(uuid,uuid[],uuid)'
  );
  if target_function is not null then
    function_definition := pg_get_functiondef(target_function);
    if position('event.actor_id = actor_id' in function_definition) > 0 then
      function_definition := replace(
        function_definition,
        'event.actor_id = actor_id',
        'event.actor_id = (select auth.uid())'
      );
      execute function_definition;
    elsif position('event.actor_id = (select auth.uid())' in function_definition) = 0 then
      raise exception 'reorder_managed_conversation_rooms does not contain the expected replay lookup';
    end if;
  end if;

  target_function := to_regprocedure(
    'public.set_managed_conversation_room_archive(uuid,boolean,text,uuid)'
  );
  if target_function is not null then
    function_definition := pg_get_functiondef(target_function);
    if position('event.actor_id = actor_id' in function_definition) > 0 then
      function_definition := replace(
        function_definition,
        'event.actor_id = actor_id',
        'event.actor_id = (select auth.uid())'
      );
      execute function_definition;
    elsif position('event.actor_id = (select auth.uid())' in function_definition) = 0 then
      raise exception 'set_managed_conversation_room_archive does not contain the expected replay lookup';
    end if;
  end if;
end;
$migration$;

