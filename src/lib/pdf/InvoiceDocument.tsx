import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'
import { formatRupiah } from '../utils'

// HAPUS FONT.REGISTER: Kita menggunakan Built-in PDF Fonts (Helvetica) untuk Stabilitas 100% dan Zero-Latency.

const styles = StyleSheet.create({
  // Gunakan Helvetica sebagai font native
  page: { padding: 50, fontFamily: 'Helvetica', fontSize: 10, color: '#1a1a1a', lineHeight: 1.2 },
  
  // HEADER
  headerContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    marginBottom: 40, 
    borderBottomWidth: 1, 
    borderBottomColor: '#eeeeee', 
    paddingBottom: 20 
  },
  logoBox: { width: 140 },
  logo: { width: '100%', height: 'auto' },
  addressBox: { width: 250, textAlign: 'right' },
  companyTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 4 },
  addressText: { fontSize: 8, color: '#6b7280', lineHeight: 1.4 },

  // INFO DOKUMEN & KLIEN
  metaSection: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  clientBox: { flex: 1 },
  docInfoBox: { width: 180, textAlign: 'right' },
  label: { fontSize: 8, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 2, fontFamily: 'Helvetica-Bold' },
  valueBold: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#111827' },
  docTypeTitle: { fontSize: 26, fontFamily: 'Helvetica-Bold', color: '#111827', textTransform: 'uppercase' },

  // CONTENT BLOCKS
  blockWrapper: { marginBottom: 12 },
  blockTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', marginBottom: 3, textTransform: 'uppercase', color: '#D4AF37' },
  blockContent: { fontSize: 9, color: '#374151', textAlign: 'justify', lineHeight: 1.3 },

  // TABLE RINCIAN LAYANAN
  tableHeader: { 
    flexDirection: 'row', 
    backgroundColor: '#f9fafb', 
    borderTopWidth: 1, 
    borderTopColor: '#eeeeee', 
    borderBottomWidth: 1, 
    borderBottomColor: '#eeeeee', 
    padding: 8, 
    marginTop: 15 
  },
  tableRow: { 
    flexDirection: 'row', 
    borderBottomWidth: 1, 
    borderBottomColor: '#f3f4f6', 
    padding: 8, 
    alignItems: 'center' 
  },
  colDesc: { flex: 3 },
  colQty: { width: 40, textAlign: 'center' },
  colPrice: { width: 100, textAlign: 'right' },
  colTotal: { width: 100, textAlign: 'right' },
  tableLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#6b7280', textTransform: 'uppercase' },

  // SUMMARY
  summaryContainer: { marginTop: 20, flexDirection: 'row', justifyContent: 'flex-end' },
  summaryBox: { width: 220, borderTopWidth: 2, borderTopColor: '#111827', paddingTop: 10 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  grandTotal: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#D4AF37', marginTop: 5 },
  
  footer: { 
    position: 'absolute', 
    bottom: 30, 
    left: 50, 
    right: 50, 
    textAlign: 'center', 
    fontSize: 7, 
    color: '#9ca3af', 
    borderTopWidth: 1, 
    borderTopColor: '#eeeeee', 
    paddingTop: 10 
  }
})

