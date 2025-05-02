-- =============================================
-- Enable required PostgreSQL extensions
-- =============================================
create extension if not exists vector;

-- =============================================
-- PRIVATE VECTORS TABLE
-- =============================================
create table if not exists public.private_vectors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  document_id uuid references public.documents_private(id) on delete cascade,
  content text not null,
  embedding vector(2000) not null,
  metadata jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable Row-Level Security
alter table public.private_vectors enable row level security;

-- RLS Policies for private_vectors
create policy "Users can view their own private vectors"
on public.private_vectors
for select
using (auth.uid() = user_id);

create policy "Users can insert their own private vectors"
on public.private_vectors
for insert
with check (auth.uid() = user_id);

create policy "Users can update their own private vectors"
on public.private_vectors
for update
using (auth.uid() = user_id);

create policy "Users can delete their own private vectors"
on public.private_vectors
for delete
using (auth.uid() = user_id);

-- =============================================
-- PUBLIC VECTORS TABLE
-- =============================================
create table if not exists public.public_vectors (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references public.documents_public(id) on delete cascade,
  content text not null,
  embedding vector(2000) not null,
  metadata jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable Row-Level Security
alter table public.public_vectors enable row level security;

-- RLS Policies for public_vectors
create policy "Anyone can read public vectors"
on public.public_vectors
for select
using (true);

create policy "Allow insert into public vectors"
on public.public_vectors
for insert
with check (true);

create policy "Restrict updating public vectors"
on public.public_vectors
for update
using (false);

create policy "Restrict deleting public vectors"
on public.public_vectors
for delete
using (false);

-- =============================================
-- VECTOR INDEXES FOR FAST SIMILARITY SEARCH
-- =============================================

-- Private vectors: HNSW index on 2000-dim embeddings
create index if not exists private_vectors_embedding_idx
on public.private_vectors
using hnsw (embedding vector_l2_ops)
with (m = 16, ef_construction = 200);

-- Public vectors: HNSW index on 2000-dim embeddings
create index if not exists public_vectors_embedding_idx
on public.public_vectors
using hnsw (embedding vector_l2_ops)
with (m = 16, ef_construction = 200);

-- Run ANALYZE to optimize planner statistics
analyze public.private_vectors;
analyze public.public_vectors;

-- =============================================
-- SERVICE ROLE POLICY: PRIVATE VECTORS
-- =============================================

create policy "Service role can insert private vectors"
on public.private_vectors
for insert
with check (auth.role() = 'service_role');

-- Optional: allow service role to read vectors (for debugging or sync jobs)
create policy "Service role can view private vectors"
on public.private_vectors
for select
using (auth.role() = 'service_role');

-- =============================================
-- SERVICE ROLE POLICY: PUBLIC VECTORS
-- =============================================

create policy "Service role can insert public vectors"
on public.public_vectors
for insert
with check (auth.role() = 'service_role');

-- Optional: allow service role to read public vectors
create policy "Service role can view public vectors"
on public.public_vectors
for select
using (auth.role() = 'service_role');