-- مخطط قاعدة بيانات "المدرس الذكي" — المرحلة 8 (MVP)
-- الصقه كاملاً في Supabase Dashboard → SQL Editor → Run
-- يفترض أن Supabase مفعّل عليه إضافتا pgcrypto/uuid-ossp افتراضيًا (كذلك في كل مشروع جديد).

-- ============ profiles (تمتد فوق auth.users) ============
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'parent')),
  name text not null,
  created_at timestamptz not null default now()
);

-- عند إنشاء مستخدم جديد في auth.users، أنشئ صفًا مطابقًا في profiles تلقائيًا
-- بالاعتماد على raw_user_meta_data التي تُمرَّر وقت signUp({ options: { data: { role, name } } })
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, role, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'parent'),
    coalesce(new.raw_user_meta_data->>'name', '')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============ محتوى المنهج (Admin-managed) ============
create table academic_years (
  id uuid primary key default gen_random_uuid(),
  label text not null
);

create table stages (
  id uuid primary key default gen_random_uuid(),
  academic_year_id uuid not null references academic_years(id) on delete cascade,
  name text not null
);

create table grades (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid not null references stages(id) on delete cascade,
  name text not null
);

create table semesters (
  id uuid primary key default gen_random_uuid(),
  grade_id uuid not null references grades(id) on delete cascade,
  name text not null
);

create table subjects (
  id uuid primary key default gen_random_uuid(),
  semester_id uuid not null references semesters(id) on delete cascade,
  name text not null
);

