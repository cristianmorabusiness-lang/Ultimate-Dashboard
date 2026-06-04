-- Migration: daily tasks (recurring checklist + per-day completion).
-- Adds two tables so the user can define recurring tasks (e.g. "Gym") that
-- appear every day, tick them off (tracked per day for the progress ring), and
-- add one-off tasks for a single day. This data is also surfaced to the AI coach.
--
-- Run in: Supabase Dashboard > SQL Editor > New query
-- ============================================================

create extension if not exists "uuid-ossp";

-- ============================================================
-- TASK DEFINITIONS (recurring checklist items)
-- ============================================================
create table if not exists task_defs (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  sort_order  integer not null default 0,
  active      boolean not null default true,
  created_at  timestamptz default now()
);

create index if not exists idx_task_defs_user on task_defs (user_id, active, sort_order);
alter table task_defs enable row level security;
create policy "owner_only" on task_defs for all using (auth.uid() = user_id);

-- ============================================================
-- TASK LOG (per-day completion records + one-off tasks)
--   - def_id NOT NULL  -> completion record for a recurring task on that date
--   - def_id NULL      -> a one-off task that exists only on that date
-- ============================================================
create table if not exists task_log (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  def_id      uuid references task_defs(id) on delete cascade,
  logged_date date not null,
  title       text not null,
  done        boolean not null default false,
  done_at     timestamptz,
  sort_order  integer not null default 0,
  created_at  timestamptz default now()
);

create index if not exists idx_task_log_user_date on task_log (user_id, logged_date desc);
-- One completion row per recurring task per day (enables upsert on toggle).
-- One-off tasks (def_id null) are excluded from this constraint.
create unique index if not exists uq_task_log_def_date
  on task_log (user_id, def_id, logged_date)
  where def_id is not null;

alter table task_log enable row level security;
create policy "owner_only" on task_log for all using (auth.uid() = user_id);
