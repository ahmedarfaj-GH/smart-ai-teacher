-- الصف الثاني الابتدائي + الفصلان الدراسيان لكل صف + مادة لغتي لكل فصل، وربط الطالب بفصله.
-- ولي الأمر يختار الصف ثم الفصل عند تسجيل الابن، والمادة تُحدَّد من الفصل المختار.
alter table students add column if not exists semester_id uuid references semesters(id);

insert into grades (stage_id, name)
select st.id, 'الصف الثاني الابتدائي'
from stages st
where st.name = 'المرحلة الابتدائية'
  and not exists (select 1 from grades g where g.name = 'الصف الثاني الابتدائي');

insert into semesters (grade_id, name)
select g.id, t.name
from grades g
cross join (values ('الفصل الدراسي الأول'), ('الفصل الدراسي الثاني')) as t(name)
where g.name in ('الصف الأول الابتدائي', 'الصف الثاني الابتدائي')
  and not exists (select 1 from semesters s where s.grade_id = g.id and s.name = t.name);

insert into subjects (semester_id, name)
select s.id, 'لغتي'
from semesters s
where not exists (select 1 from subjects sub where sub.semester_id = s.id and sub.name = 'لغتي');

update students
set semester_id = (select s.id from semesters s where s.grade_id = students.grade_id and s.name = 'الفصل الدراسي الأول')
where semester_id is null;
