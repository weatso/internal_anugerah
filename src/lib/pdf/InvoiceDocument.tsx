import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';

// Register Font (Ganti dengan URL font Anda jika ada, atau gunakan standar Helvetica)
Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyeMZhrib2Bg-4.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYMZhrib2Bg-4.ttf', fontWeight: 700 },
  ]
});

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#1A1A1A' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 40, borderBottomWidth: 2, paddingBottom: 15 },
  logoBox: { width: 120, height: 40 },
  entityInfo: { textAlign: 'right' },
  entityName: { fontSize: 16, fontWeight: 'bold', textTransform: 'uppercase' },
  entitySub: { fontSize: 8, color: '#666', marginTop: 4 },
  
  metaSection: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  clientBox: { width: '50%' },
  metaLabel: { fontSize: 8, color: '#666', textTransform: 'uppercase', marginBottom: 4 },
  clientName: { fontSize: 12, fontWeight: 'bold', marginBottom: 2 },
  
  docInfoBox: { width: '40%', textAlign: 'right' },
  docTitle: { fontSize: 14, fontWeight: 'bold', color: '#D4AF37', textTransform: 'uppercase', marginBottom: 8 },
  metaRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 3 },
  metaRowLabel: { color: '#666', marginRight: 10, fontSize: 9 },
  metaRowValue: { fontWeight: 'bold', fontSize: 9 },

  // Content Blocks
  blocksSection: { marginBottom: 30 },
  textBlock: { marginBottom: 10, lineHeight: 1.5, textAlign: 'justify' },

  // Table
  table: { width: '100%', marginBottom: 30 },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#000', paddingBottom: 5, marginBottom: 5 },
  tableRow: { flexDirection: 'row', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  colDesc: { flex: 1 },
  colQty: { width: '10%', textAlign: 'center' },
  colPrice: { width: '20%', textAlign: 'right' },
  colTotal: { width: '20%', textAlign: 'right' },
  
  // Financial Summary
  summaryBox: { width: '40%', alignSelf: 'flex-end', marginTop: 10 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  summaryGrand: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderTopWidth: 2, borderTopColor: '#000', marginTop: 4 },
  grandText: { fontSize: 12, fontWeight: 'bold' },

  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, textAlign: 'center', fontSize: 8, color: '#888', borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 10 }
});

const formatRupiah = (num: number) => `Rp ${num.toLocaleString('id-ID')}`;

export const CommercialDocumentPDF = ({ data }: { data: any }) => {
  const entityColor = data.entities?.primary_color || '#000000';
  
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* KOP SURAT (HEADER) */}
        <View style={[styles.header, { borderBottomColor: entityColor }]}>
          <View style={styles.logoBox}>
            {/* Jika Anda punya field logo_url di entitas, bisa di-load di sini */}
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: entityColor }}>{data.entities?.name}</Text>
          </View>
          <View style={styles.entityInfo}>
            <Text style={styles.entityName}>{data.entities?.name}</Text>
            <Text style={styles.entitySub}>Member of Vision Velocity Ventures</Text>
            <Text style={styles.entitySub}>Semarang, Indonesia</Text>
          </View>
        </View>

        {/* METADATA (KLIEN & INFO DOKUMEN) */}
        <View style={styles.metaSection}>
          <View style={styles.clientBox}>
            <Text style={styles.metaLabel}>Ditujukan Kepada:</Text>
            <Text style={styles.clientName}>{data.clients?.company_name}</Text>
            <Text style={{ fontSize: 10, marginBottom: 2 }}>Attn: {data.clients?.pic_name}</Text>
            {data.clients?.billing_address && <Text style={{ fontSize: 9, color: '#444' }}>{data.clients.billing_address}</Text>}
            {data.clients?.npwp && <Text style={{ fontSize: 8, color: '#666', marginTop: 4 }}>NPWP: {data.clients.npwp}</Text>}
          </View>

          <View style={styles.docInfoBox}>
            <Text style={[styles.docTitle, { color: entityColor }]}>{data.doc_type.replace('_', ' ')}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaRowLabel}>No. Dokumen:</Text>
              <Text style={styles.metaRowValue}>{data.doc_number}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaRowLabel}>Tanggal Terbit:</Text>
              <Text style={styles.metaRowValue}>{new Date(data.issue_date).toLocaleDateString('id-ID')}</Text>
            </View>
            {data.due_date && (
              <View style={styles.metaRow}>
                <Text style={styles.metaRowLabel}>Jatuh Tempo:</Text>
                <Text style={styles.metaRowValue}>{new Date(data.due_date).toLocaleDateString('id-ID')}</Text>
              </View>
            )}
          </View>
        </View>

        {/* JUDUL PROYEK */}
        <Text style={{ fontSize: 11, fontWeight: 'bold', marginBottom: 15, textTransform: 'uppercase' }}>
          Perihal: {data.title}
        </Text>

        {/* MESIN PARAGRAF DINAMIS (JSONB BLOCKS) */}
        {data.content_blocks && data.content_blocks.length > 0 && (
          <View style={styles.blocksSection}>
            {data.content_blocks.map((block: any, idx: number) => (
              <Text key={idx} style={styles.textBlock}>{block.content}</Text>
            ))}
          </View>
        )}

        {/* TABEL FINANSIAL (Hanya tampil jika ada harganya) */}
        {data.document_line_items && data.document_line_items.length > 0 && (
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.colDesc, { fontWeight: 'bold' }]}>Deskripsi Item</Text>
              <Text style={[styles.colQty, { fontWeight: 'bold' }]}>Qty</Text>
              <Text style={[styles.colPrice, { fontWeight: 'bold' }]}>Harga</Text>
              <Text style={[styles.colTotal, { fontWeight: 'bold' }]}>Total</Text>
            </View>
            {data.document_line_items.map((item: any, idx: number) => (
              <View key={idx} style={styles.tableRow}>
                <Text style={styles.colDesc}>{item.description}</Text>
                <Text style={styles.colQty}>{item.quantity}</Text>
                <Text style={styles.colPrice}>{formatRupiah(item.unit_price)}</Text>
                <Text style={styles.colTotal}>{formatRupiah(item.total_price)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* REKAP TOTAL (Hanya tampil jika Subtotal > 0) */}
        {data.subtotal > 0 && (
          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text>Subtotal:</Text>
              <Text>{formatRupiah(data.subtotal)}</Text>
            </View>
            {data.tax_amount > 0 && (
              <View style={styles.summaryRow}>
                <Text>Pajak ({data.tax_rate}%):</Text>
                <Text>{formatRupiah(data.tax_amount)}</Text>
              </View>
            )}
            <View style={styles.summaryGrand}>
              <Text style={styles.grandText}>GRAND TOTAL:</Text>
              <Text style={[styles.grandText, { color: entityColor }]}>{formatRupiah(data.grand_total)}</Text>
            </View>
          </View>
        )}

        {/* FOOTER */}
        <Text style={styles.footer}>
          Dokumen ini di-generate secara otomatis oleh sistem Vision Velocity Ventures.
        </Text>
      </Page>
    </Document>
  );
};