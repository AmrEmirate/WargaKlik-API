require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const bcrypt = require('bcryptjs');
const { sequelize, User, Warga, IuranMaster } = require('../models');

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('Database connected');

    // Sync database
    await sequelize.sync({ force: true });
    console.log('Database synced (force)');

    const hashedPassword = await bcrypt.hash('password123', 10);

    // Create admin users
    const userRT = await User.create({
      name: 'Pak RT',
      email: 'rt@iuranrt.com',
      password: hashedPassword,
      no_telepon: '081234567890',
      role: 'rt'
    });

    const userBendahara = await User.create({
      name: 'Bendahara RT',
      email: 'bendahara@iuranrt.com',
      password: hashedPassword,
      no_telepon: '081234567891',
      role: 'bendahara'
    });

    const userSekretaris = await User.create({
      name: 'Sekretaris RT',
      email: 'sekretaris@iuranrt.com',
      password: hashedPassword,
      no_telepon: '081234567892',
      role: 'sekretaris'
    });

    // Create warga users + warga data
    const wargaData = [
      { name: 'Budi Santoso', email: 'budi@email.com', no_telepon: '081111111111', no_rumah: 'A-01', no_kk: '3501010101010001', jumlah_anggota: 4, status_rumah: 'tetap' },
      { name: 'Siti Rahayu', email: 'siti@email.com', no_telepon: '081222222222', no_rumah: 'A-02', no_kk: '3501010101010002', jumlah_anggota: 3, status_rumah: 'tetap' },
      { name: 'Ahmad Fauzi', email: 'ahmad@email.com', no_telepon: '081333333333', no_rumah: 'A-03', no_kk: '3501010101010003', jumlah_anggota: 5, status_rumah: 'kontrak' },
      { name: 'Dewi Lestari', email: 'dewi@email.com', no_telepon: '081444444444', no_rumah: 'B-01', no_kk: '3501010101010004', jumlah_anggota: 2, status_rumah: 'tetap' },
      { name: 'Rudi Hartono', email: 'rudi@email.com', no_telepon: '081555555555', no_rumah: 'B-02', no_kk: '3501010101010005', jumlah_anggota: 4, status_rumah: 'kontrak' },
    ];

    for (const w of wargaData) {
      const user = await User.create({
        name: w.name,
        email: w.email,
        password: hashedPassword,
        no_telepon: w.no_telepon,
        role: 'warga'
      });

      await Warga.create({
        no_rumah: w.no_rumah,
        kepala_keluarga: w.name,
        no_kk: w.no_kk,
        jumlah_anggota: w.jumlah_anggota,
        status_rumah: w.status_rumah,
        is_active: true,
        user_id: user.id
      });
    }

    // Create iuran master
    await IuranMaster.create({ nama: 'Iuran Kebersihan', nominal: 50000, periode: 'bulanan', is_active: true });
    await IuranMaster.create({ nama: 'Iuran Keamanan', nominal: 30000, periode: 'bulanan', is_active: true });
    await IuranMaster.create({ nama: 'Iuran Sosial', nominal: 20000, periode: 'bulanan', is_active: true });

    console.log('Seed completed successfully');
    console.log('');
    console.log('Login credentials (all passwords: password123):');
    console.log('  RT:         rt@iuranrt.com');
    console.log('  Bendahara:  bendahara@iuranrt.com');
    console.log('  Sekretaris: sekretaris@iuranrt.com');
    console.log('  Warga:      budi@email.com, siti@email.com, etc.');

    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

seed();
