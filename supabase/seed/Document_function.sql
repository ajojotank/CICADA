create or replace function match_documents(
  query_embedding      vector(2000),
  match_count          int,
  similarity_threshold float,
  table_name           text,
  current_user_id      uuid default null
)
returns table (
  document_id uuid,
  document    jsonb,   -- full row from documents_* as JSONB
  similarity  float
)
language plpgsql
as $$
declare
  vector_sql text;
  doc_table  text;
begin
  -- ------------------------------------------------------------------
  -- 0. sanity-check
  -- ------------------------------------------------------------------
  if table_name not in ('private_vectors', 'public_vectors') then
    raise exception 'Invalid table name %', table_name;
  end if;

  -- companion documents table
  doc_table := case
                 when table_name = 'private_vectors' then 'documents_private'
                 else 'documents_public'
               end;

  -- ------------------------------------------------------------------
  -- 1. build dynamic SQL
  -- ------------------------------------------------------------------
  /*  Plan:
      1) DISTINCT ON (v.document_id) picks only the best-matching chunk
         for every document.  Ordering inside DISTINCT determines which
         chunk is kept (similarity DESC).
      2) Wrap that in an outer query so we can order the   *documents*
         globally by their similarity and apply LIMIT match_count.
  */
  vector_sql := format($f$
    select  *
    from (
      select distinct on (v.document_id)
             v.document_id,
             to_jsonb(d)                as document,
             1 - (v.embedding <#> $1)   as similarity
      from   public.%I v
      join   public.%I d on d.id = v.document_id
      where  (1 - (v.embedding <#> $1)) > $2
            %s                           -- user filter for private table
      order  by v.document_id, similarity desc    -- keep best chunk
    ) ranked
    order by similarity desc                      -- global ranking
    limit  $3
  $f$,
    table_name,
    doc_table,
    case
      when table_name = 'private_vectors'
        then 'and v.user_id = $4'
      else ''
    end
  );

  -- ------------------------------------------------------------------
  -- 2. execute
  -- ------------------------------------------------------------------
  if table_name = 'private_vectors' then
    return query execute vector_sql
      using query_embedding, similarity_threshold, match_count, current_user_id;
  else
    return query execute vector_sql
      using query_embedding, similarity_threshold, match_count;
  end if;
end;
$$;