-- الإجابة الصحيحة لعناصر "أكمل" (المفتاح: نص العنصر كما يظهر للطالب).
alter table lesson_activities add column if not exists answers jsonb not null default '{}'::jsonb;
