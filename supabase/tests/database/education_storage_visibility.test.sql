begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select no_plan();
select ok((select not public and file_size_limit=52428800 from storage.buckets where id='education'),'Education bucket is private and bounded');
insert into auth.users(id,email,raw_user_meta_data) values
('97000000-0000-4000-8000-000000000001','education-author@example.test','{"display_name":"Author"}'),
('97000000-0000-4000-8000-000000000002','education-reader@example.test','{"display_name":"Reader"}');
insert into public.user_roles(user_id,role) values ('97000000-0000-4000-8000-000000000001','editor');
insert into public.resources(id,title,status,created_by,kind,file_path) values
('97100000-0000-4000-8000-000000000001','Published file','published','97000000-0000-4000-8000-000000000001','file','resources/97000000-0000-4000-8000-000000000001/published.pdf'),
('97100000-0000-4000-8000-000000000002','Draft file','draft','97000000-0000-4000-8000-000000000001','file','resources/97000000-0000-4000-8000-000000000001/draft.pdf');
insert into storage.objects(bucket_id,name) values
('education','resources/97000000-0000-4000-8000-000000000001/published.pdf'),
('education','resources/97000000-0000-4000-8000-000000000001/draft.pdf'),
('education','resources/97000000-0000-4000-8000-000000000001/unreferenced.pdf');
set local role authenticated;
set local "request.jwt.claim.sub"='97000000-0000-4000-8000-000000000002';
set local "request.jwt.claim.role"='authenticated';
select is((select count(*)::int from storage.objects where bucket_id='education'),1,'Member can see only the published reference');
select is((select name from storage.objects where bucket_id='education'),'resources/97000000-0000-4000-8000-000000000001/published.pdf','Draft and unreferenced files remain private');
select throws_ok($$insert into storage.objects(bucket_id,name) values ('education','resources/97000000-0000-4000-8000-000000000002/forged.pdf')$$,'42501',null,'Ordinary member cannot upload education content');
set local "request.jwt.claim.sub"='97000000-0000-4000-8000-000000000001';
select lives_ok($$insert into storage.objects(bucket_id,name) values ('education','resources/97000000-0000-4000-8000-000000000001/new.pdf')$$,'Author can upload within their own canonical path');
select throws_ok($$insert into storage.objects(bucket_id,name) values ('education','resources/97000000-0000-4000-8000-000000000002/forged.pdf')$$,'42501',null,'Author cannot choose another uploader path');
select throws_ok($$insert into storage.objects(bucket_id,name) values ('education','arbitrary/97000000-0000-4000-8000-000000000001/forged.pdf')$$,'42501',null,'Unknown upload prefixes are denied');
select throws_ok($$update storage.objects set name='resources/97000000-0000-4000-8000-000000000002/moved.pdf' where bucket_id='education' and name='resources/97000000-0000-4000-8000-000000000001/new.pdf'$$,'42501',null,'Rename cannot cross uploader ownership');
reset role;
update public.resources set status='archived' where id='97100000-0000-4000-8000-000000000001';
set local role authenticated;
set local "request.jwt.claim.sub"='97000000-0000-4000-8000-000000000002';
select is((select count(*)::int from storage.objects where bucket_id='education'),0,'Archiving a reference withdraws member access');
reset role;
insert into public.member_suspensions(user_id,actor_id,reason) values ('97000000-0000-4000-8000-000000000001','97000000-0000-4000-8000-000000000002','Storage suspension test');
set local role authenticated;
set local "request.jwt.claim.sub"='97000000-0000-4000-8000-000000000001';
select is((select count(*)::int from storage.objects where bucket_id='education'),0,'Suspension closes education file reads');
select throws_ok($$insert into storage.objects(bucket_id,name) values ('education','resources/97000000-0000-4000-8000-000000000001/suspended.pdf')$$,'42501',null,'Suspension closes education uploads');
select * from finish();
rollback;
