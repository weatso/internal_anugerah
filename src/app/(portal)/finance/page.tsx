'use client'

import Link from 'next/link'
import { TrendingUp, ArrowLeftRight, Receipt, Landmark, Coins } from 'lucide-react'
import { useUser } from '@/components/providers/UserProvider'

export default function FinancePage() {
  const { profile } = useUser()

  return (
    <div className="p-6 md:p-8 space-y-6 animate-[slide-up_0.4s_ease]">
      <div>
        <p className="text-[#D4AF37] text-xs uppercase tracking-[0.3em] font-bold mb-1">Modul</p>
        <h1 className="text-[--color-text-primary] text-2xl font-black tracking-tight">Finance</h1>
        <p className="text-[--color-text-muted] text-sm mt-1">Kelola keuangan, transaksi, dan transfer pricing divisi.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {profile?.role === 'CEO' && (
          <Link href="/finance/master-data" className="glass-card p-6 hover:border-[#D4AF37]/50 group transition-all border border-white/5">
            <div className="p-2 w-10 h-10 rounded-md bg-[#D4AF37]/10 flex items-center justify-center mb-4">
              <Landmark className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <h2 className="text-[#D4AF37] font-bold mb-1">Master Data KAP</h2>
            <p className="text-[--color-text-muted] text-sm">Kelola Bank, Chart of Accounts, dan limit budget divisi.</p>
          </Link>
        )}
        <Link href="/finance/transactions" className="glass-card p-6 hover:border-emerald-400/50 group transition-all border border-white/5">
          <div className="p-2 w-10 h-10 rounded-md bg-emerald-400/10 flex items-center justify-center mb-4">
            <Receipt className="w-5 h-5 text-emerald-400" />
          </div>
          <h2 className="text-emerald-400 font-bold mb-1">Transaksi Bank</h2>
          <p className="text-[--color-text-muted] text-sm">Catat uang masuk/keluar ke rekening riil beserta struk bukti.</p>
        </Link>
        <Link href="/finance/transfer-pricing" className="glass-card p-6 hover:border-blue-500/50 group transition-all border border-white/5">
          <div className="p-2 w-10 h-10 rounded-md bg-blue-500/10 flex items-center justify-center mb-4">
            <ArrowLeftRight className="w-5 h-5 text-blue-500" />
          </div>
          <h2 className="text-blue-500 font-bold mb-1">Transfer Pricing</h2>
          <p className="text-[--color-text-muted] text-sm">Alokasi biaya virtual antar-divisi (Internal Billing).</p>
        </Link>
        <Link href="/finance/reports" className="glass-card p-6 hover:border-purple-500/50 group transition-all border border-white/5">
          <div className="p-2 w-10 h-10 rounded-md bg-purple-500/10 flex items-center justify-center mb-4">
            <TrendingUp className="w-5 h-5 text-purple-500" />
          </div>
          <h2 className="text-purple-500 font-bold mb-1">Laporan Keuangan</h2>
          <p className="text-[--color-text-muted] text-sm">Neraca, Laba Rugi, dan Arus Kas secara real-time.</p>
        </Link>
        {profile?.role === 'CEO' && (
          <Link href="/finance/dividends" className="glass-card p-6 hover:border-emerald-500/50 group transition-all border border-white/5">
            <div className="p-2 w-10 h-10 rounded-md bg-emerald-500/10 flex items-center justify-center mb-4">
              <Coins className="w-5 h-5 text-emerald-500" />
            </div>
            <h2 className="text-emerald-500 font-bold mb-1">Dividen & Profit Share</h2>
            <p className="text-[--color-text-muted] text-sm">Kalkulasi dan distribusi laba bersih ke investor.</p>
          </Link>
        )}
      </div>
    </div>
  )
}
