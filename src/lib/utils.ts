import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(dateStr: string): string {
  return format(new Date(dateStr), 'd MMMM yyyy', { locale: id })
}

export function formatDateTime(dateStr: string): string {
  return format(new Date(dateStr), 'd MMM yyyy, HH:mm', { locale: id })
}

export function generateInvoiceNumber(entityName: string, sequence: number): string {
  const year = new Date().getFullYear()
  const month = String(new Date().getMonth() + 1).padStart(2, '0')
  const seq = String(sequence).padStart(3, '0')
  const code = entityName.toUpperCase().replace(/\s+/g, '').slice(0, 6)
  return `INV/${code}/${year}${month}/${seq}`
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    PENDING_APPROVAL: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    APPROVED: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    SENT: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    SUBMITTED: 'text-[--color-text-muted] bg-neutral-400/10 border-neutral-400/20',
    REVIEWED_BY_CEO: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    NEEDS_ACTION: 'text-red-400 bg-red-400/10 border-red-400/20',
    PENDING: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    INCOME: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    EXPENSE: 'text-red-400 bg-red-400/10 border-red-400/20',
  }
  return map[status] ?? 'text-[--color-text-muted] bg-neutral-400/10 border-neutral-400/20'
}

export function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    PENDING_APPROVAL: 'Menunggu Approval',
    APPROVED: 'Disetujui',
    SENT: 'Telah Dikirim',
    SUBMITTED: 'Tersubmit',
    REVIEWED_BY_CEO: 'Reviewed CEO',
    NEEDS_ACTION: 'Perlu Tindakan',
    PENDING: 'Pending',
    INCOME: 'Pemasukan',
    EXPENSE: 'Pengeluaran',
    HOLDING: 'Holding',
    DIVISION: 'Divisi',
    CEO: 'CEO',
    HEAD: 'Head',
    FINANCE: 'Finance',
    STAFF: 'Staff',
  }
  return map[status] ?? status
}
