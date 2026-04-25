ALTER TABLE public.internal_billings ADD COLUMN revenue_account_id uuid REFERENCES public.chart_of_accounts(id);

INSERT INTO public.chart_of_accounts (account_class, account_code, account_name) 
VALUES 
('ASSET', '1-9000', 'Piutang Afiliasi'),
('REVENUE', '4-9010', 'Pendapatan Afiliasi')
ON CONFLICT DO NOTHING;
