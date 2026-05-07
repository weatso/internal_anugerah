import { cookies } from 'next/headers'
import Link from 'next/link'
import { BookOpen, Layers, ArrowLeftRight, DollarSign, PieChart, BarChart3 } from 'lucide-react'

// Definisi Modul tersentralisasi dengan filter otorisasi
const FINANCE_MODULES = [
  { 
    href: '/finance/transactions', 
    label: 'Buku Besar', 
    description: 'Pusat pencatatan jurnal transaksi harian secara double-entry untuk menjaga keseimbangan neraca.', 
    icon: BookOpen, 
    roles: ['CEO','FINANCE','HEAD','STAFF'] 
  },
  { 
    href: '/finance/master-data', 
    label: 'Master Data COA', 
    description: 'Pengaturan Chart of Accounts (Bagan Akun) terpusat untuk seluruh entitas holding.', 
    icon: Layers, 
    roles: ['CEO'] 
  },
  { 
    href: '/finance/transfer-pricing', 
    label: 'Transfer Pricing', 
    description: 'Persetujuan dan pencatatan otomatis untuk tagihan biaya antar divisi.', 
    icon: ArrowLeftRight, 
    roles: ['CEO','FINANCE'] 
  },
  { 
    href: '/finance/amortization', 
    label: 'Amortisasi Revenue', 
    description: 'Eksekusi pengakuan pendapatan bertahap (Pecah Telur) dari Deferred Revenue.', 
    icon: Layers, 
    roles: ['CEO','FINANCE'] 
  },
  { 
    href: '/finance/commissions', 
    label: 'Komisi Sales', 
    description: 'Manajemen dan pencairan komisi untuk tim penjualan dan affiliator.', 
    icon: DollarSign, 
    roles: ['CEO','FINANCE'] 
  },
  { 
    href: '/finance/dividends', 
    label: 'Profit Split & Dividen', 
    description: 'Distribusi Laba Bersih kepada Partner Operasional dan Pemegang Saham.', 
    icon: PieChart, 
    roles: ['CEO'] 
  },
  { 
    href: '/finance/reports', 
    label: 'Laporan Keuangan', 
    description: 'Pantauan metrik finansial, Laba Rugi (PnL), dan arus kas divisi.', 
    icon: BarChart3, 
    roles: ['CEO','FINANCE'] 
  },
]

export default async function FinanceHubPage() {
  // Baca otoritas langsung dari Server
  const cookieStore = await cookies()
  const activeRole = cookieStore.get('active_role')?.value || 'STAFF'

  // Saring modul yang boleh dilihat oleh peran saat ini
  const visibleModules = FINANCE_MODULES.filter(m => m.roles.includes(activeRole))

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto w-full">
      <div className="mb-10 border-b border-white/10 pb-6">
        <h1 className="text-3xl font-black uppercase tracking-widest text-[var(--gold)] mb-2">
          Pusat Keuangan
        </h1>
        <p className="text-[var(--text-muted)] text-sm">
          Akses seluruh modul akuntansi, arus kas, dan distribusi kekayaan perusahaan.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleModules.map((mod) => {
          const Icon = mod.icon
          return (
            <Link 
              key={mod.href} 
              href={mod.href} 
              className="group block p-6 rounded-xl border border-white/5 bg-[#0a0a0a] hover:border-[var(--gold)] transition-all duration-300 relative overflow-hidden"
            >
              {/* Efek Glow di background saat hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--gold)]/0 to-[var(--gold)]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center mb-5 group-hover:bg-[var(--gold-glow)] group-hover:border-[var(--gold)]/30 transition-all duration-300">
                  <Icon className="w-6 h-6 text-[var(--text-muted)] group-hover:text-[var(--gold)] transition-colors duration-300" />
                </div>
                <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2 tracking-wide group-hover:text-[var(--gold)] transition-colors duration-300">
                  {mod.label}
                </h2>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  {mod.description}
                </p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}