-- توليد الصوت عند أول طلب من أي مستخدم مسجّل (أدمن أو ولي أمر/طالب) وحفظه للجميع.
-- الإضافة فقط: لا تعديل ولا حذف إلا للأدمن. ونقيّد النوع والحجم والتسمية حتى لا تُستغل الحاوية العامة.

update storage.buckets
  set file_size_limit = 1048576,              -- 1 ميجابايت للملف
      allowed_mime_types = array['audio/wav']
  where id = 'lesson-audio';

create policy "signed-in adds lesson audio" on storage.objects for insert to authenticated
  with check (bucket_id = 'lesson-audio' and name like 'tts/%.wav');

create policy "signed-in adds audio_cache" on audio_cache for insert to authenticated
  with check (
    length(text_hash) = 64
    and path = 'tts/' || text_hash || '.wav'
    and length(text) <= 500
  );
