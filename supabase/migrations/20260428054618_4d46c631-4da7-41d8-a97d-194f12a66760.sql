-- Dedupe any existing rows
DELETE FROM public.user_module_access a
USING public.user_module_access b
WHERE a.ctid < b.ctid
  AND a.user_id = b.user_id
  AND a.module = b.module;

CREATE UNIQUE INDEX IF NOT EXISTS user_module_access_user_module_unique
  ON public.user_module_access (user_id, module);
