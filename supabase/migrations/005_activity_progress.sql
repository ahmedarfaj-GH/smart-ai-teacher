-- تقدّم الطالب في الأنشطة غير المقيَّمة آليًا (القراءة والحفظ): النظام يحتفظ بما أنجزه، ولا يتحقق منه.
--   done     = أنجز النشاط (قراءة/استماع)
--   learned  = تعلّم المحفوظ وينتظر التسميع (يؤكده ولي الأمر لاحقًا)
--   recited  = سمّع المحفوظ (تأكيد ولي الأمر)
create table if not exists activity_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  activity_id uuid not null references lesson_activities(id) on delete cascade,
  status text not null check (status in ('done', 'learned', 'recited')),
  updated_at timestamptz not null default now(),
  unique (student_id, activity_id)
);

create index if not exists activity_progress_student_idx on activity_progress (student_id);
create index if not exists activity_progress_activity_idx on activity_progress (activity_id);

alter table activity_progress enable row level security;
create policy "family reads activity_progress" on activity_progress for select
  using (owns_student(student_id) or is_admin());
create policy "family writes activity_progress" on activity_progress for all
  using (owns_student(student_id));
