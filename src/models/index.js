const sequelize = require('../config/database');
const User = require('./User');
const Warga = require('./Warga');
const IuranMaster = require('./IuranMaster');
const Tagihan = require('./Tagihan');
const TagihanItem = require('./TagihanItem');
const Pembayaran = require('./Pembayaran');
const KasHarian = require('./KasHarian');
const Pengumuman = require('./Pengumuman');
const Notifikasi = require('./Notifikasi');
const Laporan = require('./Laporan');
const WargaIuran = require('./WargaIuran');
const RefreshToken = require('./RefreshToken');

// ==================== ASSOCIATIONS ====================

// User 1:1 Warga
User.hasOne(Warga, { foreignKey: 'user_id', as: 'warga' });
Warga.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User 1:N Pengumuman
User.hasMany(Pengumuman, { foreignKey: 'author_id', as: 'pengumuman' });
Pengumuman.belongsTo(User, { foreignKey: 'author_id', as: 'author' });

// User 1:N Notifikasi
User.hasMany(Notifikasi, { foreignKey: 'user_id', as: 'notifikasi' });
Notifikasi.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User 1:N Pembayaran (dicatat_oleh)
User.hasMany(Pembayaran, { foreignKey: 'dicatat_oleh', as: 'pembayaran_dicatat' });
Pembayaran.belongsTo(User, { foreignKey: 'dicatat_oleh', as: 'pencatat' });

// User 1:N KasHarian (dicatat_oleh)
User.hasMany(KasHarian, { foreignKey: 'dicatat_oleh', as: 'kas_dicatat' });
KasHarian.belongsTo(User, { foreignKey: 'dicatat_oleh', as: 'pencatat' });

// User 1:N Laporan (pembuat)
User.hasMany(Laporan, { foreignKey: 'pembuat_id', as: 'laporan_dibuat' });
Laporan.belongsTo(User, { foreignKey: 'pembuat_id', as: 'pembuat' });

// User 1:N Laporan (penyetuju)
User.hasMany(Laporan, { foreignKey: 'penyetuju_id', as: 'laporan_disetujui' });
Laporan.belongsTo(User, { foreignKey: 'penyetuju_id', as: 'penyetuju' });

// Warga 1:N Tagihan
Warga.hasMany(Tagihan, { foreignKey: 'warga_id', as: 'tagihan' });
Tagihan.belongsTo(Warga, { foreignKey: 'warga_id', as: 'warga' });

// Tagihan 1:N TagihanItem
Tagihan.hasMany(TagihanItem, { foreignKey: 'tagihan_id', as: 'items' });
TagihanItem.belongsTo(Tagihan, { foreignKey: 'tagihan_id', as: 'tagihan' });

// Tagihan 1:N Pembayaran
Tagihan.hasMany(Pembayaran, { foreignKey: 'tagihan_id', as: 'pembayaran' });
Pembayaran.belongsTo(Tagihan, { foreignKey: 'tagihan_id', as: 'tagihan' });

// TagihanItem N:1 IuranMaster
IuranMaster.hasMany(TagihanItem, { foreignKey: 'iuran_master_id', as: 'tagihan_items' });
TagihanItem.belongsTo(IuranMaster, { foreignKey: 'iuran_master_id', as: 'iuran_master' });

// Pembayaran 1:N KasHarian
Pembayaran.hasMany(KasHarian, { foreignKey: 'pembayaran_id', as: 'kas_entries' });
KasHarian.belongsTo(Pembayaran, { foreignKey: 'pembayaran_id', as: 'pembayaran' });

// Warga N:M IuranMaster via WargaIuran (custom nominal per warga)
Warga.hasMany(WargaIuran, { foreignKey: 'warga_id', as: 'iuran_custom' });
WargaIuran.belongsTo(Warga, { foreignKey: 'warga_id', as: 'warga' });
IuranMaster.hasMany(WargaIuran, { foreignKey: 'iuran_master_id', as: 'warga_overrides' });
WargaIuran.belongsTo(IuranMaster, { foreignKey: 'iuran_master_id', as: 'iuran_master' });

// User 1:N RefreshToken
User.hasMany(RefreshToken, { foreignKey: 'user_id', as: 'refresh_tokens' });
RefreshToken.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

module.exports = {
  sequelize,
  User,
  Warga,
  IuranMaster,
  Tagihan,
  TagihanItem,
  Pembayaran,
  KasHarian,
  Pengumuman,
  Notifikasi,
  Laporan,
  WargaIuran,
  RefreshToken
};
