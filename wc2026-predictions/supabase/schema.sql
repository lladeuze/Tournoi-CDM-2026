-- WC 2026 Predictions - Supabase schema
-- Run this file in Supabase SQL Editor.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  username text not null,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  home_team text not null,
  away_team text not null,
  kickoff_at timestamptz not null,
  home_score int,
  away_score int,
  first_scorer text,
  status text not null default 'scheduled' check (status in ('scheduled', 'live', 'finished')),
  created_at timestamptz not null default now()
);

create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  predicted_home_score int not null check (predicted_home_score >= 0),
  predicted_away_score int not null check (predicted_away_score >= 0),
  predicted_first_scorer text,
  points int not null default 0,
  exact_score boolean not null default false,
  correct_result boolean not null default false,
  first_scorer_correct boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, match_id)
);

alter table public.profiles enable row level security;
alter table public.matches enable row level security;
alter table public.predictions enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(select 1 from public.profiles where id = auth.uid() and is_admin = true);
$$;

-- Profiles policies
drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all" on public.profiles for select using (true);

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self" on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_self_or_admin" on public.profiles;
create policy "profiles_update_self_or_admin" on public.profiles for update using (auth.uid() = id or public.is_admin());

-- Matches policies
drop policy if exists "matches_select_all" on public.matches;
create policy "matches_select_all" on public.matches for select using (true);

drop policy if exists "matches_admin_all" on public.matches;
create policy "matches_admin_all" on public.matches for all using (public.is_admin()) with check (public.is_admin());

-- Predictions policies
drop policy if exists "predictions_select_own_or_admin" on public.predictions;
create policy "predictions_select_own_or_admin" on public.predictions for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists "predictions_insert_own_before_kickoff" on public.predictions;
create policy "predictions_insert_own_before_kickoff" on public.predictions for insert
with check (
  auth.uid() = user_id
  and exists(select 1 from public.matches m where m.id = match_id and m.kickoff_at > now())
);

drop policy if exists "predictions_update_own_before_kickoff_or_admin" on public.predictions;
create policy "predictions_update_own_before_kickoff_or_admin" on public.predictions for update
using (
  public.is_admin()
  or (
    auth.uid() = user_id
    and exists(select 1 from public.matches m where m.id = match_id and m.kickoff_at > now())
  )
)
with check (
  public.is_admin()
  or (
    auth.uid() = user_id
    and exists(select 1 from public.matches m where m.id = match_id and m.kickoff_at > now())
  )
);

create or replace function public.calculate_prediction_points(
  predicted_home int,
  predicted_away int,
  actual_home int,
  actual_away int,
  predicted_scorer text,
  actual_scorer text
)
returns table(points int, exact_score boolean, correct_result boolean, first_scorer_correct boolean)
language plpgsql
immutable
as $$
declare
  exact_ok boolean := false;
  result_ok boolean := false;
  scorer_ok boolean := false;
  total int := 0;
begin
  exact_ok := predicted_home = actual_home and predicted_away = actual_away;
  result_ok := sign(predicted_home - predicted_away) = sign(actual_home - actual_away);
  scorer_ok := predicted_scorer is not null and actual_scorer is not null and lower(trim(predicted_scorer)) = lower(trim(actual_scorer));

  if exact_ok then total := total + 6;
  elsif result_ok then total := total + 3;
  end if;
  if scorer_ok then total := total + 3; end if;
  if exact_ok and scorer_ok then total := total + 2; end if;

  return query select total, exact_ok, result_ok, scorer_ok;
end;
$$;

create or replace function public.recalculate_points_for_match(match_uuid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  update public.predictions p
  set
    points = c.points,
    exact_score = c.exact_score,
    correct_result = c.correct_result,
    first_scorer_correct = c.first_scorer_correct,
    updated_at = now()
  from public.matches m,
  lateral public.calculate_prediction_points(
    p.predicted_home_score,
    p.predicted_away_score,
    m.home_score,
    m.away_score,
    p.predicted_first_scorer,
    m.first_scorer
  ) c
  where p.match_id = m.id
    and m.id = match_uuid
    and m.home_score is not null
    and m.away_score is not null;
end;
$$;

create or replace view public.leaderboard as
select
  p.id as user_id,
  p.username,
  coalesce(sum(pr.points), 0)::int as total_points,
  coalesce(sum(case when pr.exact_score then 1 else 0 end), 0)::int as exact_scores,
  coalesce(sum(case when pr.correct_result then 1 else 0 end), 0)::int as correct_results,
  coalesce(sum(case when pr.first_scorer_correct then 1 else 0 end), 0)::int as first_scorers
from public.profiles p
left join public.predictions pr on pr.user_id = p.id
group by p.id, p.username
order by total_points desc;

-- Optional demo data. Uncomment to test quickly.
-- insert into public.matches (home_team, away_team, kickoff_at) values
-- ('Mexique', 'Afrique du Sud', '2026-06-11 21:00:00+00'),
-- ('Canada', 'Belgique', '2026-06-12 21:00:00+00');

-- After creating your own account, make yourself admin:
-- update public.profiles set is_admin = true where email = 'your-email@example.com';
