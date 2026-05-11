export const getDocumentTemplate = (entityName: string, docType: string) => {
  const name = entityName?.toLowerCase() || '';

  // ─── TEMPLATE DIVISI WEATSO (ENTERPRISE & BESPOKE) ───
  if (name.includes('weatso')) {
    
    if (docType === 'QUOTATION') {
      return [
        { id: 1, title: 'Pendekatan Teknis', content: 'WEATSO (We Are The Solution Indonesia) hadir sebagai mitra strategis Enterprise IT Consultancy Anda. Penawaran ini dirancang secara bespoke untuk memberikan solusi arsitektur digital berkinerja tinggi.' },
        { id: 2, title: 'Ruang Lingkup Pekerjaan (Scope of Work)', content: '1. Riset & Perancangan Arsitektur Sistem\n2. Pengembangan Antarmuka (UI/UX) Eksklusif\n3. Integrasi Database & Pengamanan Server\n4. Deployment & Testing' },
        { id: 3, title: 'Syarat & Ketentuan Komersial', content: '1. Validitas: Penawaran ini sah selama 30 hari kalender. Melewati batas waktu tersebut, nilai investasi tunduk pada penyesuaian inflasi harga pasar.\n2. Scope Creep: Revisi diperbolehkan selama masih berada ketat di dalam parameter SOW. Permintaan penambahan fitur di luar SOW awal akan diklasifikasikan sebagai Change Request berbayar.\n3. Keterlambatan Aset: Klien diwajibkan menyediakan seluruh data pendukung maksimal 48 jam setelah diminta. Keterlambatan akan memundurkan estimasi timeline penyelesaian proyek.' },
        { id: 4, title: 'Garansi & Infrastruktur', content: '1. Garansi: WEATSO memberikan garansi perbaikan sistem (bug fixing) eksklusif yang durasinya disesuaikan dengan tier paket yang disepakati. Garansi resmi berjalan terhitung sejak dokumen Receipt (Pelunasan) diterbitkan.\n2. Infrastruktur: Kecuali Klien berlangganan layanan SLA (Service Level Agreement) dari WEATSO, maka Klien bertanggung jawab penuh atas pemeliharaan server/hosting dan biaya lisensi pihak ketiga.' }
      ]
    }

    if (docType === 'SPK') {
      return [
        { id: 1, title: 'Kesepakatan Pelaksanaan Proyek', content: 'Melalui Surat Perintah Kerja (SPK) ini, kedua belah pihak secara sadar mengikatkan diri dalam pelaksanaan proyek sesuai dengan spesifikasi pada dokumen Quotation yang telah disetujui.' },
        { id: 2, title: 'Klausul Keterlambatan Aset & Timeline', content: 'Klien diwajibkan menyediakan seluruh data, aset, dan persetujuan (approval) yang dibutuhkan tepat waktu. Keterlambatan penyerahan dari pihak Klien akan memperpanjang timeline pengerjaan secara proporsional.' },
        { id: 3, title: 'Pembatalan & Refund', content: 'Apabila Klien membatalkan proyek secara sepihak setelah SPK ini ditandatangani dan Down Payment (DP) dibayarkan, maka DP dinyatakan hangus (non-refundable) sebagai bentuk kompensasi alokasi waktu dan sumber daya tim WEATSO.' }
      ]
    }

    if (docType === 'PROFORMA' || docType === 'INVOICE') {
      return [
        { id: 1, title: 'Instruksi Pembayaran (Term of Payment)', content: 'Batas waktu pembayaran (Jatuh Tempo) adalah 7 hari kalender terhitung sejak dokumen tagihan ini diterbitkan. Mohon sertakan nomor dokumen pada berita transfer.' },
        { id: 2, title: 'Konsekuensi Keterlambatan', content: 'WEATSO tidak memberlakukan denda penalti finansial atas keterlambatan. Namun, apabila dalam waktu 7 hari setelah lewat masa jatuh tempo tidak ada itikad baik atau komunikasi lebih lanjut dari Klien, WEATSO memiliki hak prerogatif penuh untuk membekukan layanan dan membatalkan kontrak kerja sama secara sepihak.' }
      ]
    }

    if (docType === 'RECEIPT') {
      return [
        { id: 1, title: 'Pernyataan Pelunasan & Masa Garansi', content: 'Dokumen ini merupakan bukti sah bahwa seluruh kewajiban finansial atas proyek terkait telah diselesaikan sepenuhnya oleh Klien. Sesuai kesepakatan, masa garansi teknis (Bug Fixing) secara resmi dimulai sejak tanggal penerbitan Receipt ini.' }
      ]
    }
  }

  // ─── TEMPLATE DIVISI EVORY ───
  if (name.includes('evory')) {
    if (docType === 'QUOTATION') {
      return [
        { id: 1, title: 'Konsep Kreatif & Pendekatan', content: 'Evory Creative Studio menawarkan pendekatan visual yang modern dan elegan untuk memperkuat identitas brand Bapak/Ibu di pasar digital.' },
        { id: 2, title: 'Deliverables (Hasil Akhir)', content: '1. 3 Konsep Desain Utama\n2. Master File (AI, PSD, EPS)\n3. Panduan Penggunaan Logo (Brand Guidelines)' },
        { id: 3, title: 'Termin Pembayaran', content: 'Pembayaran dilakukan dalam 2 tahap:\n- Termin 1: 50% Uang Muka (DP)\n- Termin 2: 50% Pelunasan sebelum penyerahan master file.' }
      ]
    }
  }

  // ─── TEMPLATE DEFAULT / HOLDING / LOKAL ───
  if (docType === 'QUOTATION') {
    return [
      { id: 1, title: 'Deskripsi Penawaran', content: 'Berikut adalah penawaran harga untuk layanan kami.' },
      { id: 2, title: 'Syarat & Ketentuan', content: 'Pembayaran dilakukan sesuai kesepakatan. Penawaran berlaku 14 hari.' }
    ]
  }

  // Fallback kosong untuk jenis dokumen lain yang belum didefinisikan
  return [
    { id: 1, title: 'Catatan Tambahan', content: 'Terima kasih atas kepercayaan Anda.' }
  ]
}