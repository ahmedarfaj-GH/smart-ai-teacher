-- ترحيل للمشاريع التي شغّلت schema.sql القديم:
--   1) حذف المحتوى الوهمي (وحدات "أقاربي"... والمهارات العامة وجلسات التجربة)
--   2) تحويل الصف إلى "الأول الابتدائي" (الكتاب الفعلي: لغتي — الصف الأول، الفصل الأول)
--   3) إضافة جدول أنشطة الدروس وحاوية الصوت
-- شغّله مرة واحدة في Supabase → SQL Editor. بعده ارفع ملف الكتاب (md) من لوحة الأدمن.

-- ============ 1) حذف المحتوى الوهمي ============
delete from attempts;
delete from activities;
delete from sessions;
delete from student_skills;
update student_subjects set current_unit_id = null, current_lesson_id = null;
delete from books;   -- يحذف تلقائيًا الوحدات والدروس وروابط المهارات
delete from skills;

-- ============ 2) المهارات = تصنيفات الأنشطة + الصف الأول ============
insert into skills (name) values
  ('القراءة'), ('الاستماع والنطق'), ('الحفظ'), ('الإملاء'), ('الكتابة'), ('التحدث');

update grades set name = 'الصف الأول الابتدائي' where id = '00000000-0000-0000-0000-000000000003';

-- ============ 3) أنشطة الدروس ============
create table if not exists lesson_activities (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references lessons(id) on delete cascade,
  "order" int not null,
  kind text not null check (kind in ('reading', 'listening', 'memorization', 'dictation', 'writing', 'speaking', 'paper', 'enrichment')),
  section text not null default 'lesson' check (section in ('lesson', 'assessment', 'enrichment')),
  title text not null,
  page text not null default '',
  content text not null default '',
  teacher_notes text not null default '',
  parent_note text not null default '',
  audio_path text  -- مسار ملف الصوت في حاوية lesson-audio (يُولَّد مرة واحدة)
);

alter table lesson_activities enable row level security;
create policy "read lesson_activities" on lesson_activities for select using (auth.uid() is not null);
create policy "write lesson_activities" on lesson_activities for all using (is_admin());

-- حاوية الصوت: القراءة عامة (روابط مباشرة)، الكتابة للأدمن فقط.
insert into storage.buckets (id, name, public) values ('lesson-audio', 'lesson-audio', true)
  on conflict (id) do nothing;
create policy "admin writes lesson audio" on storage.objects for all
  using (bucket_id = 'lesson-audio' and public.is_admin())
  with check (bucket_id = 'lesson-audio' and public.is_admin());
