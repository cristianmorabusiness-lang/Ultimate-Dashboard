-- Health Mentor — Supabase schema
-- Run in: Supabase Dashboard > SQL Editor > New query
-- ============================================================

create extension if not exists "uuid-ossp";

-- ============================================================
-- USER PROFILE
-- ============================================================
create table if not exists user_profile (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  height_cm     numeric(5,1) not null,
  birth_date    date not null,
  sex           text not null check (sex in ('male', 'female', 'other')),
  goal_phase    text check (goal_phase in ('cut', 'bulk', 'lean_bulk', 'maintenance')),
  tdee_kcal     integer,
  protein_g     integer,
  carbs_g       integer,
  fat_g         integer,
  wake_time     time,
  workout_start time,
  workout_end   time,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  unique (user_id)
);

alter table user_profile enable row level security;
create policy "owner_only" on user_profile for all using (auth.uid() = user_id);

-- ============================================================
-- WEIGHT LOG
-- ============================================================
create table if not exists weight_log (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  logged_date   date not null,
  weight_kg     numeric(5,2) not null,
  body_fat_pct  numeric(4,1),
  note          text,
  created_at    timestamptz default now(),
  unique (user_id, logged_date)
);

create index if not exists idx_weight_log_user_date on weight_log (user_id, logged_date desc);
alter table weight_log enable row level security;
create policy "owner_only" on weight_log for all using (auth.uid() = user_id);

-- ============================================================
-- PHASE HISTORY
-- ============================================================
create table if not exists phase_history (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  phase           text not null check (phase in ('cut', 'bulk', 'lean_bulk', 'maintenance')),
  detected_at     date not null,
  confidence      numeric(4,3) check (confidence between 0 and 1),
  detection_v     integer not null default 2,
  caloric_delta   integer,
  weight_trend    numeric(4,2),
  source          text default 'auto' check (source in ('auto', 'manual')),
  created_at      timestamptz default now()
);

create index if not exists idx_phase_history_user_date on phase_history (user_id, detected_at desc);
alter table phase_history enable row level security;
create policy "owner_only" on phase_history for all using (auth.uid() = user_id);

-- ============================================================
-- MEALS
-- ============================================================
create table if not exists meals (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  logged_date   date not null,
  meal_name     text not null default 'Meal',
  meal_order    smallint default 1,
  notes         text,
  created_at    timestamptz default now()
);

create index if not exists idx_meals_user_date on meals (user_id, logged_date desc);
alter table meals enable row level security;
create policy "owner_only" on meals for all using (auth.uid() = user_id);

-- ============================================================
-- MEAL ITEMS
-- ============================================================
create table if not exists meal_items (
  id              uuid primary key default uuid_generate_v4(),
  meal_id         uuid not null references meals(id) on delete cascade,
  food_name       text not null,
  off_product_id  text,
  quantity_g      numeric(7,2) not null,
  kcal            numeric(7,1) not null,
  protein_g       numeric(6,2) not null,
  carbs_g         numeric(6,2) not null,
  fat_g           numeric(6,2) not null,
  fiber_g         numeric(6,2),
  created_at      timestamptz default now()
);

create index if not exists idx_meal_items_meal on meal_items (meal_id);
alter table meal_items enable row level security;
create policy "owner_only" on meal_items for all using (
  meal_id in (select id from meals where user_id = auth.uid())
);

-- ============================================================
-- WORKOUTS
-- ============================================================
create table if not exists workouts (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  logged_date     date not null,
  workout_type    text not null,
  title           text,
  duration_min    integer,
  notes           text,
  created_at      timestamptz default now()
);

create index if not exists idx_workouts_user_date on workouts (user_id, logged_date desc);
alter table workouts enable row level security;
create policy "owner_only" on workouts for all using (auth.uid() = user_id);

-- ============================================================
-- WORKOUT SETS
-- ============================================================
create table if not exists workout_sets (
  id              uuid primary key default uuid_generate_v4(),
  workout_id      uuid not null references workouts(id) on delete cascade,
  exercise_name   text not null,
  set_number      smallint not null,
  reps            smallint,
  weight_kg       numeric(5,2),
  duration_sec    integer,
  rpe             smallint check (rpe between 1 and 10),
  created_at      timestamptz default now()
);

create index if not exists idx_workout_sets_workout on workout_sets (workout_id);
alter table workout_sets enable row level security;
create policy "owner_only" on workout_sets for all using (
  workout_id in (select id from workouts where user_id = auth.uid())
);

-- ============================================================
-- WHOOP DAILY
-- ============================================================
create table if not exists whoop_daily (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  cycle_date          date not null,
  cycle_id            bigint not null,
  recovery_score      smallint,
  hrv_rmssd_ms        numeric(6,2),
  resting_hr_bpm      smallint,
  sleep_performance   smallint,
  sleep_duration_min  integer,
  sleep_disturbances  smallint,
  day_strain          numeric(5,2),
  energy_burnt_kcal   integer,
  raw_json            jsonb,
  synced_at           timestamptz default now(),
  unique (user_id, cycle_id)
);

create index if not exists idx_whoop_daily_user_date on whoop_daily (user_id, cycle_date desc);
alter table whoop_daily enable row level security;
create policy "owner_only" on whoop_daily for all using (auth.uid() = user_id);

-- ============================================================
-- AI SUMMARIES
-- ============================================================
create table if not exists ai_summaries (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  summary_date    date not null,
  summary_type    text not null check (summary_type in ('daily', 'weekly')),
  model_used      text not null,
  prompt_tokens   integer,
  output_tokens   integer,
  content         text not null,
  created_at      timestamptz default now(),
  unique (user_id, summary_date, summary_type)
);

create index if not exists idx_ai_summaries_user_date on ai_summaries (user_id, summary_date desc);
alter table ai_summaries enable row level security;
create policy "owner_only" on ai_summaries for all using (auth.uid() = user_id);

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
-- ============================================================
create table if not exists task_log (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  def_id      uuid references task_defs(id) on delete cascade,
  logged_date date not null,
  title       text not null,
  done        boolean not null default false,
  skipped     boolean not null default false,
  done_at     timestamptz,
  sort_order  integer not null default 0,
  created_at  timestamptz default now()
);

create index if not exists idx_task_log_user_date on task_log (user_id, logged_date desc);
create unique index if not exists uq_task_log_def_date
  on task_log (user_id, def_id, logged_date)
  where def_id is not null;
alter table task_log enable row level security;
create policy "owner_only" on task_log for all using (auth.uid() = user_id);

-- ============================================================
-- Verify setup
-- ============================================================
-- Run this to confirm: select tablename from pg_tables where schemaname = 'public' order by tablename;
-- Expected: 8 tables