// PENTING: Nama function harus persis "CommercialDocumentPDF" agar dikenali oleh route.ts
export function CommercialDocumentPDF({ data }: { data: any }) {
  const issueDate = data.issue_date ? new Date(data.issue_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-'
  const dueDate = data.due_date ? new Date(data.due_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-'

  // URL absolut ke file PNG (bukan SVG).
  // Saat dideploy ke production, ganti http://localhost:3000 menjadi URL domain Anda, 
  // atau gunakan process.env.NEXT_PUBLIC_APP_URL
  const logoUrl = 'http://localhost:3000/logo.png'

  return (
    <Document title={`${data.doc_type} - ${data.doc_number}`}>
      <Page size="A4" style={styles.page}>
        
        <View style={styles.headerContainer}>
          <View style={styles.logoBox}>
            <Image src={logoUrl} style={styles.logo} />
          </View>
          <View style={styles.addressBox}>
            <Text style={styles.companyTitle}>WE ARE THE SOLUTION INDONESIA</Text>
            <Text style={styles.addressText}>
              Jl. Kaba Raya No.44, Tandang, Kec. Tembalang,{"\n"}
              Kota Semarang, Jawa Tengah 50274
            </Text>
          </View>
        </View>

        <View style={styles.metaSection}>
          <View style={styles.clientBox}>
            <Text style={styles.label}>Dipersiapkan Untuk:</Text>
            <Text style={styles.valueBold}>{data.client?.company_name || 'Klien Umum'}</Text>
            <Text style={[styles.addressText, { marginTop: 2 }]}>
              PIC: {data.client?.pic_name} {data.client?.pic_phone ? `(${data.client.pic_phone})` : ''}
            </Text>
          </View>
          <View style={styles.docInfoBox}>
            <Text style={styles.docTypeTitle}>{data.doc_type}</Text>
            <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#D4AF37', marginTop: 2 }}>No. {data.doc_number}</Text>
            <View style={{ marginTop: 10 }}>
              <Text style={styles.label}>Tanggal Terbit: {issueDate}</Text>
              {data.due_date && <Text style={styles.label}>Jatuh Tempo: {dueDate}</Text>}
            </View>
          </View>
        </View>

        <View style={{ marginBottom: 25 }}>
          <Text style={styles.label}>Perihal Proyek:</Text>
          <Text style={[styles.valueBold, { fontSize: 13, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', paddingBottom: 5 }]}>
            {data.title}
          </Text>
        </View>

        {data.content_blocks?.map((block: any) => (
          <View key={block.id} style={styles.blockWrapper}>
            {block.title && <Text style={styles.blockTitle}>{block.title}</Text>}
            <Text style={styles.blockContent}>{block.content}</Text>
          </View>
        ))}

        <View style={{ marginTop: 10 }}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableLabel, styles.colDesc]}>Deskripsi Layanan / Proyek</Text>
            <Text style={[styles.tableLabel, styles.colQty]}>Qty</Text>
            <Text style={[styles.tableLabel, styles.colPrice]}>Harga Satuan</Text>
            <Text style={[styles.tableLabel, styles.colTotal]}>Total</Text>
          </View>

          {data.items?.length > 0 ? (
            data.items.map((item: any, i: number) => (
              <View key={i} style={styles.tableRow}>
                <View style={styles.colDesc}>
                  <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#111827' }}>{item.description}</Text>
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
              <Text style={[styles.blockContent, { flex: 1, textAlign: 'center', color: '#9ca3af', padding: 10 }]}>
                Tidak ada rincian item layanan.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.summaryContainer}>
          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.blockContent}>Subtotal</Text>
              <Text style={[styles.blockContent, { fontFamily: 'Helvetica-Bold' }]}>{formatRupiah(data.subtotal)}</Text>
            </View>
            {data.tax_amount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.blockContent}>PPN ({data.tax_rate}%)</Text>
                <Text style={[styles.blockContent, { fontFamily: 'Helvetica-Bold' }]}>{formatRupiah(data.tax_amount)}</Text>
              </View>
            )}
            <View style={[styles.summaryRow, { marginTop: 6, borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 6 }]}>
              <Text style={[styles.blockContent, { fontFamily: 'Helvetica-Bold' }]}>TOTAL INVESTASI</Text>
              <Text style={styles.grandTotal}>{formatRupiah(data.grand_total)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>Dokumen ini adalah penawaran resmi dari WE ARE THE SOLUTION INDONESIA dan diterbitkan secara elektronik.</Text>
          <Text style={{ marginTop: 2, fontFamily: 'Helvetica-Bold' }}>Bespoke Enterprise IT Consultancy • Semarang, Indonesia</Text>
        </View>

      </Page>
    </Document>
  )
}