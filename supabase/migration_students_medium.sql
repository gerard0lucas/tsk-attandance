-- Adds medium (English, Kannada, Marathi) for students.
-- Run in Supabase SQL Editor.

alter table public.students
  add column if not exists medium text not null default 'english';

alter table public.students drop constraint if exists students_medium_check;
alter table public.students
  add constraint students_medium_check
  check (medium in ('english', 'kannada', 'marathi'));
