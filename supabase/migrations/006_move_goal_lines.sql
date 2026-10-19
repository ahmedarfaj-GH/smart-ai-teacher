-- تصحيح بيانات: أسطر الهدف المائلة (*يتدرب على ...*) كانت محفوظة كنص للطالب؛ تُنقل إلى ملاحظات المعلم.
with parts as (
  select a.id,
    string_agg(t.l, E'\n' order by t.n) filter (where t.l !~ '^\*[^*].*[^*]\*$') as new_content,
    string_agg(substr(t.l, 2, length(t.l) - 2), E'\n' order by t.n) filter (where t.l ~ '^\*[^*].*[^*]\*$') as goals
  from lesson_activities a, regexp_split_to_table(a.content, E'\n') with ordinality as t(l, n)
  group by a.id
)
update lesson_activities a
set content = coalesce(p.new_content, ''),
    teacher_notes = case
      when a.teacher_notes = '' then 'الهدف: ' || p.goals
      else a.teacher_notes || E'\nالهدف: ' || p.goals
    end
from parts p
where p.id = a.id and p.goals is not null;
