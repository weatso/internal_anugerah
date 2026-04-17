import Link from 'next/link'
import { TrendingUp, ArrowLeftRight, Receipt } from 'lucide-react'

export default function FinancePage() {
  return (
    <div className="p-6 md:p-8 space-y-6 animate-[slide-up_0.4s_ease]">
      <div>
        <p className="text-[#D4AF37] text-xs uppercase tracking-[0.3em] font-bold mb-1">Modul</p>
        <h1 className="text-[--color-text-primary] text-2xl font-black tracking-tight">Finance</h1>
        <p className="text-[--color-text-muted] text-sm mt-1">Kelola keuangan, transaksi, dan transfer pricing divisi.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/finance/transactions" className="glass-card p-6 hover:border-[--color-border-hover] group transition-all">
          <div className="p-2 w-10 h-10 rounded-md bg-emerald-400/10 flex items-center justify-center mb-4">
            <Receipt className="w-5 h-5 text-emerald-400" />
          </div>
          <h2 className="text-[--color-text-primary] font-bold mb-1">Transaksi</h2>
          <p className="text-[--color-text-muted] text-sm">Catat pemasukan dan pengeluaran, upload struk bukti.</p>
        </Link>
        <Link href="/finance/transfer-pricing" className="glass-card p-6 hover:border-[--color-border-hover] group transition-all">
          <div className="p-2 w-10 h-10 rounded-md bg-[#D4AF37]/10 flex items-center justify-center mb-4">
            <ArrowLeftRight className="w-5 h-5 text-[#D4AF37]" />
          </div>
          <h2 className="text-[--color-text-primary] font-bold mb-1">Transfer Pricing</h2>
          <p className="text-[--color-text-muted] text-sm">Alokasikan biaya Holding ke divisi-divisi secara terstruktur.</p>
        </Link>
      </div>
    </div>
  )
}
