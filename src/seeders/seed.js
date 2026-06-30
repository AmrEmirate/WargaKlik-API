require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const bcrypt = require('bcryptjs');
const {
  sequelize,
  User,
  Warga,
  IuranMaster,
  WargaIuran,
  Tagihan,
  TagihanItem,
  Pembayaran,
  KasHarian,
  Pengumuman,
  Notifikasi,
  Laporan,
} = require('../models');

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    await sequelize.sync({ force: true });
    console.log('✅ Database synced (force: true — semua tabel di-reset)\n');

    const hashRT = await bcrypt.hash('SandiRT123!', 10);
    const hashBendahara = await bcrypt.hash('SandiBendahara456!', 10);
    const hashSekretaris = await bcrypt.hash('SandiSekretaris789!', 10);
    const hashWarga = await bcrypt.hash('SandiWarga321!', 10);

    // ─────────────────────────────────────────────
    // 1. USERS  (3 pengurus + 10 warga = 13 user)
    // ─────────────────────────────────────────────
    console.log('📋 Seeding Users...');

    const randEmailSuffix = Math.floor(Math.random() * 1000);
    const emailRT = 'dedi.setiadi@gmail.com';
    const emailBendahara = `bendahara${randEmailSuffix}@gmail.com`;
    const emailSekretaris = `sekretaris${randEmailSuffix}@gmail.com`;

    const userRT = await User.create({
      name: 'Dedi Setiadi & Sandra Puspita',
      email: emailRT,
      password: hashRT,
      no_telepon: '08' + Math.floor(1000000000 + Math.random() * 9000000000).toString().substring(0, 10),
      role: 'rt',
    });

    const userBendahara = await User.create({
      name: 'Ibu Hartini',
      email: emailBendahara,
      password: hashBendahara,
      no_telepon: '08' + Math.floor(1000000000 + Math.random() * 9000000000).toString().substring(0, 10),
      role: 'bendahara',
    });

    const userSekretaris = await User.create({
      name: 'Pak Gunawan',
      email: emailSekretaris,
      password: hashSekretaris,
      no_telepon: '08' + Math.floor(1000000000 + Math.random() * 9000000000).toString().substring(0, 10),
      role: 'sekretaris',
    });

    const wargaRawData = [
      { name: 'Egi', no_rumah: 'HJ1/8' },
      { name: 'Eko & Maureen', no_rumah: 'HJ1/4' },
      { name: 'Yoko & Erna', no_rumah: 'HJ1/10' },
      { name: 'Desma & Edy', no_rumah: 'HJ1/12' },
      { name: 'Joshua', no_rumah: 'HJ1/14' },
      { name: 'Zahra & Rio', no_rumah: 'HJ2/1' },
      { name: 'Lukito & Keke', no_rumah: 'HJ2/3' },
      { name: 'Wenny & Aria', no_rumah: 'HJ2/5' },
      { name: 'Tatang & Rini', no_rumah: 'HJ2/7' },
      { name: 'Budi & Yeyen', no_rumah: 'HJ2/9' },
      { name: 'Bina & Agung', no_rumah: 'HJ2/11' },
      { name: 'Yadi & Vivi', no_rumah: 'HJ2/15' },
      { name: 'Raymond & Marris', no_rumah: 'HJ2/17' },
      { name: 'Rika & Hendra', no_rumah: 'HJ3/3' },
      { name: 'Jimmy', no_rumah: 'HJ3/5' },
      { name: 'Darwis', no_rumah: 'HJ3/7' },
      { name: 'Dibby & Ira', no_rumah: 'HJ3/8' },
      { name: 'Endy & Yani', no_rumah: 'HJ3/6' },
      { name: 'Indra & Tala', no_rumah: 'HJ3/4' },
      { name: 'Dedi Setiadi & Sandra Puspita', no_rumah: 'HJ3/2' },
      { name: 'Dudi', no_rumah: 'HJ3/9' },
      { name: 'Erwin & Hairi', no_rumah: 'HJ3/12' },
      { name: 'Her', no_rumah: 'HJ3/17' },
      { name: 'Purwanti', no_rumah: 'HJ5/1' },
      { name: 'Niken', no_rumah: 'HJ5/2' },
      { name: 'Devara & Syifa', no_rumah: 'HJ5/3' },
      { name: 'Irma', no_rumah: 'HJ5/4' },
      { name: 'Dhita & Bintang', no_rumah: 'HJ5/5' },
      { name: 'Ben & Lisa', no_rumah: 'HJ5/7' },
      { name: 'Mario & Nakita', no_rumah: 'HJ5/9' },
      { name: 'Marlina & Aulia', no_rumah: 'HJ5/11' },
      { name: 'Rahmadi & Indi', no_rumah: 'HJ5/12' },
      { name: 'Titik', no_rumah: 'HJ5/14' },
    ].map((w, index) => {
      const emailName = w.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      return {
        name: w.name,
        email: `${emailName}${Math.floor(Math.random() * 1000)}@gmail.com`,
        no_telepon: '08' + Math.floor(1000000000 + Math.random() * 9000000000).toString().substring(0, 10),
        no_rumah: w.no_rumah,
        no_kk: `3501010101010${String(index + 1).padStart(3, '0')}`,
        jumlah_anggota: Math.floor(Math.random() * 4) + 1,
        status_rumah: Math.random() > 0.8 ? 'kontrak' : 'tetap',
      }
    });

    const wargaUsers = [];
    const wargaRecords = [];

    for (const w of wargaRawData) {
      const user = await User.create({
        name: w.name,
        email: w.email,
        password: hashWarga,
        no_telepon: w.no_telepon,
        role: 'warga',
      });

      const warga = await Warga.create({
        no_rumah: w.no_rumah,
        kepala_keluarga: w.name,
        no_kk: w.no_kk,
        jumlah_anggota: w.jumlah_anggota,
        status_rumah: w.status_rumah,
        is_active: true,
        user_id: user.id,
      });

      wargaUsers.push(user);
      wargaRecords.push(warga);
    }
    console.log(`   ✔ ${wargaUsers.length + 3} Users & ${wargaRecords.length} Warga dibuat`);

    // ─────────────────────────────────────────────
    // 2. IURAN MASTER  (3 iuran)
    // ─────────────────────────────────────────────
    console.log('📋 Seeding IuranMaster...');
    const iuranKebersihan = await IuranMaster.create({ nama: 'Iuran Kebersihan', nominal: 50000, periode: 'bulanan', is_active: true });
    const iuranKeamanan   = await IuranMaster.create({ nama: 'Iuran Keamanan',   nominal: 30000, periode: 'bulanan', is_active: true });
    const iuranSosial     = await IuranMaster.create({ nama: 'Iuran Sosial',     nominal: 20000, periode: 'bulanan', is_active: true });
    console.log('   ✔ 3 IuranMaster dibuat');

    // ─────────────────────────────────────────────
    // 3. WARGA IURAN  (10 warga × 3 iuran = 30 row)
    // ─────────────────────────────────────────────
    console.log('📋 Seeding WargaIuran...');
    for (const warga of wargaRecords) {
      await WargaIuran.create({ warga_id: warga.id, iuran_master_id: iuranKebersihan.id, is_excluded: false });
      await WargaIuran.create({ warga_id: warga.id, iuran_master_id: iuranKeamanan.id,   is_excluded: false });
      await WargaIuran.create({ warga_id: warga.id, iuran_master_id: iuranSosial.id,     is_excluded: false });
    }
    console.log('   ✔ 30 WargaIuran dibuat');

    // ─────────────────────────────────────────────
    // 4. TAGIHAN  (10 warga × 2 bulan = 20 tagihan)
    //    Bulan 4 & 5 tahun 2025, total 100k/tagihan
    // ─────────────────────────────────────────────
    console.log('📋 Seeding Tagihan & TagihanItem...');
    const tagihanRecords = [];
    const bulanList = [5, 6]; // Dynamic months
    const tahun = 2026;
    const totalNominal = 100000; // 50k + 30k + 20k

    for (const warga of wargaRecords) {
      for (const bulan of bulanList) {
        const t = await Tagihan.create({
          warga_id: warga.id,
          bulan,
          tahun,
          periode_mulai:   `${tahun}-${String(bulan).padStart(2, '0')}-01`,
          periode_selesai: `${tahun}-${String(bulan).padStart(2, '0')}-28`,
          total_nominal: totalNominal,
          status: 'belum_bayar',
        });

        // TagihanItem: 3 item per tagihan
        await TagihanItem.create({ tagihan_id: t.id, iuran_master_id: iuranKebersihan.id, nominal: 50000, keterangan: 'Iuran Kebersihan bulan ' + bulan });
        await TagihanItem.create({ tagihan_id: t.id, iuran_master_id: iuranKeamanan.id,   nominal: 30000, keterangan: 'Iuran Keamanan bulan ' + bulan });
        await TagihanItem.create({ tagihan_id: t.id, iuran_master_id: iuranSosial.id,     nominal: 20000, keterangan: 'Iuran Sosial bulan ' + bulan });

        tagihanRecords.push(t);
      }
    }
    console.log(`   ✔ ${tagihanRecords.length} Tagihan & ${tagihanRecords.length * 3} TagihanItem dibuat`);

    // ─────────────────────────────────────────────
    // 5. PEMBAYARAN  (10 tagihan pertama = bulan 4, semua lunas)
    //    Sisanya tetap belum_bayar (menunggak)
    // ─────────────────────────────────────────────
    console.log('📋 Seeding Pembayaran...');
    // Ambil tagihan bulan 4 saja (index genap: 0, 2, 4, 6, 8, 10, 12, 14, 16, 18)
    const tagihanBulan4 = tagihanRecords.filter((_, i) => i % 2 === 0);

    const pembayaranRecords = [];
    for (const tagihan of tagihanBulan4) {
      const p = await Pembayaran.create({
        tagihan_id:   tagihan.id,
        dicatat_oleh: userBendahara.id,
        metode:       'manual',
        jumlah_bayar: 100000,
        tanggal_bayar: '2026-05-10',
        reference_id: `MNL-${tagihan.id}-APR2025`,
        status:       'success',
        bukti_url:    `https://storage.wargaklik.com/bukti/manual-apr2025-${tagihan.id}.jpg`,
        catatan:      'Pembayaran tunai diterima oleh bendahara RT',
      });

      // Tandai tagihan sebagai lunas
      await tagihan.update({ status: 'lunas' });

      pembayaranRecords.push(p);
    }
    console.log(`   ✔ ${pembayaranRecords.length} Pembayaran (bulan April) dibuat`);

    // ─────────────────────────────────────────────
    // 6. KAS HARIAN  (10 pemasukan dari pembayaran + 5 pengeluaran)
    // ─────────────────────────────────────────────
    console.log('📋 Seeding KasHarian...');
    for (const p of pembayaranRecords) {
      await KasHarian.create({
        pembayaran_id: p.id,
        tanggal:       '2026-05-10',
        jenis:         'masuk',
        kategori:      'Iuran Warga',
        keterangan:    'Pembayaran iuran bulan April 2025',
        nominal:       100000,
        bukti_url:     `https://storage.wargaklik.com/bukti/kas-masuk-${p.id}.jpg`,
        dicatat_oleh:  userBendahara.id,
      });
    }

    const pengeluaranList = [
      { tanggal: '2026-05-12', kategori: 'Operasional', keterangan: 'Pembelian alat kebersihan RT',  nominal: 150000, bukti: 'nota-kebersihan-apr2025.jpg' },
      { tanggal: '2026-05-15', kategori: 'Keamanan',    keterangan: 'Bayar jasa satpam bulan April', nominal: 200000, bukti: 'nota-satpam-apr2025.jpg' },
      { tanggal: '2026-05-20', kategori: 'Sosial',      keterangan: 'Santunan warga sakit',           nominal: 100000, bukti: 'nota-santunan-apr2025.jpg' },
      { tanggal: '2026-05-25', kategori: 'Operasional', keterangan: 'Pembelian ATK sekretariat',      nominal: 75000,  bukti: 'nota-atk-apr2025.jpg' },
      { tanggal: '2026-05-28', kategori: 'Sosial',      keterangan: 'Acara gotong royong',             nominal: 250000, bukti: 'nota-gotongroyong-apr2025.jpg' },
    ];

    // Pengeluaran kas: pembayaran_id diisi dengan pembayaran pertama sebagai referensi kas terkait
    for (let i = 0; i < pengeluaranList.length; i++) {
      const k = pengeluaranList[i];
      await KasHarian.create({
        pembayaran_id: pembayaranRecords[i % pembayaranRecords.length].id,
        tanggal:       k.tanggal,
        jenis:         'keluar',
        kategori:      k.kategori,
        keterangan:    k.keterangan,
        nominal:       k.nominal,
        bukti_url:     `https://storage.wargaklik.com/bukti/${k.bukti}`,
        dicatat_oleh:  userBendahara.id,
      });
    }
    console.log(`   ✔ ${pembayaranRecords.length + pengeluaranList.length} KasHarian dibuat`);

    // ─────────────────────────────────────────────
    // 7. PENGUMUMAN  (10 pengumuman)
    // ─────────────────────────────────────────────
    console.log('📋 Seeding Pengumuman...');
    const pengumumanData = [
      { title: 'Jadwal Kerja Bakti Bulan April',          content: 'Warga diharapkan hadir pada kerja bakti tanggal 20 April 2025 pukul 07.00 WIB di lapangan RT.', type: 'penting', target_role: 'semua',    author_id: userRT.id,         is_published: true },
      { title: 'Tagihan Iuran Bulan Mei Telah Diterbitkan', content: 'Tagihan iuran bulan Mei 2025 sudah dapat dicek melalui aplikasi. Harap segera dilunasi sebelum tanggal 10.', type: 'info',    target_role: 'warga',    author_id: userBendahara.id,  is_published: true },
      { title: 'Peringatan Keamanan Lingkungan',           content: 'Harap selalu kunci kendaraan dan rumah. Beberapa laporan kehilangan diterima minggu ini.', type: 'darurat', target_role: 'semua',    author_id: userRT.id,         is_published: true },
      { title: 'Rapat Warga Rutin Bulan Mei',              content: 'Rapat warga akan dilaksanakan pada 5 Mei 2025 pukul 19.30 di balai RT. Kehadiran sangat diharapkan.', type: 'penting', target_role: 'semua',    author_id: userSekretaris.id, is_published: true },
      { title: 'Perbaikan Jalan Lingkungan',               content: 'Perbaikan jalan di gang B akan dilaksanakan tanggal 1-3 Mei 2025. Harap berhati-hati.', type: 'info',    target_role: 'semua',    author_id: userRT.id,         is_published: true },
      { title: 'Laporan Keuangan April Telah Disetujui',   content: 'Laporan keuangan bulan April 2025 telah disetujui oleh Ketua RT. Silakan lihat di menu laporan.', type: 'info',    target_role: 'semua',    author_id: userBendahara.id,  is_published: true },
      { title: 'Rekrutmen Anggota Siskamling',             content: 'Dibuka rekrutmen anggota siskamling baru. Daftar ke sekretariat RT atau hubungi WhatsApp RT.', type: 'info',    target_role: 'warga',    author_id: userRT.id,         is_published: true },
      { title: 'Info Pemadaman Listrik',                   content: 'PLN akan melakukan pemadaman listrik pada 15 Mei 2025 pukul 08.00–12.00 untuk pemeliharaan jaringan.', type: 'darurat', target_role: 'semua',    author_id: userSekretaris.id, is_published: true },
      { title: 'Penerimaan PKH Tahap 2',                   content: 'Bagi warga penerima PKH, pencairan tahap 2 dijadwalkan minggu pertama Juni 2025.', type: 'info',    target_role: 'warga',    author_id: userSekretaris.id, is_published: true },
      { title: 'Pelatihan UMKM Warga RT',                  content: 'Dinas Koperasi akan mengadakan pelatihan UMKM gratis untuk warga RT kita. Pendaftaran paling lambat 20 Mei.', type: 'info',    target_role: 'semua',    author_id: userRT.id,         is_published: false },
    ];

    for (const p of pengumumanData) {
      await Pengumuman.create(p);
    }
    console.log(`   ✔ ${pengumumanData.length} Pengumuman dibuat`);

    // ─────────────────────────────────────────────
    // 8. NOTIFIKASI  (notifikasi untuk semua user termasuk pengurus)
    // ─────────────────────────────────────────────
    console.log('📋 Seeding Notifikasi...');
    // ref_id mengacu ke id record terkait (pembayaran/tagihan/pengumuman)
    const notifData = [
      // Notifikasi untuk warga
      { user_id: wargaUsers[0].id, title: 'Tagihan April Telah Lunas',    message: 'Pembayaran iuran April 2025 Anda berhasil dikonfirmasi. Terima kasih!',              type: 'pembayaran', is_read: true,  ref_id: pembayaranRecords[0].id, ref_type: 'pembayaran' },
      { user_id: wargaUsers[1].id, title: 'Tagihan April Telah Lunas',    message: 'Pembayaran iuran April 2025 Anda berhasil dikonfirmasi. Terima kasih!',              type: 'pembayaran', is_read: true,  ref_id: pembayaranRecords[1].id, ref_type: 'pembayaran' },
      { user_id: wargaUsers[2].id, title: 'Tagihan April Telah Lunas',    message: 'Pembayaran iuran April 2025 Anda berhasil dikonfirmasi. Terima kasih!',              type: 'pembayaran', is_read: false, ref_id: pembayaranRecords[2].id, ref_type: 'pembayaran' },
      { user_id: wargaUsers[3].id, title: 'Tagihan Mei Belum Dibayar',    message: 'Anda memiliki tagihan bulan Mei 2025 sebesar Rp100.000 yang belum dilunasi.',      type: 'tagihan',    is_read: false, ref_id: tagihanRecords[7].id,    ref_type: 'tagihan' },
      { user_id: wargaUsers[4].id, title: 'Tagihan Mei Belum Dibayar',    message: 'Anda memiliki tagihan bulan Mei 2025 sebesar Rp100.000 yang belum dilunasi.',      type: 'tagihan',    is_read: false, ref_id: tagihanRecords[9].id,    ref_type: 'tagihan' },
      { user_id: wargaUsers[5].id, title: 'Pengumuman Baru: Kerja Bakti', message: 'Ada pengumuman baru dari RT: Jadwal Kerja Bakti Bulan April.',                      type: 'pengumuman', is_read: false, ref_id: 1,                       ref_type: 'pengumuman' },
      { user_id: wargaUsers[6].id, title: 'Pengumuman Baru: Rapat Warga', message: 'Rapat warga rutin akan dilaksanakan pada 5 Mei 2025.',                               type: 'pengumuman', is_read: true,  ref_id: 4,                       ref_type: 'pengumuman' },
      { user_id: wargaUsers[7].id, title: 'Sistem: Akun Berhasil Dibuat', message: 'Selamat datang di WargaKlik! Akun Anda telah berhasil dibuat.',                      type: 'sistem',     is_read: true,  ref_id: wargaUsers[7].id,        ref_type: 'user' },
      { user_id: wargaUsers[8].id, title: 'Tagihan April Telah Lunas',    message: 'Pembayaran iuran April 2025 Anda berhasil dikonfirmasi. Terima kasih!',              type: 'pembayaran', is_read: false, ref_id: pembayaranRecords[8].id, ref_type: 'pembayaran' },
      { user_id: wargaUsers[9].id, title: 'Info Pemadaman Listrik',       message: 'PLN akan melakukan pemadaman listrik pada 15 Mei 2025 pukul 08.00 hingga 12.00.',   type: 'pengumuman', is_read: false, ref_id: 8,                       ref_type: 'pengumuman' },

      // Notifikasi untuk RT
      { user_id: userRT.id, title: 'Laporan April Menunggu Persetujuan',      message: 'Laporan keuangan bulan April 2025 telah dibuat oleh bendahara dan menunggu persetujuan Anda.',        type: 'sistem',     is_read: false, ref_id: 4,  ref_type: 'laporan' },
      { user_id: userRT.id, title: 'Warga Baru Terdaftar',                    message: '10 warga baru telah berhasil didaftarkan ke sistem WargaKlik.',                                         type: 'sistem',     is_read: true,  ref_id: 1,  ref_type: 'warga' },
      { user_id: userRT.id, title: 'Pengumuman Kerja Bakti Dipublikasikan',   message: 'Pengumuman kerja bakti tanggal 20 April 2025 berhasil diterbitkan ke seluruh warga.',                   type: 'pengumuman', is_read: true,  ref_id: 1,  ref_type: 'pengumuman' },
      { user_id: userRT.id, title: 'Tunggakan Iuran Bulan Mei',               message: 'Terdapat 10 warga yang belum melunasi iuran bulan Mei 2025. Harap segera ditindaklanjuti.',             type: 'tagihan',    is_read: false, ref_id: 5,  ref_type: 'laporan' },
      { user_id: userRT.id, title: 'Laporan Tahunan 2024 Telah Disetujui',    message: 'Anda telah menyetujui laporan tahunan 2024 pada 15 Januari 2025.',                                      type: 'sistem',     is_read: true,  ref_id: 7,  ref_type: 'laporan' },
      { user_id: userRT.id, title: 'Kas Masuk April: Rp1.000.000',            message: 'Total kas masuk bulan April 2025 dari iuran warga sebesar Rp1.000.000 telah dicatat.',                   type: 'pembayaran', is_read: true,  ref_id: 1,  ref_type: 'pembayaran' },
      { user_id: userRT.id, title: 'Pengumuman Rapat Warga Dipublikasikan',   message: 'Pengumuman rapat warga tanggal 5 Mei 2025 berhasil diterbitkan.',                                        type: 'pengumuman', is_read: false, ref_id: 4,  ref_type: 'pengumuman' },
      { user_id: userRT.id, title: 'Laporan Tunggakan Q1 Telah Disetujui',    message: 'Laporan tunggakan Q1 2025 dari sekretaris telah Anda setujui.',                                          type: 'sistem',     is_read: true,  ref_id: 8,  ref_type: 'laporan' },
      { user_id: userRT.id, title: 'Peringatan: Warga Menunggak 2 Bulan',     message: 'Ada 5 warga yang menunggak iuran selama 2 bulan berturut-turut. Pertimbangkan tindak lanjut.',           type: 'tagihan',    is_read: false, ref_id: 10, ref_type: 'laporan' },
      { user_id: userRT.id, title: 'Sistem WargaKlik Aktif',                  message: 'Selamat! Sistem WargaKlik RT Anda telah aktif dan siap digunakan oleh seluruh warga.',                   type: 'sistem',     is_read: true,  ref_id: userRT.id, ref_type: 'user' },

      // Notifikasi untuk Bendahara
      { user_id: userBendahara.id, title: 'Pembayaran Manual Budi Santoso',   message: 'Pembayaran iuran April 2025 atas nama Budi Santoso (A-01) sebesar Rp100.000 berhasil dicatat.',         type: 'pembayaran', is_read: true,  ref_id: pembayaranRecords[0].id, ref_type: 'pembayaran' },
      { user_id: userBendahara.id, title: 'Kas Keluar: Pembelian ATK',        message: 'Pengeluaran kas untuk pembelian ATK sekretariat sebesar Rp75.000 telah dicatat pada 25 April 2025.',     type: 'sistem',     is_read: true,  ref_id: 14, ref_type: 'kas_harian' },
      { user_id: userBendahara.id, title: 'Laporan April Siap Dikirim ke RT', message: 'Laporan keuangan April 2025 telah selesai dibuat dan siap untuk dikirim ke RT untuk disetujui.',         type: 'sistem',     is_read: false, ref_id: 4,  ref_type: 'laporan' },
      { user_id: userBendahara.id, title: 'Pengingat: Buat Laporan Mei',      message: 'Bulan Mei 2025 telah berakhir. Harap segera membuat laporan keuangan bulanan.',                           type: 'sistem',     is_read: false, ref_id: 5,  ref_type: 'laporan' },
      { user_id: userBendahara.id, title: 'Total Iuran April Terkumpul',      message: '10 dari 10 warga telah membayar iuran bulan April 2025. Total terkumpul: Rp1.000.000.',                  type: 'pembayaran', is_read: true,  ref_id: pembayaranRecords[9].id, ref_type: 'pembayaran' },

      // Notifikasi untuk Sekretaris
      { user_id: userSekretaris.id, title: 'Pengumuman Baru Dipublikasikan',  message: 'Pengumuman info pemadaman listrik PLN 15 Mei 2025 berhasil diterbitkan ke seluruh warga.',              type: 'pengumuman', is_read: true,  ref_id: 8,  ref_type: 'pengumuman' },
      { user_id: userSekretaris.id, title: 'Laporan Tunggakan Q1 Disetujui',  message: 'Laporan tunggakan Q1 2025 yang Anda buat telah disetujui oleh Ketua RT.',                                type: 'sistem',     is_read: true,  ref_id: 8,  ref_type: 'laporan' },
      { user_id: userSekretaris.id, title: 'Rapat Warga 5 Mei Dikonfirmasi',  message: 'Pengumuman rapat warga rutin 5 Mei 2025 telah dipublikasikan. Mohon siapkan notulensi.',                  type: 'pengumuman', is_read: false, ref_id: 4,  ref_type: 'pengumuman' },
      { user_id: userSekretaris.id, title: 'Data Warga Berhasil Diperbarui',  message: '10 data warga aktif telah tersinkronisasi dengan sistem. Semua informasi sudah terkini.',                 type: 'sistem',     is_read: true,  ref_id: 1,  ref_type: 'warga' },
      { user_id: userSekretaris.id, title: 'Pengingat: Buat Laporan Tunggakan', message: 'Harap segera membuat laporan data tunggakan iuran bulan April 2025 untuk dilaporkan ke RT.',           type: 'tagihan',    is_read: false, ref_id: 10, ref_type: 'laporan' },
    ];

    for (const n of notifData) {
      await Notifikasi.create(n);
    }
    console.log(`   ✔ ${notifData.length} Notifikasi dibuat`);

    // ─────────────────────────────────────────────
    // 9. LAPORAN (Di-comment agar bisa digenerate dari UI & menghindari error unduhan file lokal)
    // ─────────────────────────────────────────────
    // console.log('📋 Seeding Laporan...');
    // const pdfService = require('../services/pdf.service');
    // const fs = require('fs');
    // const path = require('path');
    // const uploadsDir = path.join(__dirname, '../../uploads');
    // if (!fs.existsSync(uploadsDir)) {
    //   fs.mkdirSync(uploadsDir, { recursive: true });
    // }

    // const nDate = new Date();
    // const cM = nDate.getMonth() + 1;
    // const cY = nDate.getFullYear();
    // const pDate = new Date(cY, nDate.getMonth() - 1, 1);
    // const pM = pDate.getMonth() + 1;
    // const pY = pDate.getFullYear();

    // const urlPrevBulanan = await pdfService.generateLaporanBulanan(pM, pY);
    // const urlCurrBulanan = await pdfService.generateLaporanBulanan(cM, cY);
    // const urlTahunan = await pdfService.generateLaporanTahunan(cY);

    // const laporanData = [
    //   { file_url: urlPrevBulanan, bulan: pM,  tahun: pY, jenis: 'bulanan',   status: 'approved', komentar: 'Laporan bulan lalu disetujui tanpa catatan.',         pembuat_id: userBendahara.id,  penyetuju_id: userRT.id, disetujui_at: new Date() },
    //   { file_url: urlCurrBulanan, bulan: cM,  tahun: cY, jenis: 'bulanan',   status: 'approved', komentar: 'Laporan bulan ini disetujui.', pembuat_id: userBendahara.id,  penyetuju_id: userRT.id, disetujui_at: new Date() },
    //   { file_url: urlTahunan,     bulan: 12,     tahun: cY, jenis: 'tahunan',   status: 'approved', komentar: 'Laporan tahunan.',         pembuat_id: userBendahara.id,  penyetuju_id: userRT.id, disetujui_at: new Date() },
    // ];

    // for (const l of laporanData) {
    //   await Laporan.create(l);
    // }
    // console.log(`   ✔ ${laporanData.length} Laporan dibuat`);

    // ─────────────────────────────────────────────
    // RINGKASAN
    // ─────────────────────────────────────────────
    console.log('\n══════════════════════════════════════════════');
    console.log('✅  SEED SELESAI! Ringkasan data:');
    console.log('══════════════════════════════════════════════');
    console.log(`  users          : ${wargaUsers.length + 3}`);
    console.log(`  warga          : ${wargaRecords.length}`);
    console.log('  iuran_master   : 3');
    console.log('  warga_iuran    : 30');
    console.log(`  tagihan        : ${tagihanRecords.length}`);
    console.log(`  tagihan_items  : ${tagihanRecords.length * 3}`);
    console.log(`  pembayaran     : ${pembayaranRecords.length}`);
    console.log(`  kas_harian     : ${pembayaranRecords.length + pengeluaranList.length}`);
    console.log(`  pengumuman     : ${pengumumanData.length}`);
    console.log(`  notifikasi     : ${notifData.length} (10 warga + 10 RT + 5 bendahara + 5 sekretaris)`);
    console.log(`  laporan        : 0 (Di-comment)`);
    console.log('══════════════════════════════════════════════');
    console.log('\n🔑  Kredensial login:');
    console.log(`  RT            : ${emailRT} (Sandi: SandiRT123!)`);
    console.log(`  Bendahara     : ${emailBendahara} (Sandi: SandiBendahara456!)`);
    console.log(`  Sekretaris    : ${emailSekretaris} (Sandi: SandiSekretaris789!)`);
    console.log(`  Warga (contoh): ${wargaRawData[0].email} (Sandi: SandiWarga321!)`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed gagal:', error);
    process.exit(1);
  }
}

seed();
