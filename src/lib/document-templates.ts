export const getDocumentTemplate = (entityName: string, docType: string) => {
  const name = entityName?.toLowerCase() || '';

  // ─── TEMPLATE DIVISI WEATSO (ENTERPRISE & BESPOKE) ───
  if (name.includes('weatso')) {
    
    if (docType === 'QUOTATION') {
      return [
        { id: 1, title: 'Latar Belakang & Pendekatan Teknis', content: 'WEATSO (We Are The Solution Indonesia) hadir sebagai mitra strategis Enterprise IT Consultancy Anda. Penawaran ini dirancang secara bespoke untuk memberikan solusi arsitektur digital berkinerja tinggi, terukur, dan berorientasi pada hasil jangka panjang bagi operasional bisnis Anda.' },
        { id: 2, title: 'Ruang Lingkup Pekerjaan (Scope of Work)', content: '1. Riset & Perancangan Arsitektur Sistem\n2. Pengembangan Antarmuka (UI/UX) Eksklusif\n3. Integrasi Database & Pengamanan Server\n4. Deployment & User Acceptance Test (UAT)' },
        { id: 3, title: 'Investasi & Termin Pembayaran', content: 'Pembayaran akan dibagi ke dalam beberapa termin sesuai kesepakatan bersama, dengan syarat mutlak pembayaran Uang Muka (Down Payment) minimal 30% dari total nilai investasi sebelum proyek berjalan.' },
        { id: 4, title: 'Syarat & Ketentuan Komersial', content: '1. Validitas: Penawaran ini sah selama 30 hari kalender. Melewati batas waktu tersebut, nilai investasi tunduk pada penyesuaian inflasi dan harga pasar saat ini.\n2. Revisi Premium: Klien berhak atas revisi Tidak Terbatas (Unlimited) selama permintaan tersebut masih berada ketat di dalam parameter Ruang Lingkup (Scope of Work) yang disepakati.\n3. Perubahan Ruang Lingkup (Scope Creep): Setiap permintaan penambahan fitur, modul, atau perubahan alur logika di luar SOW awal akan diklasifikasikan sebagai Change Request dan dikenakan biaya tambahan terpisah.' }
      ]
    }

    if (docType === 'SPK') {
      return [
        { id: 1, title: 'Kesepakatan Pelaksanaan Proyek', content: 'Melalui Surat Perintah Kerja (SPK) ini, kedua belah pihak secara sadar mengikatkan diri dalam pelaksanaan proyek sesuai dengan spesifikasi dan spesifikasi pada dokumen Quotation yang telah disetujui.' },
        { id: 2, title: 'Klausul Keterlambatan Aset & Timeline', content: 'Klien diwajibkan menyediakan seluruh data, aset (logo, teks, kredensial), dan persetujuan (approval) yang dibutuhkan tepat waktu. Keterlambatan penyerahan dari pihak Klien akan memperpanjang timeline pengerjaan secara proporsional. WEATSO menetapkan estimasi timeline konservatif untuk menjamin standar kualitas tertinggi, namun akan mengupayakan pengiriman lebih awal (early delivery).' },
        { id: 3, title: 'Pembatalan & Force Majeure', content: 'Apabila Klien membatalkan proyek secara sepihak setelah SPK ini ditandatangani dan Down Payment (DP) dibayarkan, maka DP dinyatakan hangus (non-refundable) sebagai bentuk kompensasi alokasi waktu dan sumber daya tim WEATSO.' }
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
        { id: 1, title: 'Pernyataan Pelunasan & Masa Garansi', content: 'Dokumen ini merupakan bukti sah bahwa seluruh kewajiban finansial atas proyek terkait telah diselesaikan sepenuhnya oleh Klien. Sesuai kesepakatan, masa garansi teknis (Bug Fixing) selama 3 bulan secara resmi dimulai sejak tanggal penerbitan Receipt ini.' },
        { id: 2, title: 'Klausul Infrastruktur & Hosting', content: 'WEATSO telah memastikan sistem berjalan optimal saat serah terima. Segala bentuk kegagalan operasional yang murni disebabkan oleh pihak ketiga (penyedia server/hosting Klien) di luar kendali WEATSO bukan merupakan bagian dari cakupan garansi ini.' }
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