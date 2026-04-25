-- ==============================================================================
-- FASE 1: RESET SKEMA SEBELUMNYA (Agar tidak ada konflik)
-- ==============================================================================
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.internal_billings CASCADE;
DROP TABLE IF EXISTS public.division_financial_settings CASCADE;
DROP TABLE IF EXISTS public.bank_accounts CASCADE;
DROP TABLE IF EXISTS public.transaction_categories CASCADE;
DROP TABLE IF EXISTS public.dividend_distributions CASCADE;
DROP TABLE IF EXISTS public.stakeholders CASCADE;
DROP TABLE IF EXISTS public.journal_lines CASCADE;
DROP TABLE IF EXISTS public.journal_entries CASCADE;

DROP TYPE IF EXISTS public.account_class CASCADE;
DROP TYPE IF EXISTS public.approval_status CASCADE;

-- ==============================================================================
-- FASE 2: FONDASI DOUBLE ENTRY (LEDGER RIGID)
-- ==============================================================================
-- Tipe Akun Standar Akuntansi
CREATE TYPE account_class AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'COGS', 'EXPENSE');
CREATE TYPE approval_status AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'REJECTED');

-- 1. Tabel Chart of Accounts (Menggabungkan Bank & Kategori)
CREATE TABLE chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_class account_class NOT NULL,
  account_code TEXT UNIQUE NOT NULL, -- Contoh: '1-1000' (Dibuat otomatis oleh Backend)
  account_name TEXT NOT NULL,
  is_bank BOOLEAN DEFAULT FALSE, -- TRUE jika ini adalah Rekening Bank (BCA, Mandiri) untuk UI Frontend
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Pengaturan Limit Finansial Divisi (Tetap Dipertahankan)
CREATE TABLE division_financial_settings (
  entity_id UUID PRIMARY KEY REFERENCES entities(id) ON DELETE CASCADE,
  monthly_auto_approve_limit NUMERIC NOT NULL DEFAULT 5000000,
  current_month_usage NUMERIC NOT NULL DEFAULT 0,
  last_reset_month DATE NOT NULL DEFAULT CURRENT_DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- FASE 3: MESIN JURNAL (TRANSAKSI)
-- ==============================================================================
-- 3. Header Jurnal (Menyimpan Metadata Transaksi)
CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference_number TEXT UNIQUE NOT NULL, -- Contoh: JRN-202310-0001 (Dibuat otomatis)
  description TEXT NOT NULL,
  entity_id UUID REFERENCES entities(id) ON DELETE RESTRICT, -- Milik divisi mana
  proof_storage_key TEXT, -- Bukti transfer/struk
  status approval_status DEFAULT 'PENDING_APPROVAL',
  created_by UUID REFERENCES profiles(id),
  approved_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Baris Jurnal (Debit / Kredit) - Core of Double Entry
CREATE TABLE journal_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id UUID REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id UUID REFERENCES chart_of_accounts(id) ON DELETE RESTRICT,
  debit NUMERIC NOT NULL DEFAULT 0,
  credit NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT journal_lines_check CHECK ((debit > 0 AND credit = 0) OR (debit = 0 AND credit > 0))
);

-- ==============================================================================
-- FASE 4: STAKEHOLDERS & PROFIT SPLITTING (FITUR BARU)
-- ==============================================================================
-- 5. Tabel Kepemilikan & Investor
CREATE TABLE stakeholders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('OWNER', 'INVESTOR')),
  equity_percentage NUMERIC NOT NULL DEFAULT 0 CHECK (equity_percentage >= 0 AND equity_percentage <= 100),
  profit_split_percentage NUMERIC NOT NULL DEFAULT 0 CHECK (profit_split_percentage >= 0 AND profit_split_percentage <= 100),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Riwayat Pembagian Dividen / Profit Split
CREATE TABLE dividend_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stakeholder_id UUID REFERENCES stakeholders(id) ON DELETE CASCADE,
  period_month VARCHAR(7) NOT NULL, -- Format: 'YYYY-MM'
  net_profit_amount NUMERIC NOT NULL,
  distributed_amount NUMERIC NOT NULL,
  journal_id UUID REFERENCES journal_entries(id), -- Link ke pencatatan pengeluaran uangnya
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- FASE 5: INJEKSI DATA AWAL (SEEDING)
-- ==============================================================================
-- Mengisi Chart of Accounts Dasar & Bank
INSERT INTO chart_of_accounts (account_class, account_code, account_name, is_bank) VALUES 
('ASSET', '1-1000', 'Bank 1 (Saldo Awal 60 Jt)', TRUE),
('ASSET', '1-1010', 'Bank 2', TRUE),
('EQUITY', '3-1000', 'Modal Disetor (Starting Balance)', FALSE),
('EQUITY', '3-2000', 'Prive / Penarikan Owner', FALSE),
('EQUITY', '3-3000', 'Laba Ditahan (Retained Earnings)', FALSE);

-- Mengisi CoAs Pendapatan (Sesuai Permintaan Fleksibilitas Semua Divisi)
INSERT INTO chart_of_accounts (account_class, account_code, account_name) VALUES 
('REVENUE', '4-1000', 'Pendapatan Proyek IT (Weatso)'),
('REVENUE', '4-2000', 'Pendapatan Jasa SMM / Booster (Laddify)'),
('REVENUE', '4-3000', 'Pendapatan Jasa Event & Undangan (Evory)'),
('REVENUE', '4-4000', 'Pendapatan Retail IT (Lokal)'),
('REVENUE', '4-5000', 'Pendapatan Kelas/Edukasi (Colabz)'),
('REVENUE', '4-9000', 'Pendapatan Lain-lain');

-- Mengisi CoAs HPP (COGS) & Biaya (EXPENSE)
INSERT INTO chart_of_accounts (account_class, account_code, account_name) VALUES 
('COGS', '5-1000', 'Biaya Pembelian / Vendor Booster (Laddify)'),
('COGS', '5-2000', 'Biaya Server & Infrastruktur IT'),
('COGS', '5-3000', 'Komisi Sales & Affiliator'),
('EXPENSE', '6-1000', 'Gaji Pokok & Tunjangan Tim'),
('EXPENSE', '6-2000', 'Biaya Iklan & Ads'),
('EXPENSE', '6-3000', 'Operasional Kantor & Konsumsi'),
('EXPENSE', '6-4000', 'Biaya Langganan Software/SaaS'),
('EXPENSE', '6-5000', 'Biaya Legalitas & Pajak'),
('EXPENSE', '6-9000', 'Pengeluaran Lain-lain');

-- Mengisi Trigger Default untuk Setting Finansial
INSERT INTO division_financial_settings (entity_id)
SELECT id FROM entities WHERE type = 'DIVISION'
ON CONFLICT DO NOTHING;

-- Buka akses RLS agar aplikasi bisa beroperasi penuh
ALTER TABLE chart_of_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE division_financial_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE journal_lines DISABLE ROW LEVEL SECURITY;
ALTER TABLE stakeholders DISABLE ROW LEVEL SECURITY;
ALTER TABLE dividend_distributions DISABLE ROW LEVEL SECURITY;
