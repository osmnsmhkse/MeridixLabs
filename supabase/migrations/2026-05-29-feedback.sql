-- Feedback submitted via the in-app "How are we doing?" widget.
create table if not exists public.feedback (
  id          text primary key,
  rating      integer not null check (rating between 1 and 5),
  category    text,
  message     text,
  email       text,
  page        text,
  user_agent  text,
  received_at timestamptz not null default now()
);

create index if not exists feedback_received_idx on public.feedback(received_at desc);
create index if not exists feedback_rating_idx   on public.feedback(rating);

-- Service-role inserts/reads only (RLS denies anon by default once enabled).
alter table public.feedback enable row level security;
