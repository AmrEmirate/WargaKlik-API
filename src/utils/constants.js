/**
 * Application constants
 */
const ROLES = {
  WARGA: 'warga',
  SEKRETARIS: 'sekretaris',
  BENDAHARA: 'bendahara',
  RT: 'rt',
  WAKIL_RT: 'wakil_rt'
};

const TAGIHAN_STATUS = {
  BELUM_BAYAR: 'belum_bayar',
  LUNAS: 'lunas'
};

const PEMBAYARAN_STATUS = {
  PENDING: 'pending',
  SUCCESS: 'success',
  FAILED: 'failed',
  EXPIRED: 'expired'
};

const PEMBAYARAN_METODE = {
  MIDTRANS: 'midtrans',
  MANUAL: 'manual'
};

const KAS_JENIS = {
  MASUK: 'masuk',
  KELUAR: 'keluar'
};

const PENGUMUMAN_TYPE = {
  INFO: 'info',
  PENTING: 'penting',
  DARURAT: 'darurat'
};

const NOTIFIKASI_TYPE = {
  TAGIHAN: 'tagihan',
  PEMBAYARAN: 'pembayaran',
  PENGUMUMAN: 'pengumuman',
  SISTEM: 'sistem'
};

const LAPORAN_STATUS = {
  DRAFT: 'draft',
  APPROVED: 'approved'
};

const LAPORAN_JENIS = {
  BULANAN: 'bulanan',
  TAHUNAN: 'tahunan'
};

const PERIODE = {
  BULANAN: 'bulanan',
  TAHUNAN: 'tahunan'
};

const STATUS_RUMAH = {
  TETAP: 'tetap',
  KONTRAK: 'kontrak',
  KOSONG: 'kosong'
};

const TARGET_ROLE = {
  SEMUA: 'semua',
  WARGA: 'warga',
  PENGURUS: 'pengurus'
};

module.exports = {
  ROLES,
  TAGIHAN_STATUS,
  PEMBAYARAN_STATUS,
  PEMBAYARAN_METODE,
  KAS_JENIS,
  PENGUMUMAN_TYPE,
  NOTIFIKASI_TYPE,
  LAPORAN_STATUS,
  LAPORAN_JENIS,
  PERIODE,
  STATUS_RUMAH,
  TARGET_ROLE
};
