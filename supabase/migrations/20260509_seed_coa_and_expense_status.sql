-- =====================================================================
-- ANUGERAH OS 4.0 — MIGRASI: Data Master COA & Kolom Status Expense
-- Jalankan di Supabase SQL Editor
-- =====================================================================

-- ─────────────────────────────────────────────────────────────────────
-- 1. TAMBAH KOLOM STATUS PADA TABEL EXPENSES (untuk VOID tracking)
-- ─────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'expenses' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.expenses
      ADD COLUMN status text DEFAULT 'ACTIVE'
      CHECK (status IN ('ACTIVE', 'VOID'));
    RAISE NOTICE 'Kolom expenses.status berhasil ditambahkan.';
  ELSE
    RAISE NOTICE 'Kolom expenses.status sudah ada, dilewati.';
  END IF;
END
$$;

-- ─────────────────────────────────────────────────────────────────────
-- 2. SEEDING: Chart of Accounts (COA) Default
--    Hanya insert jika kode belum ada (idempotent)
-- ─────────────────────────────────────────────────────────────────────

-- ═══ ASET (Kas & Bank) ═══
INSERT INTO public.chart_of_accounts (account_class, account_code, account_name, is_bank)
VALUES
  ('ASSET', '1-1000', 'Kas Besar (Holding)',        false),
  ('ASSET', '1-1010', 'Bank BCA (Holding)',          true),
  ('ASSET', '1-1020', 'Bank Mandiri (Holding)',      true),
  ('ASSET', '1-1030', 'Bank BCA (Weatso)',           true),
  ('ASSET', '1-1040', 'Bank BCA (Evory)',            true),
  ('ASSET', '1-2000', 'Piutang Usaha',               false)
ON CONFLICT (account_code) DO NOTHING;

-- ═══ LIABILITAS ═══
INSERT INTO public.chart_of_accounts (account_class, account_code, account_name, is_bank)
VALUES
  ('LIABILITY', '2-1000', 'Deferred Revenue (Pendapatan Ditangguhkan)', false),
  ('LIABILITY', '2-2000', 'Hutang Usaha',             false),
  ('LIABILITY', '2-3000', 'Hutang Pajak PPN',         false),
  ('LIABILITY', '2-4000', 'Hutang Komisi',            false)
ON CONFLICT (account_code) DO NOTHING;

-- ═══ EKUITAS ═══
INSERT INTO public.chart_of_accounts (account_class, account_code, account_name, is_bank)
VALUES
  ('EQUITY', '3-1000', 'Modal Disetor',              false),
  ('EQUITY', '3-2000', 'Laba Ditahan',               false),
  ('EQUITY', '3-3000', 'Dividen yang Didistribusikan', false)
ON CONFLICT (account_code) DO NOTHING;

-- ═══ PENDAPATAN (Revenue) ═══
INSERT INTO public.chart_of_accounts (account_class, account_code, account_name, is_bank)
VALUES
  ('REVENUE', '4-1000', 'Pendapatan Jasa (Service Revenue)',  false),
  ('REVENUE', '4-2000', 'Pendapatan Proyek',                   false),
  ('REVENUE', '4-3000', 'Pendapatan Transfer Pricing',         false),
  ('REVENUE', '4-4000', 'Pendapatan Lain-lain',                false)
ON CONFLICT (account_code) DO NOTHING;

-- ═══ HARGA POKOK (COGS) ═══
INSERT INTO public.chart_of_accounts (account_class, account_code, account_name, is_bank)
VALUES
  ('COGS', '5-1000', 'Biaya Vendor Proyek',          false),
  ('COGS', '5-2000', 'Biaya Produksi Langsung',      false)
ON CONFLICT (account_code) DO NOTHING;

-- ═══ BEBAN OPERASIONAL (Expense) ═══
INSERT INTO public.chart_of_accounts (account_class, account_code, account_name, is_bank)
VALUES
  ('EXPENSE', '6-1000', 'Biaya Operasional Umum',    false),
  ('EXPENSE', '6-1010', 'Gaji & Upah Staf',          false),
  ('EXPENSE', '6-1020', 'Biaya Sewa Kantor',         false),
  ('EXPENSE', '6-1030', 'Biaya Utilitas (Listrik, Internet)', false),
  ('EXPENSE', '6-1040', 'Biaya Transportasi',        false),
  ('EXPENSE', '6-1050', 'Biaya Marketing & Iklan',   false),
  ('EXPENSE', '6-1060', 'Biaya Langganan Software',  false),
  ('EXPENSE', '6-1070', 'Biaya Entertaiment & Meeting', false),
  ('EXPENSE', '6-2000', 'Biaya Komisi Sales',        false),
  ('EXPENSE', '6-9000', 'Biaya Lain-lain',           false)
ON CONFLICT (account_code) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────
-- 3. VERIFIKASI: Tampilkan semua akun yang berhasil di-seed
-- ─────────────────────────────────────────────────────────────────────
SELECT account_code, account_class, account_name, is_bank, is_active
FROM public.chart_of_accounts
ORDER BY account_code ASC;