create table books (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references subjects(id) on delete cascade,
  title text not null,
  book_type text not null,
  part text not null,
  source text not null,
  status text not null default 'draft' check (status in ('draft', 'reviewed', 'published')),
  raw_extracted_text text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table units (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references books(id) on delete cascade,
  "order" int not null,
  title text not null,
  status text not null default 'draft' check (status in ('draft', 'reviewed', 'published'))
);

create table lessons (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references units(id) on delete cascade,
  "order" int not null,
  title text not null,
  content_type text not null,
  pages text not null,
  status text not null default 'draft' check (status in ('draft', 'reviewed', 'published'))
);

create table skills (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table lesson_skills (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references lessons(id) on delete cascade,
  skill_id uuid not null references skills(id) on delete cascade,
  unique (lesson_id, skill_id)
);

create table teachers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  gender text not null,
  stage text not null,
  language text not null,
  teaching_style text not null,
  child_safety text not null,
  hint_first boolean not null default true,
  give_direct_answer boolean not null default false,
  one_instruction_at_a_time boolean not null default true,
  session_length_min int not null,
  session_length_max int not null
);

-- ============ الطلاب وأولياء الأمور (بيانات حقيقية متعددة المستخدمين) ============
create table students (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  age int not null,
  grade_id uuid not null references grades(id)
);

create table student_subjects (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  teacher_id uuid not null references teachers(id),
  active boolean not null default false,
  current_unit_id uuid references units(id),
  current_lesson_id uuid references lessons(id),
  unique (student_id, subject_id)
);

create table student_skills (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  skill_id uuid not null references skills(id) on delete cascade,
  status text not null default 'not_started'
    check (status in ('not_started', 'learning', 'needs_practice', 'good', 'mastered')),
  unique (student_id, skill_id)
);

-- ============ الجلسات والمحاولات ============
create table sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create table activities (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  lesson_id uuid not null references lessons(id),
  skill_id uuid not null references skills(id),
  "order" int not null
);

create table attempts (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references activities(id) on delete cascade,
  score smallint not null check (score between 0 and 3),
  hints_used smallint not null default 0,
  created_at timestamptz not null default now()
);

-- ============ دوال مساعدة لسياسات RLS ============
create function public.is_admin()
returns boolean as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$ language sql security definer stable;

create function public.owns_student(target_student_id uuid)
returns boolean as $$
  select exists (
    select 1 from students where id = target_student_id and parent_id = auth.uid()
  );
$$ language sql security definer stable;

-- ============ تفعيل RLS ============
alter table profiles enable row level security;
alter table academic_years enable row level security;
alter table stages enable row level security;
alter table grades enable row level security;
alter table semesters enable row level security;
alter table subjects enable row level security;
alter table books enable row level security;
alter table units enable row level security;
alter table lessons enable row level security;
alter table skills enable row level security;
alter table lesson_skills enable row level security;
alter table teachers enable row level security;
alter table students enable row level security;
alter table student_subjects enable row level security;
alter table student_skills enable row level security;
alter table sessions enable row level security;
alter table activities enable row level security;
alter table attempts enable row level security;

-- profiles: كل مستخدم يقرأ/يعدّل ملفه فقط؛ الأدمن يقرأ الكل (لعرض الإحصائيات)
create policy "read own profile" on profiles for select using (id = auth.uid() or is_admin());
create policy "update own profile" on profiles for update using (id = auth.uid());

-- محتوى المنهج المرجعي: قراءة للجميع المسجّلين، كتابة للأدمن فقط
create policy "read curriculum ref" on academic_years for select using (auth.uid() is not null);
create policy "write curriculum ref" on academic_years for all using (is_admin());

create policy "read stages" on stages for select using (auth.uid() is not null);
create policy "write stages" on stages for all using (is_admin());

create policy "read grades" on grades for select using (auth.uid() is not null);
create policy "write grades" on grades for all using (is_admin());

create policy "read semesters" on semesters for select using (auth.uid() is not null);
create policy "write semesters" on semesters for all using (is_admin());

create policy "read subjects" on subjects for select using (auth.uid() is not null);
create policy "write subjects" on subjects for all using (is_admin());

create policy "read books" on books for select using (auth.uid() is not null);
create policy "write books" on books for all using (is_admin());

create policy "read units" on units for select using (auth.uid() is not null);
create policy "write units" on units for all using (is_admin());

create policy "read lessons" on lessons for select using (auth.uid() is not null);
create policy "write lessons" on lessons for all using (is_admin());

create policy "read skills" on skills for select using (auth.uid() is not null);
create policy "write skills" on skills for all using (is_admin());

create policy "read lesson_skills" on lesson_skills for select using (auth.uid() is not null);
create policy "write lesson_skills" on lesson_skills for all using (is_admin());

create policy "read teachers" on teachers for select using (auth.uid() is not null);
create policy "write teachers" on teachers for all using (is_admin());

-- بيانات الأسرة: ولي الأمر يرى/يدير أبناءه فقط؛ الأدمن يقرأ الكل
create policy "parent reads own children" on students for select
  using (parent_id = auth.uid() or is_admin());
create policy "parent manages own children" on students for insert
  with check (parent_id = auth.uid());
create policy "parent updates own children" on students for update
  using (parent_id = auth.uid());
create policy "parent deletes own children" on students for delete
  using (parent_id = auth.uid());

create policy "family reads student_subjects" on student_subjects for select
  using (owns_student(student_id) or is_admin());
create policy "family writes student_subjects" on student_subjects for all
  using (owns_student(student_id));

create policy "family reads student_skills" on student_skills for select
  using (owns_student(student_id) or is_admin());
create policy "family writes student_skills" on student_skills for all
  using (owns_student(student_id));

create policy "family reads sessions" on sessions for select
  using (owns_student(student_id) or is_admin());
create policy "family writes sessions" on sessions for all
  using (owns_student(student_id));

create policy "family reads activities" on activities for select
  using (exists (select 1 from sessions s where s.id = session_id and (owns_student(s.student_id) or is_admin())));
create policy "family writes activities" on activities for all
  using (exists (select 1 from sessions s where s.id = session_id and owns_student(s.student_id)));

create policy "family reads attempts" on attempts for select
  using (exists (
    select 1 from activities a join sessions s on s.id = a.session_id
    where a.id = activity_id and (owns_student(s.student_id) or is_admin())
  ));
create policy "family writes attempts" on attempts for all
  using (exists (
    select 1 from activities a join sessions s on s.id = a.session_id
    where a.id = activity_id and owns_student(s.student_id)
  ));

-- ============ البيانات الأولية (Seed) — تطابق src/data/seed.ts ============
insert into academic_years (id, label) values
  ('00000000-0000-0000-0000-000000000001', '1448هـ');

insert into stages (id, academic_year_id, name) values
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'المرحلة الابتدائية');

insert into grades (id, stage_id, name) values
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'الصف الثاني الابتدائي');

insert into semesters (id, grade_id, name) values
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000003', 'الفصل الدراسي الأول');

insert into subjects (id, semester_id, name) values
  ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000004', 'لغتي');

insert into teachers (id, name, gender, stage, language, teaching_style, child_safety, hint_first, give_direct_answer, one_instruction_at_a_time, session_length_min, session_length_max) values
  ('00000000-0000-0000-0000-000000000006', 'أحمد', 'ذكر', 'ابتدائي', 'عربية سعودية مبسطة', 'Supportive', 'Strict', true, false, true, 10, 15);

