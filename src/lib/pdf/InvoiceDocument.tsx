import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer'
import type { Invoice, Entity } from '@/types'
import { format } from 'date-fns'
import { id } from 'date-fns/locale'

const ENTITY_COLORS: Record<string, string> = {
  WEATSO: '#1a1a2e',
  EVORY: '#f8f9fa',
  COLABZ: '#0f3460',
  LOKAL: '#2d6a4f',
}

const ENTITY_ACCENT: Record<string, string> = {
  WEATSO: '#D4AF37',
  EVORY: '#9b59b6',
  COLABZ: '#e94560',
  LOKAL: '#52b788',
}

const styles = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10, color: '#111', padding: 48, backgroundColor: '#ffffff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 },
  logo: { width: 80, height: 30, objectFit: 'contain' },
  companyName: { fontSize: 18, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  accentLine: { height: 3, width: 48, borderRadius: 2, marginBottom: 24 },
  label: { fontSize: 8, color: '#999', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
  value: { fontSize: 10, color: '#111', fontFamily: 'Helvetica-Bold' },
  section: { marginBottom: 20 },
  invoiceTitle: { fontSize: 24, fontFamily: 'Helvetica-Bold', color: '#111', marginBottom: 4 },
  invoiceNumber: { fontSize: 10, color: '#666' },
  table: { marginTop: 16 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f5f5f5', padding: 8, borderRadius: 4 },
  tableRow: { flexDirection: 'row', padding: '8px 8px', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  col1: { flex: 3 }, col2: { flex: 1, textAlign: 'center' }, col3: { flex: 1.5, textAlign: 'right' }, col4: { flex: 1.5, textAlign: 'right' },
  totalRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12, paddingTop: 12, borderTopWidth: 2, borderTopColor: '#111' },
  totalLabel: { fontSize: 12, fontFamily: 'Helvetica-Bold', marginRight: 24 },
  totalValue: { fontSize: 14, fontFamily: 'Helvetica-Bold' },
  footer: { position: 'absolute', bottom: 32, left: 48, right: 48 },
  footerLine: { height: 1, backgroundColor: '#eee', marginBottom: 12 },
  footerText: { fontSize: 8, color: '#aaa', textAlign: 'center' },
})

function formatRp(amount: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
}

export function InvoicePDFDocument({ invoice }: { invoice: Invoice & { entity: Entity } }) {
  const entityName = invoice.entity?.name?.toUpperCase() ?? 'ANUGERAH'
  const accentColor = ENTITY_ACCENT[entityName] ?? '#D4AF37'
  const dateStr = format(new Date(invoice.created_at), 'd MMMM yyyy', { locale: id })

  return (
    <Document title={`Invoice ${invoice.invoice_number}`}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.companyName}>{invoice.entity?.name}</Text>
            <View style={[styles.accentLine, { backgroundColor: accentColor }]} />
            <Text style={{ fontSize: 8, color: '#666' }}>Issued by {invoice.entity?.name} — Anugerah Ventures</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceNumber}>{invoice.invoice_number ?? invoice.id}</Text>
            <Text style={[styles.label, { marginTop: 8 }]}>Tanggal</Text>
            <Text style={styles.value}>{dateStr}</Text>
          </View>
        </View>

        {/* Bill To */}
        <View style={[styles.section, { flexDirection: 'row', gap: 32 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Tagihan Kepada</Text>
            <Text style={styles.value}>{invoice.client_name}</Text>
            {invoice.client_address && <Text style={{ fontSize: 9, color: '#555', marginTop: 2 }}>{invoice.client_address}</Text>}
            {invoice.client_phone && <Text style={{ fontSize: 9, color: '#555' }}>{invoice.client_phone}</Text>}
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.col1, { fontFamily: 'Helvetica-Bold', fontSize: 8, textTransform: 'uppercase', letterSpacing: 0.5 }]}>Item / Layanan</Text>
            <Text style={[styles.col2, { fontFamily: 'Helvetica-Bold', fontSize: 8, textTransform: 'uppercase' }]}>Qty</Text>
            <Text style={[styles.col3, { fontFamily: 'Helvetica-Bold', fontSize: 8, textTransform: 'uppercase' }]}>Harga Satuan</Text>
            <Text style={[styles.col4, { fontFamily: 'Helvetica-Bold', fontSize: 8, textTransform: 'uppercase' }]}>Subtotal</Text>
          </View>
          {invoice.items.map((item, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.col1}>{item.name}</Text>
              <Text style={styles.col2}>{item.qty}</Text>
              <Text style={styles.col3}>{formatRp(item.unit_price)}</Text>
              <Text style={[styles.col4, { fontFamily: 'Helvetica-Bold' }]}>{formatRp(item.qty * item.unit_price)}</Text>
            </View>
          ))}
        </View>

        {/* Total */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>TOTAL</Text>
          <Text style={[styles.totalValue, { color: accentColor }]}>{formatRp(invoice.total_amount)}</Text>
        </View>

        {/* Notes */}
        {invoice.notes && (
          <View style={{ marginTop: 24, padding: 12, backgroundColor: '#f9f9f9', borderRadius: 4 }}>
            <Text style={[styles.label, { marginBottom: 4 }]}>Catatan</Text>
            <Text style={{ fontSize: 9, color: '#555', lineHeight: 1.5 }}>{invoice.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <View style={styles.footerLine} />
          <Text style={styles.footerText}>
            Dokumen ini digenerate secara otomatis oleh Anugerah Ventures Internal OS. © 2026 Anugerah Ventures.
          </Text>
        </View>
      </Page>
    </Document>
  )
}
