-- ============================================
-- Enable necessary extensions
-- ============================================

create extension if not exists "pgcrypto";
create extension if not exists "vector";

-- ============================================
-- PRIVATE DOCUMENTS TABLE
-- ============================================

create table if not exists public.documents_private (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  file_name text not null,
  file_url text not null,
  title text,
  description text,
  tags text[],
  document_date date,
  source text,
  folder text,
  metadata jsonb,
  ai_summary text,
  ai_key_sections jsonb,
  ai_citations jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- ============================================
-- PUBLIC DOCUMENTS TABLE
-- ============================================

create table if not exists public.documents_public (
  id uuid primary key default gen_random_uuid(),
  uploader_user_id uuid references auth.users(id) on delete cascade,
  file_name text not null,
  file_url text not null,
  title text,
  description text,
  tags text[],
  document_date date,
  source text,
  category text check (category in (
    'Supreme Court Cases',
    'Legislation',
    'Government Gazettes',
    'Regulations',
    'Case Law',
    'Constitutional Documents',
    'Other'
  )),
  metadata jsonb,
  ai_summary text,
  ai_key_sections jsonb,
  ai_citations jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- ============================================
-- Enable Row Level Security (RLS)
-- ============================================

alter table public.documents_private enable row level security;
alter table public.documents_public enable row level security;

-- ============================================
-- PRIVATE DOCUMENTS POLICIES
-- ============================================

create policy "Users can view their own private documents"
on public.documents_private
for select
using (auth.uid() = user_id);

create policy "Users can insert their own private documents"
on public.documents_private
for insert
with check (auth.uid() = user_id);

create policy "Users can update their own private documents"
on public.documents_private
for update
using (auth.uid() = user_id);

create policy "Users can delete their own private documents"
on public.documents_private
for delete
using (auth.uid() = user_id);

-- ============================================
-- PUBLIC DOCUMENTS POLICIES
-- ============================================

create policy "Anyone can read public documents"
on public.documents_public
for select
using (true);

create policy "Users can insert public documents"
on public.documents_public
for insert
with check (auth.uid() = uploader_user_id);

create policy "Uploader can update their own public documents"
on public.documents_public
for update
using (auth.uid() = uploader_user_id);

create policy "Uploader can delete their own public documents"
on public.documents_public
for delete
using (auth.uid() = uploader_user_id);

-- ============================================
-- STORAGE RLS POLICIES: PRIVATE-FILES BUCKET
-- ============================================

-- Allow authenticated users to upload their private files
create policy "Allow users to upload to private-files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'private-files'
  and auth.uid()::text = split_part(name, '/', 1)
);

-- Allow authenticated users to read their own private files
create policy "Allow users to read their private-files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'private-files'
  and auth.uid()::text = split_part(name, '/', 1)
);

-- Allow authenticated users to update their own private files
create policy "Allow users to update their private-files"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'private-files'
  and auth.uid()::text = split_part(name, '/', 1)
);

-- Allow authenticated users to delete their own private files
create policy "Allow users to delete their private-files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'private-files'
  and auth.uid()::text = split_part(name, '/', 1)
);

-- ============================================
-- STORAGE RLS POLICIES: PUBLIC-FILES BUCKET
-- ============================================

-- Allow authenticated users to upload to public-files
create policy "Allow users to upload to public-files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'public-files'
);

-- Allow anyone to read public files
create policy "Allow anyone to read public-files"
on storage.objects
for select
using (
  bucket_id = 'public-files'
);

-- Allow authenticated users to update their own public files
create policy "Allow users to update their public-files"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'public-files'
  and auth.uid()::text = split_part(name, '/', 1)
);

-- Allow authenticated users to delete their own public files
create policy "Allow users to delete their public-files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'public-files'
  and auth.uid()::text = split_part(name, '/', 1)
);

-- ============================================
-- SERVICE ROLE POLICY: PRIVATE DOCUMENTS
-- ============================================

create policy "Service role can update any private document"
on public.documents_private
for update
using (auth.role() = 'service_role');

-- Optional: allow insert by service role too
create policy "Service role can insert private documents"
on public.documents_private
for insert
with check (auth.role() = 'service_role');

-- ============================================
-- SERVICE ROLE POLICY: PUBLIC DOCUMENTS
-- ============================================

create policy "Service role can update any public document"
on public.documents_public
for update
using (auth.role() = 'service_role');

-- Optional: allow insert by service role too
create policy "Service role can insert public documents"
on public.documents_public
for insert
with check (auth.role() = 'service_role');