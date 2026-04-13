-- ============================================================
-- PresupAI — Database Schema for Supabase
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Enable pgvector extension (for RAG embeddings)
create extension if not exists vector;

-- ─── Profiles ─────────────────────────────────────────────
create table public.profiles (
  id            uuid references auth.users on delete cascade primary key,
  email         text not null unique,
  full_name     text,
  avatar_url    text,
  role          text not null default 'viewer'
                check (role in ('super_admin', 'admin', 'analyst', 'viewer')),
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  allowed_record record;
begin
  -- Check if email is in allowed list
  select * into allowed_record
  from public.allowed_emails
  where email = new.email
  limit 1;

  -- Only create profile if email is allowed
  if allowed_record.email is not null then
    insert into public.profiles (id, email, full_name, avatar_url, role)
    values (
      new.id,
      new.email,
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'avatar_url',
      coalesce(allowed_record.assigned_role, 'viewer')
    );

    -- Mark as accepted
    update public.allowed_emails
    set accepted_at = now()
    where email = new.email;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── Allowed Emails ───────────────────────────────────────
create table public.allowed_emails (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  assigned_role text not null default 'viewer'
                check (assigned_role in ('admin', 'analyst', 'viewer')),
  invited_by    uuid references public.profiles(id),
  accepted_at   timestamptz,
  created_at    timestamptz not null default now()
);

-- ─── Cost Centers ─────────────────────────────────────────
create table public.cost_centers (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  name        text not null,
  description text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Insert default CC231
insert into public.cost_centers (code, name)
values ('CC231', 'CRP Radios - Centro de Costo 231');

-- ─── File Uploads ──────────────────────────────────────────
create table public.file_uploads (
  id              uuid primary key default gen_random_uuid(),
  filename        text not null,
  storage_path    text not null,
  file_size       bigint,
  uploaded_by     uuid references public.profiles(id),
  cost_center_id  uuid references public.cost_centers(id),
  year            integer not null,
  file_type       text not null default 'master_annual'
                  check (file_type in ('master_annual', 'monthly_tracking')),
  status          text not null default 'pending'
                  check (status in ('pending', 'processing', 'completed', 'failed')),
  error_message   text,
  rows_processed  integer not null default 0,
  processed_at    timestamptz,
  created_at      timestamptz not null default now()
);

-- ─── Budget Lines ──────────────────────────────────────────
create table public.budget_lines (
  id              uuid primary key default gen_random_uuid(),
  upload_id       uuid references public.file_uploads(id),
  cost_center_id  uuid references public.cost_centers(id) not null,
  year            integer not null,
  line_number     integer,
  partida         text not null,
  description     text,
  responsible     text,
  ciudad_planta   text,
  category        char(1) not null default 'A' check (category in ('A', 'B')),
  budget_jan      numeric(15,2) not null default 0,
  budget_feb      numeric(15,2) not null default 0,
  budget_mar      numeric(15,2) not null default 0,
  budget_apr      numeric(15,2) not null default 0,
  budget_may      numeric(15,2) not null default 0,
  budget_jun      numeric(15,2) not null default 0,
  budget_jul      numeric(15,2) not null default 0,
  budget_aug      numeric(15,2) not null default 0,
  budget_sep      numeric(15,2) not null default 0,
  budget_oct      numeric(15,2) not null default 0,
  budget_nov      numeric(15,2) not null default 0,
  budget_dec      numeric(15,2) not null default 0,
  total_annual    numeric(15,2) not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (cost_center_id, year, partida)
);

-- ─── Monthly Executions ────────────────────────────────────
create table public.monthly_executions (
  id                    uuid primary key default gen_random_uuid(),
  budget_line_id        uuid references public.budget_lines(id) on delete cascade not null,
  cost_center_id        uuid references public.cost_centers(id) not null,
  upload_id             uuid references public.file_uploads(id),
  year                  integer not null,
  month                 integer not null check (month between 1 and 12),
  budgeted_amount       numeric(15,2) not null default 0,
  executed_amount       numeric(15,2),
  projected_amount      numeric(15,2),
  savings_amount        numeric(15,2) not null default 0,
  status                text not null default 'pending'
                        check (status in ('pending','executed','rescheduled','advance','savings','cancelled')),
  rescheduled_to_month  integer,
  rescheduled_from_month integer,
  rescheduled_year      integer,
  validated             boolean not null default false,
  validated_by          uuid references public.profiles(id),
  validated_at          timestamptz,
  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (budget_line_id, year, month)
);

-- ─── Knowledge Base ────────────────────────────────────────
create table public.kb_documents (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  content     text not null,
  embedding   vector(768),           -- Google Gemini gemini-embedding-001 (768 dims)
  category    text not null default 'faq'
              check (category in ('faq','process','definition','context','policy')),
  tags        text[] not null default '{}',
  is_active   boolean not null default true,
  version     integer not null default 1,
  created_by  uuid references public.profiles(id),
  updated_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Vector similarity search function
create or replace function public.search_kb_documents(
  query_embedding vector(768),
  match_threshold float default 0.65,
  match_count int default 5
)
returns table (
  id uuid, title text, content text, similarity float
)
language plpgsql as $$
begin
  return query
  select
    kb.id,
    kb.title,
    kb.content,
    1 - (kb.embedding <=> query_embedding) as similarity
  from public.kb_documents kb
  where kb.is_active = true
    and kb.embedding is not null
    and 1 - (kb.embedding <=> query_embedding) > match_threshold
  order by kb.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- Index for fast vector search
create index on public.kb_documents using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- ─── Chat Sessions ────────────────────────────────────────
create table public.chat_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id) on delete cascade not null,
  title       text not null default 'Nueva conversación',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.chat_messages (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid references public.chat_sessions(id) on delete cascade not null,
  role        text not null check (role in ('user', 'assistant', 'system')),
  content     text not null,
  tokens_used integer,
  metadata    jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

-- ─── Storage Buckets ──────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'excel-uploads',
  'excel-uploads',
  false,
  10485760,  -- 10MB
  array[
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ]
)
on conflict (id) do nothing;

-- ─── Row Level Security ───────────────────────────────────
alter table public.profiles enable row level security;
alter table public.allowed_emails enable row level security;
alter table public.cost_centers enable row level security;
alter table public.file_uploads enable row level security;
alter table public.budget_lines enable row level security;
alter table public.monthly_executions enable row level security;
alter table public.kb_documents enable row level security;
alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;

-- Functions to avoid infinite recursion when querying profiles inside its own policies
create or replace function public.get_auth_user_role()
returns text
language sql
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Profiles: users can see their own, admins can see all
create policy "Read own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Admin read all profiles" on public.profiles
  for select using (
    public.get_auth_user_role() in ('super_admin', 'admin')
  );

create policy "Admin update profiles" on public.profiles
  for update using (
    public.get_auth_user_role() = 'super_admin'
  );

-- Budget lines: authenticated users can read
create policy "Auth users read budget lines" on public.budget_lines
  for select using (auth.role() = 'authenticated');

create policy "Admins write budget lines" on public.budget_lines
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('super_admin','admin'))
  );

