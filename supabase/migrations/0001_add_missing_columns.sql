-- Migration: add columns the app code reads/writes but that were never added to the DB.
-- Symptom fixed: AI coach (and other reads) saw no workouts/meals/profile because
-- selecting a non-existent column makes PostgREST return error 42703, which the code
-- silently turns into an empty result via `?? []`.
--
-- Run in: Supabase Dashboard > SQL Editor > New query
-- Safe & reversible: all columns are nullable, no data is touched.
-- ============================================================

alter table workouts     add column if not exists notes         text;
alter table meals        add column if not exists notes         text;
alter table user_profile add column if not exists wake_time     time;
alter table user_profile add column if not exists workout_start time;
alter table user_profile add column if not exists workout_end   time;
