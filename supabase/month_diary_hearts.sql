create table if not exists public.month_diary_hearts (
  diary_id bigint not null
    references public.month_diaries(id) on delete cascade,
  voter_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (diary_id, voter_id)
);

alter table public.month_diary_hearts enable row level security;
revoke all on public.month_diary_hearts from anon, authenticated;

create or replace function public.get_month_diary_heart_state(
  p_diary_id bigint,
  p_voter_id uuid
)
returns table (heart_count bigint, has_hearted boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_diary_id is null or p_voter_id is null then
    raise exception 'Diary and voter IDs are required.'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.month_diaries
    where id = p_diary_id
      and is_published = true
  ) then
    raise exception 'Published diary not found.'
      using errcode = 'P0002';
  end if;

  return query
  select
    count(*)::bigint,
    coalesce(bool_or(h.voter_id = p_voter_id), false)
  from public.month_diary_hearts as h
  where h.diary_id = p_diary_id;
end;
$$;

create or replace function public.toggle_month_diary_heart(
  p_diary_id bigint,
  p_voter_id uuid
)
returns table (heart_count bigint, has_hearted boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  rows_removed integer;
begin
  if p_diary_id is null or p_voter_id is null then
    raise exception 'Diary and voter IDs are required.'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.month_diaries
    where id = p_diary_id
      and is_published = true
  ) then
    raise exception 'Published diary not found.'
      using errcode = 'P0002';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_diary_id::text || ':' || p_voter_id::text,
      0
    )
  );

  delete from public.month_diary_hearts as h
  where h.diary_id = p_diary_id
    and h.voter_id = p_voter_id;
  get diagnostics rows_removed = row_count;

  if rows_removed = 0 then
    insert into public.month_diary_hearts (diary_id, voter_id)
    values (p_diary_id, p_voter_id);
  end if;

  return query
  select
    count(*)::bigint,
    coalesce(bool_or(h.voter_id = p_voter_id), false)
  from public.month_diary_hearts as h
  where h.diary_id = p_diary_id;
end;
$$;

revoke all on function public.get_month_diary_heart_state(bigint, uuid)
  from public;
revoke all on function public.toggle_month_diary_heart(bigint, uuid)
  from public;
grant execute on function public.get_month_diary_heart_state(bigint, uuid)
  to anon, authenticated;
grant execute on function public.toggle_month_diary_heart(bigint, uuid)
  to anon, authenticated;