insert into skills (id, name) values
  ('00000000-0000-0000-0000-000000000010', 'الاستماع'),
  ('00000000-0000-0000-0000-000000000011', 'التحدث'),
  ('00000000-0000-0000-0000-000000000012', 'قراءة الكلمات'),
  ('00000000-0000-0000-0000-000000000013', 'القراءة الجهرية'),
  ('00000000-0000-0000-0000-000000000014', 'فهم المقروء'),
  ('00000000-0000-0000-0000-000000000015', 'المفردات'),
  ('00000000-0000-0000-0000-000000000016', 'تحليل الكلمات إلى مقاطع'),
  ('00000000-0000-0000-0000-000000000017', 'التعرف على الحروف'),
  ('00000000-0000-0000-0000-000000000018', 'ترتيب الكلمات'),
  ('00000000-0000-0000-0000-000000000019', 'بناء الجملة'),
  ('00000000-0000-0000-0000-00000000001a', 'الإملاء'),
  ('00000000-0000-0000-0000-00000000001b', 'الكتابة'),
  ('00000000-0000-0000-0000-00000000001c', 'التاء المفتوحة والمربوطة'),
  ('00000000-0000-0000-0000-00000000001d', 'اللام الشمسية والقمرية');

insert into books (id, subject_id, title, book_type, part, source, status) values
  ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000005', 'لغتي — كتاب الطالب', 'كتاب الطالب', 'الجزء الأول', 'وزارة التعليم', 'draft');

insert into units (id, book_id, "order", title, status) values
  ('00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000020', 1, 'الوحدة الأولى: أقاربي', 'draft'),
  ('00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000020', 2, 'الوحدة الثانية: أصدقائي وجيراني', 'draft'),
  ('00000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000020', 3, 'الوحدة الثالثة: وطني السعودية', 'draft'),
  ('00000000-0000-0000-0000-000000000033', '00000000-0000-0000-0000-000000000020', 4, 'الوحدة الرابعة: محاصيل من بلادي', 'draft');

insert into lessons (id, unit_id, "order", title, content_type, pages, status) values
  ('00000000-0000-0000-0000-000000000040', '00000000-0000-0000-0000-000000000030', 1, 'مدخل الوحدة', 'تمهيد', '8-9', 'draft'),
  ('00000000-0000-0000-0000-000000000041', '00000000-0000-0000-0000-000000000030', 2, 'الاستماع', 'استماع', '10', 'draft'),
  ('00000000-0000-0000-0000-000000000042', '00000000-0000-0000-0000-000000000030', 3, 'النشيد', 'نشيد', '11', 'draft'),
  ('00000000-0000-0000-0000-000000000043', '00000000-0000-0000-0000-000000000030', 4, 'الدرس الأول: صلة الرحم', 'درس', '12-17', 'draft'),
  ('00000000-0000-0000-0000-000000000044', '00000000-0000-0000-0000-000000000030', 5, 'الدرس الثاني: عذرًا يا جدي', 'درس', '18-23', 'draft'),
  ('00000000-0000-0000-0000-000000000045', '00000000-0000-0000-0000-000000000030', 6, 'التقويم التجميعي', 'تقويم', '24-25', 'draft');

insert into lesson_skills (lesson_id, skill_id) values
  ('00000000-0000-0000-0000-000000000041', '00000000-0000-0000-0000-000000000010'),
  ('00000000-0000-0000-0000-000000000042', '00000000-0000-0000-0000-000000000010'),
  ('00000000-0000-0000-0000-000000000042', '00000000-0000-0000-0000-000000000011'),
  ('00000000-0000-0000-0000-000000000043', '00000000-0000-0000-0000-000000000012'),
  ('00000000-0000-0000-0000-000000000043', '00000000-0000-0000-0000-000000000014'),
  ('00000000-0000-0000-0000-000000000043', '00000000-0000-0000-0000-000000000015'),
  ('00000000-0000-0000-0000-000000000043', '00000000-0000-0000-0000-000000000016'),
  ('00000000-0000-0000-0000-000000000043', '00000000-0000-0000-0000-000000000017'),
  ('00000000-0000-0000-0000-000000000044', '00000000-0000-0000-0000-000000000013'),
  ('00000000-0000-0000-0000-000000000044', '00000000-0000-0000-0000-000000000014'),
  ('00000000-0000-0000-0000-000000000044', '00000000-0000-0000-0000-000000000019'),
  ('00000000-0000-0000-0000-000000000045', '00000000-0000-0000-0000-000000000012'),
  ('00000000-0000-0000-0000-000000000045', '00000000-0000-0000-0000-000000000014'),
  ('00000000-0000-0000-0000-000000000045', '00000000-0000-0000-0000-000000000016'),
  ('00000000-0000-0000-0000-000000000045', '00000000-0000-0000-0000-00000000001a');
