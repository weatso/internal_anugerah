CREATE TABLE IF NOT EXISTS public.internal_billings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_entity_id uuid REFERENCES public.entities(id),
  to_entity_id uuid REFERENCES public.entities(id),
  amount numeric NOT NULL CHECK (amount > 0),
  description text NOT NULL,
  status approval_status DEFAULT 'PENDING_APPROVAL',
  created_by uuid REFERENCES public.profiles(id),
  approved_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.internal_billings DISABLE ROW LEVEL SECURITY;

-- Tambahkan akun Hutang Afiliasi untuk menampung kredit dari expense divisi
INSERT INTO chart_of_accounts (account_class, account_code, account_name) 
VALUES ('LIABILITY', '2-9000', 'Utang Afiliasi / Holding')
ON CONFLICT DO NOTHING;
