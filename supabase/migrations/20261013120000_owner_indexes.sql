-- Cover owner foreign keys used by owner-scoped reads and account cleanup cascades.
CREATE INDEX IF NOT EXISTS reflections_owner_idx ON public.reflections(owner_id);
CREATE INDEX IF NOT EXISTS reflection_jobs_owner_idx ON private.reflection_jobs(owner_id);
