-- ذاكرة الصوت: كل نص يُولَّد صوته مرة واحدة ويُحفظ في حاوية lesson-audio، ويُفهرَس هنا ببصمة النص.
-- text_hash = SHA-256 لـ "model|voice|text" — فالنص المتكرر بين الدروس يُولَّد مرة واحدة فقط.
create table if not exists audio_cache (
  text_hash text primary key,
  text text not null,
  voice text not null,
  model text not null,
  path text not null,
  bytes int not null default 0,
  created_at timestamptz not null default now()
);

alter table audio_cache enable row level security;
create policy "read audio_cache" on audio_cache for select using (auth.uid() is not null);
create policy "write audio_cache" on audio_cache for all using (is_admin());

-- فهارس المفاتيح الأجنبية: غيابها جعل حذف الدروس بطيئًا (انتهت مهلته أثناء تنظيف النسخ المكرَّرة).
create index if not exists lesson_activities_lesson_id_idx on lesson_activities (lesson_id);
create index if not exists activities_lesson_id_idx on activities (lesson_id);
