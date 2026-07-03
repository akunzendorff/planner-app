-- Fix migration for existing databases
-- Run this in Supabase Dashboard → SQL Editor
-- Safer version: handles both text and jsonb column types

DO $$
DECLARE
  recurrence_type text;
BEGIN
  SELECT data_type
  INTO recurrence_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'finance_transactions'
    AND column_name = 'recurrence';

  IF recurrence_type = 'text' THEN
    ALTER TABLE public.finance_transactions
      ALTER COLUMN recurrence DROP DEFAULT;

    ALTER TABLE public.finance_transactions
      DROP CONSTRAINT IF EXISTS finance_transactions_recurrence_check;

    ALTER TABLE public.finance_transactions
      ALTER COLUMN recurrence TYPE JSONB
      USING CASE
        WHEN recurrence IS NULL OR recurrence = '' OR recurrence = 'none' THEN 'null'::jsonb
        WHEN recurrence = 'monthly' THEN '{"type":"monthly"}'::jsonb
        WHEN recurrence = 'installment' THEN '{"type":"installment"}'::jsonb
        WHEN recurrence LIKE '{%' THEN recurrence::jsonb
        ELSE to_jsonb(recurrence)
      END;

    ALTER TABLE public.finance_transactions
      ALTER COLUMN recurrence SET DEFAULT 'null'::jsonb;
  ELSIF recurrence_type = 'jsonb' THEN
    ALTER TABLE public.finance_transactions
      ALTER COLUMN recurrence SET DEFAULT 'null'::jsonb;
  END IF;
END $$;

ALTER TABLE public.exchange_transactions
  ADD COLUMN IF NOT EXISTS recurrence JSONB DEFAULT 'null'::jsonb;

ALTER TABLE public.exchange_transactions
  DROP CONSTRAINT IF EXISTS exchange_transactions_type_check;

ALTER TABLE public.exchange_transactions
  ADD CONSTRAINT exchange_transactions_type_check
  CHECK (type IN ('entrada', 'saida', 'diario'));
