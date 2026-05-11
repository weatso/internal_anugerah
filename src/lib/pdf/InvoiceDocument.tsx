import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { formatRupiah } from '../utils'

const styles = StyleSheet.create({
  page: { padding: 50, fontFamily: 'Helvetica', fontSize: 10, color: '#1a1a1a', lineHeight: 1.2 },

  // ─── HEADER ───────────────────────────────────────────────────────────────
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32,
    borderBottomWidth: 2,
    borderBottomColor: '#D4AF37',
    paddingBottom: 20,
  },
  logoBox: { width: 100, height: 48, justifyContent: 'center' },
  logo: { width: '100%', height: '100%', objectFit: 'contain' },
  logoFallback: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#111827' },
  addressBox: { maxWidth: 240, textAlign: 'right' },
  companyTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 3 },
  addressText: { fontSize: 8, color: '#6b7280', lineHeight: 1.5 },

  // ─── META: KLIEN & DOC INFO ────────────────────────────────────────────────
  metaSection: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  clientBox: { flex: 1, paddingRight: 20 },
  docInfoBox: { width: 190, textAlign: 'right' },
  label: { fontSize: 7.5, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2, fontFamily: 'Helvetica-Bold' },
  valueNormal: { fontSize: 9.5, color: '#374151' },
  valueBold: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#111827' },
  docTypeTitle: { fontSize: 28, fontFamily: 'Helvetica-Bold', color: '#111827', textTransform: 'uppercase', letterSpacing: -0.5 },
  docNumberText: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#D4AF37', marginTop: 3 },

  // ─── PERIHAL ──────────────────────────────────────────────────────────────
  projectBox: {
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },

  // ─── CONTENT BLOCKS ───────────────────────────────────────────────────────
  blockWrapper: { marginBottom: 10 },
  blockTitle: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5, color: '#D4AF37' },
  blockContent: { fontSize: 8.5, color: '#374151', lineHeight: 1.45, textAlign: 'justify' },

  // ─── TABLE ────────────────────────────────────────────────────────────────
  tableSpacer: { marginTop: 18 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 7,
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    paddingVertical: 7,
    paddingHorizontal: 8,
    alignItems: 'flex-start',
  },
  tableRowAlt: { backgroundColor: '#fafafa' },
  colDesc: { flex: 3 },
  colQty:   { width: 36, textAlign: 'center' },
  colPrice: { width: 110, textAlign: 'right' },
  colTotal: { width: 110, textAlign: 'right' },
  tableLabel: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 },
  tableEmpty: { fontSize: 9, color: '#9ca3af', textAlign: 'center', padding: 16 },

  // ─── BOTTOM SECTION (PAYMENT & SUMMARY) ───────────────────────────────────
  bottomSection: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  
  paymentBox: { width: '48%', backgroundColor: '#f9fafb', padding: 10, borderRadius: 4, borderLeftWidth: 3 },
  paymentTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#9ca3af', textTransform: 'uppercase', marginBottom: 6 },
  paymentBank: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 2 },
  paymentDetail: { fontSize: 9, color: '#374151', marginBottom: 2 },

  summaryBox: { width: 230 },
  divider: { borderTopWidth: 1, borderTopColor: '#e5e7eb', marginBottom: 8, marginTop: 4 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  summaryLabel: { fontSize: 8.5, color: '#6b7280' },
  summaryValue: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#111827' },
  grandTotalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 2, borderTopColor: '#D4AF37', marginTop: 4 },
  grandTotalLabel: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#111827' },
  grandTotalValue: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#D4AF37' },

  // ─── FOOTER & VALIDATION ──────────────────────────────────────────────────
  footerContainer: { position: 'absolute', bottom: 25, left: 50, right: 50 },
  validationBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderTopWidth: 1, borderTopColor: '#eeeeee', paddingTop: 10, marginBottom: 10 },
  qrPlaceholder: { width: 40, height: 40, backgroundColor: '#f3f4f6', marginRight: 10 },
  validationText: { fontSize: 7, color: '#6b7280', lineHeight: 1.3 },
  validationLink: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#2563eb', marginTop: 2 },
  
  footer: {
    textAlign: 'center',
    fontSize: 7,
    color: '#9ca3af',
  },
})

// Mapping nama entity → path logo di /public
const ENTITY_LOGO_MAP: Record<string, string> = {
  weatso:          'http://localhost:3000/logo-png/weatso.png',
  evory:           'http://localhost:3000/logo-png/evory.png',
  colabz:          'http://localhost:3000/logo-png/colabz.png',
  lokal:           'http://localhost:3000/logo-png/lokal.png',
  anugerah:        'http://localhost:3000/logo.png',
  'anugerah ventures': 'http://localhost:3000/logo.png',
}

