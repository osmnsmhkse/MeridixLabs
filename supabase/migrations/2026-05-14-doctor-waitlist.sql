create table if not exists public.doctor_waitlist (
  id            text primary key,
  name          text not null,
  email         text not null,
  practice_type text not null,
  country       text not null,
  submitted_at  timestamptz not null default now()
);

create index if not exists doctor_waitlist_submitted_idx on public.doctor_waitlist(submitted_at desc);
create index if not exists doctor_waitlist_email_idx     on public.doctor_waitlist(email);
