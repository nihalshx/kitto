-- Kitto v1 schema (PRD section 8).
-- RLS is enabled on every table with no public policies: the server uses the
-- service role, and logged-in admins (listed in admin_emails) get read access.

create extension if not exists pgcrypto;

create table visitors (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  first_page text,
  utm_source text,
  language text default 'en'
);

create table conversations (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid references visitors(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  mode text check (mode in ('muse','therapy','roast','team','general')),
  last_mood text,
  message_count int default 0,
  has_lead boolean default false
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  created_at timestamptz default now(),
  role text check (role in ('user','assistant')),
  content text not null,
  mood text,
  meta jsonb,
  input_tokens int,
  output_tokens int
);

create table leads (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id),
  created_at timestamptz default now(),
  name text not null,
  email text,
  phone text,
  business text,
  need text,
  budget_range text,
  ai_summary text,
  status text default 'new' check (status in ('new','contacted','won','lost')),
  consent boolean not null default false
);

create table feedback (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references messages(id) on delete cascade,
  created_at timestamptz default now(),
  rating smallint check (rating in (-1, 1)),
  comment text
);

-- Daily counters for rate limiting (PRD F14 / section 9).
-- key is 'v:<visitorId>' or 'ip:<sha256 of IP>'; raw IPs are never stored.
create table rate_limits (
  key text not null,
  day date not null default current_date,
  count int not null default 0,
  primary key (key, day)
);

-- Emails allowed into /admin (mirror of ADMIN_EMAILS).
create table admin_emails (
  email text primary key
);

create index conversations_visitor_idx on conversations (visitor_id);
create index conversations_created_idx on conversations (created_at desc);
create index messages_conversation_idx on messages (conversation_id, created_at);
create index leads_created_idx on leads (created_at desc);
create index feedback_message_idx on feedback (message_id);

alter table visitors enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table leads enable row level security;
alter table feedback enable row level security;
alter table rate_limits enable row level security;
alter table admin_emails enable row level security;

-- Admin access: a signed-in user whose JWT email is in admin_emails.
create or replace function is_kitto_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from admin_emails
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

create policy admin_read_visitors on visitors for select to authenticated using (is_kitto_admin());
create policy admin_read_conversations on conversations for select to authenticated using (is_kitto_admin());
create policy admin_read_messages on messages for select to authenticated using (is_kitto_admin());
create policy admin_read_leads on leads for select to authenticated using (is_kitto_admin());
create policy admin_update_leads on leads for update to authenticated using (is_kitto_admin()) with check (is_kitto_admin());
create policy admin_read_feedback on feedback for select to authenticated using (is_kitto_admin());

-- Atomically bump a daily counter and return the new value.
create or replace function increment_rate_limit(p_key text) returns int
language sql volatile set search_path = public as $$
  insert into rate_limits (key, day, count) values (p_key, current_date, 1)
  on conflict (key, day) do update set count = rate_limits.count + 1
  returning count;
$$;
revoke all on function increment_rate_limit(text) from public, anon, authenticated;

-- Retention (PRD section 9): delete conversations without leads after 90 days,
-- and rate-limit rows after 2 days. Schedule with pg_cron once enabled:
--   select cron.schedule('kitto-retention', '17 3 * * *', 'select kitto_purge_old_data()');
create or replace function kitto_purge_old_data() returns void
language sql volatile set search_path = public as $$
  delete from conversations where has_lead = false and updated_at < now() - interval '90 days';
  delete from rate_limits where day < current_date - 2;
$$;
revoke all on function kitto_purge_old_data() from public, anon, authenticated;