function resolveLogoUrl(entity: any): string | null {
  // 1. Prioritas: logo_url dari DB (admin-managed)
  if (entity?.logo_url) return entity.logo_url

  // 2. Fallback: mapping berdasarkan nama entity
  const nameLower = (entity?.name || '').toLowerCase()
  for (const [key, url] of Object.entries(ENTITY_LOGO_MAP)) {
    if (nameLower.includes(key)) return url
  }

  // 3. Fallback terakhir: logo Anugerah
  return 'http://localhost:3000/logo.png'
}

function resolveAccentColor(entity: any): string {
  return entity?.primary_color || '#D4AF37'
}

export function CommercialDocumentPDF({ data }: { data: any }) {
  // KEAMANAN MUTLAK: Mendukung fallback 'entities' maupun 'entity' dari API Supabase
  const entity  = data.entities || data.entity || {}
  const client  = data.clients || data.client || {}
  const items   = data.items || []

  const accentColor = resolveAccentColor(entity)
  const logoUrl     = resolveLogoUrl(entity)

  // ── Info Perusahaan (dari DB entity, dengan fallback) ───────────────────
  const companyName = entity?.name?.toUpperCase() || 'ANUGERAH VENTURES'
  const companyAddress = entity?.address || 'Jl. Kaba Raya No.44, Tandang, Kec. Tembalang,\nKota Semarang, Jawa Tengah 50274'
  const companyPhone   = entity?.phone   || '081225837439'
  const companyTagline = entity?.tagline || 'Bespoke Enterprise Consultancy • Semarang, Indonesia'

  // ── Format Tanggal ─────────────────────────────────────────────────────
  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'

  const issueDate = fmtDate(data.issue_date)
  const dueDate   = fmtDate(data.due_date)

  // ── Logika Injeksi Fitur Baru ──────────────────────────────────────────
  const showPayment = ['SPK', 'PROFORMA', 'INVOICE'].includes(data.doc_type)
  const validationUrl = `https://anugerah.weatso.com/p/${data.id || 'validation-link'}`

  return (
    <Document title={`${data.doc_type} - ${data.doc_number}`}>
      <Page size="A4" style={styles.page}>

        {/* ─── HEADER ───────────────────────────────────────────────────── */}
        <View style={[styles.headerContainer, { borderBottomColor: accentColor }]}>
          {/* Logo */}
          <View style={styles.logoBox}>
            {logoUrl ? (
              <Image src={logoUrl} style={styles.logo} />
            ) : (
              <Text style={styles.logoFallback}>{entity?.name?.charAt(0) || 'A'}</Text>
            )}
          </View>

          {/* Alamat Perusahaan */}
          <View style={styles.addressBox}>
            <Text style={styles.companyTitle}>{companyName}</Text>
            {/* NPWP Perusahaan Opsional */}
            {entity?.tax_id && <Text style={[styles.addressText, { fontFamily: 'Helvetica-Bold', marginBottom: 2 }]}>NPWP: {entity.tax_id}</Text>}
            <Text style={styles.addressText}>{companyAddress}</Text>
            <Text style={[styles.addressText, { marginTop: 3 }]}>
              Telp: {companyPhone}
            </Text>
          </View>
        </View>

        {/* ─── META: KLIEN + DOC INFO ───────────────────────────────────── */}
        <View style={styles.metaSection}>
          {/* Info Klien */}
          <View style={styles.clientBox}>
            <Text style={styles.label}>Dipersiapkan Untuk:</Text>
            <Text style={styles.valueBold}>{client?.company_name || '—'}</Text>
            
            {/* NPWP Klien Opsional */}
            {client?.npwp && (
               <Text style={[styles.addressText, { marginTop: 3, fontFamily: 'Helvetica-Bold' }]}>NPWP: {client.npwp}</Text>
            )}

            {client?.pic_name && (
              <Text style={[styles.addressText, { marginTop: 4 }]}>
                Attn: {client.pic_name}{client.pic_position ? `, ${client.pic_position}` : ''}
              </Text>
            )}
            {client?.pic_phone && (
              <Text style={styles.addressText}>Telp: {client.pic_phone}</Text>
            )}
            {client?.billing_address && (
              <Text style={[styles.addressText, { marginTop: 2 }]}>{client.billing_address}</Text>
            )}
          </View>

          {/* Info Dokumen */}
          <View style={styles.docInfoBox}>
            <Text style={[styles.docTypeTitle, { color: accentColor }]}>{data.doc_type}</Text>
            <Text style={[styles.docNumberText, { color: accentColor }]}>No. {data.doc_number}</Text>
            {data.termin_name && (
              <Text style={[styles.addressText, { marginTop: 4, fontFamily: 'Helvetica-Bold', color: accentColor }]}>
                {data.termin_name}
              </Text>
            )}
            <View style={{ marginTop: 10 }}>
              <Text style={styles.label}>Tanggal Terbit: {issueDate}</Text>
              {data.due_date && <Text style={[styles.label, { marginTop: 2 }]}>Jatuh Tempo: {dueDate}</Text>}
            </View>
          </View>
        </View>

        {/* ─── PERIHAL PROYEK ───────────────────────────────────────────── */}
        <View style={styles.projectBox}>
          <Text style={styles.label}>Perihal Proyek:</Text>
          <Text style={[styles.valueBold, { fontSize: 14, marginTop: 2 }]}>{data.title}</Text>
        </View>

        {/* ─── CONTENT BLOCKS ───────────────────────────────────────────── */}
        {(data.content_blocks || []).map((block: any, i: number) => (
          <View key={block.id || i} style={styles.blockWrapper}>
            {block.title ? (
              <Text style={[styles.blockTitle, { color: accentColor }]}>{block.title}</Text>
            ) : null}
            {block.content ? (
              <Text style={styles.blockContent}>{block.content}</Text>
            ) : null}
          </View>
        ))}

        {/* ─── TABLE LINE ITEMS ─────────────────────────────────────────── */}
        <View style={styles.tableSpacer}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableLabel, styles.colDesc]}>Deskripsi Layanan / Proyek</Text>
            <Text style={[styles.tableLabel, styles.colQty]}>Qty</Text>
            <Text style={[styles.tableLabel, styles.colPrice]}>Harga Satuan</Text>
            <Text style={[styles.tableLabel, styles.colTotal]}>Total</Text>
          </View>

          {items.length > 0 ? (
            items.map((item: any, i: number) => (
              <View key={i} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
                <View style={styles.colDesc}>
                  <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#111827' }}>
                    {item.description}
                  </Text>
                  {item.is_recurring && item.duration_months > 0 && (
                    <Text style={{ fontSize: 7.5, color: '#6366f1', marginTop: 1 }}>
                      ↻ Recurring · {item.duration_months} bulan
                    </Text>
                  )}
                  {(item.discount_amount > 0) && (
                    <Text style={{ fontSize: 7.5, color: '#ef4444', marginTop: 1 }}>
                      Diskon: − {formatRupiah(item.discount_amount)}
                    </Text>
                  )}
                </View>
                <Text style={[styles.blockContent, styles.colQty]}>{item.quantity}</Text>
                <Text style={[styles.blockContent, styles.colPrice]}>{formatRupiah(item.unit_price)}</Text>
                <Text style={[styles.blockContent, styles.colTotal, { fontFamily: 'Helvetica-Bold', color: '#111827' }]}>
                  {formatRupiah(item.total_price)}
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.tableRow}>
              <Text style={[styles.blockContent, { flex: 1, textAlign: 'center', color: '#9ca3af', padding: 12 }]}>
                Tidak ada rincian item layanan.
              </Text>
            </View>
          )}
        </View>

        {/* ─── BOTTOM SECTION (PAYMENT & SUMMARY) ───────────────────────── */}
        <View style={styles.bottomSection}>
          
          {/* Kotak Instruksi Pembayaran Kiri */}
          <View style={showPayment ? [styles.paymentBox, { borderLeftColor: accentColor }] : { width: '48%' }}>
            {showPayment && (
              <>
                <Text style={styles.paymentTitle}>Instruksi Pembayaran</Text>
                <Text style={styles.paymentBank}>Bank Central Asia (BCA)</Text>
                <Text style={styles.paymentDetail}>No. Rekening: 123-456-7890</Text> 
                <Text style={styles.paymentDetail}>A/N: WEATSO INDONESIA</Text>
                <Text style={[styles.paymentDetail, { marginTop: 4, fontSize: 7, color: '#6b7280' }]}>
                  Harap sertakan Nomor Dokumen ({data.doc_number}) pada berita transfer.
                </Text>
              </>
            )}
          </View>

          {/* Kotak Kalkulasi Kanan */}
          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>{formatRupiah(data.subtotal)}</Text>
            </View>
            {data.tax_amount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>PPN ({data.tax_rate}%)</Text>
                <Text style={styles.summaryValue}>{formatRupiah(data.tax_amount)}</Text>
              </View>
            )}
            <View style={[styles.grandTotalRow, { borderTopColor: accentColor }]}>
              <Text style={styles.grandTotalLabel}>TOTAL INVESTASI</Text>
              <Text style={[styles.grandTotalValue, { color: accentColor }]}>{formatRupiah(data.grand_total)}</Text>
            </View>
          </View>

        </View>

        {/* ─── FOOTER & VALIDATION ──────────────────────────────────────── */}
        <View style={styles.footerContainer}>
          <View style={styles.validationBox}>
            {/* QR Code Placeholder */}
            <View style={styles.qrPlaceholder}></View>
            <View>
              <Text style={styles.validationText}>Pindai QR atau akses tautan berikut untuk memvalidasi keaslian dokumen ini.</Text>
              <Text style={styles.validationText}>Status pengerjaan dan SPK terintegrasi langsung dalam Portal Klien Anugerah OS.</Text>
              <Text style={styles.validationLink}>{validationUrl}</Text>
            </View>
          </View>

          <Text style={styles.footer}>
            Dokumen ini diterbitkan secara elektronik dan merupakan penawaran resmi dari {companyName}.
            {"\n"}{companyTagline}
          </Text>
        </View>

      </Page>
    </Document>
  )
}