-- Monthly executions: same as budget lines
create policy "Auth users read executions" on public.monthly_executions
  for select using (auth.role() = 'authenticated');

create policy "Admins write executions" on public.monthly_executions
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('super_admin','admin'))
  );

-- KB: all authenticated users can read active docs
create policy "Auth users read active kb" on public.kb_documents
  for select using (auth.role() = 'authenticated' and is_active = true);

create policy "Admins manage kb" on public.kb_documents
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('super_admin','admin'))
  );

-- Chat sessions: users can only access their own
create policy "Users own chat sessions" on public.chat_sessions
  for all using (auth.uid() = user_id);

create policy "Users own chat messages" on public.chat_messages
  for all using (
    exists (select 1 from public.chat_sessions s where s.id = session_id and s.user_id = auth.uid())
  );

-- Allowed emails: only super_admin
create policy "Super admin manage allowed emails" on public.allowed_emails
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'super_admin')
  );

-- Cost centers: authenticated read
create policy "Auth users read cost centers" on public.cost_centers
  for select using (auth.role() = 'authenticated');

-- File uploads: authenticated read, admin write
create policy "Auth users read uploads" on public.file_uploads
  for select using (auth.role() = 'authenticated');

create policy "Admins manage uploads" on public.file_uploads
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('super_admin','admin'))
  );

-- Storage policies for excel-uploads bucket
create policy "Auth users read excel files" on storage.objects
  for select using (bucket_id = 'excel-uploads' and auth.role() = 'authenticated');

create policy "Admins upload excel files" on storage.objects
  for insert with check (
    bucket_id = 'excel-uploads' and
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('super_admin','admin'))
  );
