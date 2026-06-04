-- Migration: rest-day support for daily tasks.
-- Adds a `skipped` flag to task_log so a recurring task (e.g. "Palestra") can be
-- marked as a planned REST day on a given date: it then counts neither as done
-- nor as missed, is excluded from the progress ring, and the AI sees it as a
-- programmed rest instead of a skipped workout.
--
-- Run in: Supabase Dashboard > SQL Editor > New query
-- Safe & reversible: nullable-default column, no data touched.
-- ============================================================

alter table task_log add column if not exists skipped boolean not null default false;
