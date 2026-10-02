-- Restore the intended private bucket when absent and replace broad file access.
-- 50 MiB is the bounded technical upload ceiling; supplier/scanning approval is
-- still a production gate. This does not mark existing/new files as scanned.
insert into storage.buckets(id,name,public,file_size_limit)
values ('education','education',false,52428800)
on conflict(id) do update set public=false,file_size_limit=52428800;
drop policy if exists "Members read education files" on storage.objects;
drop policy if exists "Authors upload education files" on storage.objects;
drop policy if exists "Authors update education files" on storage.objects;
drop policy if exists "Authors delete education files" on storage.objects;
create policy "Members read published education files" on storage.objects for select to authenticated using (bucket_id = 'education' and not public.is_suspended((select auth.uid())) and (
  public.can_author_education((select auth.uid()))
  or exists (select 1 from public.resources r where r.status='published' and r.file_path=storage.objects.name)
  or exists (select 1 from public.lesson_attachments a join public.lessons l on l.id=a.lesson_id
    join public.course_modules m on m.id=l.module_id join public.courses c on c.id=m.course_id
    where a.file_path=storage.objects.name and l.status='published' and c.status='published')
));
create policy "Authors upload their education files" on storage.objects for insert to authenticated with check (bucket_id='education' and public.can_author_education((select auth.uid())) and (
  (array_length(storage.foldername(name),1)=2 and split_part(name,'/',1)='resources' and split_part(name,'/',2)=(select auth.uid())::text)
  or (array_length(storage.foldername(name),1)=3 and split_part(name,'/',1)='lessons' and split_part(name,'/',3)=(select auth.uid())::text
    and exists (select 1 from public.lessons l where l.id::text=split_part(storage.objects.name,'/',2)))
));
create policy "Authors update their education files" on storage.objects for update to authenticated using (bucket_id='education' and public.can_author_education((select auth.uid())) and (
  (array_length(storage.foldername(name),1)=2 and split_part(name,'/',1)='resources' and split_part(name,'/',2)=(select auth.uid())::text)
  or (array_length(storage.foldername(name),1)=3 and split_part(name,'/',1)='lessons' and split_part(name,'/',3)=(select auth.uid())::text
    and exists (select 1 from public.lessons l where l.id::text=split_part(storage.objects.name,'/',2)))
)) with check (bucket_id='education' and public.can_author_education((select auth.uid())) and (
  (array_length(storage.foldername(name),1)=2 and split_part(name,'/',1)='resources' and split_part(name,'/',2)=(select auth.uid())::text)
  or (array_length(storage.foldername(name),1)=3 and split_part(name,'/',1)='lessons' and split_part(name,'/',3)=(select auth.uid())::text
    and exists (select 1 from public.lessons l where l.id::text=split_part(storage.objects.name,'/',2)))
));
create policy "Authors delete their education files" on storage.objects for delete to authenticated using (bucket_id='education' and public.can_author_education((select auth.uid())) and (
  (array_length(storage.foldername(name),1)=2 and split_part(name,'/',1)='resources' and split_part(name,'/',2)=(select auth.uid())::text)
  or (array_length(storage.foldername(name),1)=3 and split_part(name,'/',1)='lessons' and split_part(name,'/',3)=(select auth.uid())::text
    and exists (select 1 from public.lessons l where l.id::text=split_part(storage.objects.name,'/',2)))
));
