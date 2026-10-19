-- صور صفحات الكتاب (تُعرض للطالب مع النشاط): حاوية خاصة، يرفعها الأدمن ويقرؤها أي مستخدم مسجَّل بروابط موقّعة.
insert into storage.buckets (id, name, public) values ('book-pages', 'book-pages', false)
on conflict (id) do nothing;

create policy "signed-in reads book pages" on storage.objects for select to authenticated
  using (bucket_id = 'book-pages');
create policy "admin writes book pages" on storage.objects for insert to authenticated
  with check (bucket_id = 'book-pages' and is_admin());
create policy "admin updates book pages" on storage.objects for update to authenticated
  using (bucket_id = 'book-pages' and is_admin());
