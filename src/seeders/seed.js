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

    const hashedPassword = await bcrypt.hash('password123', 10);

    // ─────────────────────────────────────────────
    // 1. USERS  (3 pengurus + 10 warga = 13 user)
    // ─────────────────────────────────────────────
    console.log('📋 Seeding Users...');

    const userRT = await User.create({
      name: 'Bapak Suparman',
      email: 'rt@wargaklik.com',
      password: hashedPassword,
      no_telepon: '081234567890',
      role: 'rt',
    });

    const userBendahara = await User.create({
      name: 'Ibu Hartini',
      email: 'bendahara@wargaklik.com',
      password: hashedPassword,
      no_telepon: '081234567891',
      role: 'bendahara',
    });

    const userSekretaris = await User.create({
      name: 'Pak Gunawan',
      email: 'sekretaris@wargaklik.com',
      password: hashedPassword,
      no_telepon: '081234567892',
      role: 'sekretaris',
    });

    const wargaRawData = [
      { name: 'Budi Santoso',     email: 'budi@email.com',     no_telepon: '082111111111', no_rumah: 'A-01', no_kk: '3501010101010001', jumlah_anggota: 4, status_rumah: 'tetap' },
      { name: 'Siti Rahayu',      email: 'siti@email.com',     no_telepon: '082222222222', no_rumah: 'A-02', no_kk: '3501010101010002', jumlah_anggota: 3, status_rumah: 'tetap' },
      { name: 'Ahmad Fauzi',      email: 'ahmad@email.com',    no_telepon: '082333333333', no_rumah: 'A-03', no_kk: '3501010101010003', jumlah_anggota: 5, status_rumah: 'kontrak' },
      { name: 'Dewi Lestari',     email: 'dewi@email.com',     no_telepon: '082444444444', no_rumah: 'B-01', no_kk: '3501010101010004', jumlah_anggota: 2, status_rumah: 'tetap' },
      { name: 'Rudi Hartono',     email: 'rudi@email.com',     no_telepon: '082555555555', no_rumah: 'B-02', no_kk: '3501010101010005', jumlah_anggota: 4, status_rumah: 'kontrak' },
      { name: 'Ani Kusuma',       email: 'ani@email.com',      no_telepon: '082666666666', no_rumah: 'B-03', no_kk: '3501010101010006', jumlah_anggota: 3, status_rumah: 'tetap' },
      { name: 'Hendra Wijaya',    email: 'hendra@email.com',   no_telepon: '082777777777', no_rumah: 'C-01', no_kk: '3501010101010007', jumlah_anggota: 6, status_rumah: 'tetap' },
      { name: 'Rina Marlina',     email: 'rina@email.com',     no_telepon: '082888888888', no_rumah: 'C-02', no_kk: '3501010101010008', jumlah_anggota: 2, status_rumah: 'kontrak' },
      { name: 'Joko Prasetyo',    email: 'joko@email.com',     no_telepon: '082999999999', no_rumah: 'C-03', no_kk: '3501010101010009', jumlah_anggota: 5, status_rumah: 'tetap' },
      { name: 'Yuni Astuti',      email: 'yuni@email.com',     no_telepon: '081000000000', no_rumah: 'D-01', no_kk: '3501010101010010', jumlah_anggota: 3, status_rumah: 'tetap' },
    ];

    const wargaUsers = [];
    const wargaRecords = [];

    for (const w of wargaRawData) {
      const user = await User.create({
        name: w.name,
        email: w.email,
        password: hashedPassword,
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
    const bulanList = [4, 5]; // April & Mei 2025
    const tahun = 2025;
    const totalNominal = 100000; // 50k + 30k + 20k

    for (const warga of wargaRecords) {
      for (const bulan of bulanList) {
        const t = await Tagihan.create({
          warga_id: warga.id,
          bulan,
          tahun,
          periode_mulai:   `${tahun}-0${bulan}-01`,
          periode_selesai: `${tahun}-0${bulan}-${bulan === 4 ? '30' : '31'}`,
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
        tanggal_bayar: '2025-04-10',
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
        tanggal:       '2025-04-10',
        jenis:         'masuk',
        kategori:      'Iuran Warga',
        keterangan:    'Pembayaran iuran bulan April 2025',
        nominal:       100000,
        bukti_url:     `https://storage.wargaklik.com/bukti/kas-masuk-${p.id}.jpg`,
        dicatat_oleh:  userBendahara.id,
      });
    }

    const pengeluaranList = [
      { tanggal: '2025-04-12', kategori: 'Operasional', keterangan: 'Pembelian alat kebersihan RT',  nominal: 150000, bukti: 'nota-kebersihan-apr2025.jpg' },
      { tanggal: '2025-04-15', kategori: 'Keamanan',    keterangan: 'Bayar jasa satpam bulan April', nominal: 200000, bukti: 'nota-satpam-apr2025.jpg' },
      { tanggal: '2025-04-20', kategori: 'Sosial',      keterangan: 'Santunan warga sakit',           nominal: 100000, bukti: 'nota-santunan-apr2025.jpg' },
      { tanggal: '2025-04-25', kategori: 'Operasional', keterangan: 'Pembelian ATK sekretariat',      nominal: 75000,  bukti: 'nota-atk-apr2025.jpg' },
      { tanggal: '2025-04-30', kategori: 'Sosial',      keterangan: 'Acara gotong royong',             nominal: 250000, bukti: 'nota-gotongroyong-apr2025.jpg' },
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
    // 9. LAPORAN  (10 laporan bulanan & tahunan)
    // ─────────────────────────────────────────────
    console.log('📋 Seeding Laporan...');
    const laporanData = [
      { file_url: 'https://storage.wargaklik.com/laporan/bulanan-jan-2025.pdf',      bulan: 1,  tahun: 2025, jenis: 'bulanan',   status: 'approved', komentar: 'Laporan Januari 2025 disetujui tanpa catatan.',         pembuat_id: userBendahara.id,  penyetuju_id: userRT.id, disetujui_at: new Date('2025-02-05') },
      { file_url: 'https://storage.wargaklik.com/laporan/bulanan-feb-2025.pdf',      bulan: 2,  tahun: 2025, jenis: 'bulanan',   status: 'approved', komentar: 'Laporan Februari 2025 disetujui tanpa catatan.',        pembuat_id: userBendahara.id,  penyetuju_id: userRT.id, disetujui_at: new Date('2025-03-05') },
      { file_url: 'https://storage.wargaklik.com/laporan/bulanan-mar-2025.pdf',      bulan: 3,  tahun: 2025, jenis: 'bulanan',   status: 'approved', komentar: 'Laporan Maret 2025 disetujui tanpa catatan.',           pembuat_id: userBendahara.id,  penyetuju_id: userRT.id, disetujui_at: new Date('2025-04-05') },
      { file_url: 'https://storage.wargaklik.com/laporan/bulanan-apr-2025.pdf',      bulan: 4,  tahun: 2025, jenis: 'bulanan',   status: 'approved', komentar: 'Laporan April 2025 disetujui, surplus Rp475.000.',      pembuat_id: userBendahara.id,  penyetuju_id: userRT.id, disetujui_at: new Date('2025-05-05') },
      { file_url: 'https://storage.wargaklik.com/laporan/bulanan-mei-2025.pdf',      bulan: 5,  tahun: 2025, jenis: 'bulanan',   status: 'draft',    komentar: 'Laporan bulan Mei dalam proses verifikasi bendahara.',  pembuat_id: userBendahara.id,  penyetuju_id: userRT.id, disetujui_at: new Date('2025-06-01') },
      { file_url: 'https://storage.wargaklik.com/laporan/bulanan-jun-2025.pdf',      bulan: 6,  tahun: 2025, jenis: 'bulanan',   status: 'draft',    komentar: 'Laporan bulan Juni baru dibuat, menunggu persetujuan.', pembuat_id: userBendahara.id,  penyetuju_id: userRT.id, disetujui_at: new Date('2025-07-01') },
      { file_url: 'https://storage.wargaklik.com/laporan/tahunan-2024.pdf',          bulan: 12, tahun: 2024, jenis: 'tahunan',   status: 'approved', komentar: 'Laporan Tahunan 2024 disetujui oleh Ketua RT.',         pembuat_id: userBendahara.id,  penyetuju_id: userRT.id, disetujui_at: new Date('2025-01-15') },
      { file_url: 'https://storage.wargaklik.com/laporan/tunggakan-q1-2025.pdf',     bulan: 3,  tahun: 2025, jenis: 'tunggakan', status: 'approved', komentar: 'Laporan tunggakan Q1 2025 disetujui, 5 warga menunggak.', pembuat_id: userSekretaris.id, penyetuju_id: userRT.id, disetujui_at: new Date('2025-04-10') },
      { file_url: 'https://storage.wargaklik.com/laporan/tahunan-2025-draft.pdf',    bulan: 12, tahun: 2025, jenis: 'tahunan',   status: 'draft',    komentar: 'Laporan tahunan 2025 sedang disiapkan oleh bendahara.', pembuat_id: userBendahara.id,  penyetuju_id: userRT.id, disetujui_at: new Date('2026-01-10') },
      { file_url: 'https://storage.wargaklik.com/laporan/tunggakan-apr-2025.pdf',    bulan: 4,  tahun: 2025, jenis: 'tunggakan', status: 'draft',    komentar: 'Laporan tunggakan April 2025 menunggu verifikasi data.', pembuat_id: userSekretaris.id, penyetuju_id: userRT.id, disetujui_at: new Date('2025-05-15') },
    ];

    for (const l of laporanData) {
      await Laporan.create(l);
    }
    console.log(`   ✔ ${laporanData.length} Laporan dibuat`);

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
    console.log(`  laporan        : ${laporanData.length}`);
    console.log('══════════════════════════════════════════════');
    console.log('\n🔑  Kredensial login (semua password: password123):');
    console.log('  RT            : rt@wargaklik.com');
    console.log('  Bendahara     : bendahara@wargaklik.com');
    console.log('  Sekretaris    : sekretaris@wargaklik.com');
    console.log('  Warga (contoh): budi@email.com, siti@email.com, ..., yuni@email.com');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed gagal:', error);
    process.exit(1);
  }
}

seed();
