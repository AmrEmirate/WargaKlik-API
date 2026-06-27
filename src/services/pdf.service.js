const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { KasHarian, Tagihan, Warga, TagihanItem, IuranMaster } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/database');

const UPLOADS_DIR = path.join(__dirname, '../../uploads');

/**
 * Generate monthly financial report PDF
 */
const generateLaporanBulanan = async (bulan, tahun) => {
  const filename = `laporan-bulanan-${bulan}-${tahun}-${Date.now()}.pdf`;
  const filePath = path.join(UPLOADS_DIR, filename);

  const startDate = new Date(tahun, bulan - 1, 1);
  const endDate = new Date(tahun, bulan, 0, 23, 59, 59, 999);

  // Fetch data
  const kasData = await KasHarian.findAll({
    where: {
      tanggal: { [Op.between]: [startDate, endDate] }
    },
    order: [['tanggal', 'ASC']]
  });

  const previousKasData = await KasHarian.findAll({
    where: {
      tanggal: { [Op.lt]: startDate }
    }
  });

  const prevMasuk = previousKasData.filter(k => k.jenis === 'masuk').reduce((sum, k) => sum + parseFloat(k.nominal), 0);
  const prevKeluar = previousKasData.filter(k => k.jenis === 'keluar').reduce((sum, k) => sum + parseFloat(k.nominal), 0);
  const saldoBulanLalu = prevMasuk - prevKeluar;

  const totalMasuk = kasData
    .filter(k => k.jenis === 'masuk')
    .reduce((sum, k) => sum + parseFloat(k.nominal), 0);

  const totalKeluar = kasData
    .filter(k => k.jenis === 'keluar')
    .reduce((sum, k) => sum + parseFloat(k.nominal), 0);

  const saldoAkhir = saldoBulanLalu + totalMasuk - totalKeluar;

  const tunggakan = await Tagihan.findAll({
    where: { bulan, tahun, status: 'belum_bayar' },
    include: [{ model: Warga, as: 'warga' }]
  });

  // Create PDF
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  // Header
  doc.fontSize(18).font('Helvetica-Bold').text('LAPORAN KEUANGAN RT', { align: 'center' });
  doc.fontSize(12).font('Helvetica').text(`Periode: Bulan ${bulan} Tahun ${tahun}`, { align: 'center' });
  doc.moveDown(2);

  // Summary
  doc.fontSize(14).font('Helvetica-Bold').text('Ringkasan');
  doc.moveDown(0.5);
  doc.fontSize(11).font('Helvetica');
  doc.text(`Saldo Bulan Lalu : Rp ${saldoBulanLalu.toLocaleString('id-ID')}`);
  doc.text(`Total Pemasukan  : Rp ${totalMasuk.toLocaleString('id-ID')}`);
  doc.text(`Total Pengeluaran: Rp ${totalKeluar.toLocaleString('id-ID')}`);
  doc.text(`Saldo Akhir      : Rp ${saldoAkhir.toLocaleString('id-ID')}`);
  doc.text(`Jumlah Tunggakan : ${tunggakan.length} warga`);
  doc.moveDown(2);

  // Detail Kas
  doc.fontSize(14).font('Helvetica-Bold').text('Detail Kas Harian');
  doc.moveDown(0.5);

  // Table header
  const tableTop = doc.y;
  doc.fontSize(9).font('Helvetica-Bold');
  doc.text('Tanggal', 50, tableTop, { width: 80 });
  doc.text('Jenis', 130, tableTop, { width: 50 });
  doc.text('Kategori', 180, tableTop, { width: 80 });
  doc.text('Keterangan', 260, tableTop, { width: 150 });
  doc.text('Nominal', 410, tableTop, { width: 100, align: 'right' });
  doc.moveDown(0.5);

  // Draw line
  doc.moveTo(50, doc.y).lineTo(510, doc.y).stroke();
  doc.moveDown(0.3);

  // Table rows
  doc.font('Helvetica').fontSize(9);
  for (const kas of kasData) {
    if (doc.y > 720) {
      doc.addPage();
    }
    const y = doc.y;
    doc.text(kas.tanggal, 50, y, { width: 80 });
    doc.text(kas.jenis, 130, y, { width: 50 });
    doc.text(kas.kategori, 180, y, { width: 80 });
    doc.text(kas.keterangan || '-', 260, y, { width: 150 });
    doc.text(`Rp ${parseFloat(kas.nominal).toLocaleString('id-ID')}`, 410, y, { width: 100, align: 'right' });
    doc.moveDown(0.5);
  }

  // Footer
  doc.moveDown(2);
  doc.fontSize(9).text(`Digenerate pada: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`, { align: 'right' });

  doc.end();

  return new Promise((resolve, reject) => {
    stream.on('finish', () => resolve(`/api/uploads/${filename}`));
    stream.on('error', reject);
  });
};

/**
 * Generate yearly financial report PDF
 */
const generateLaporanTahunan = async (tahun) => {
  const filename = `laporan-tahunan-${tahun}-${Date.now()}.pdf`;
  const filePath = path.join(UPLOADS_DIR, filename);

  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  doc.fontSize(18).font('Helvetica-Bold').text('LAPORAN KEUANGAN TAHUNAN RT', { align: 'center' });
  doc.fontSize(12).font('Helvetica').text(`Tahun ${tahun}`, { align: 'center' });
  doc.moveDown(2);

  // Per-month summary
  doc.fontSize(14).font('Helvetica-Bold').text('Ringkasan Per Bulan');
  doc.moveDown(0.5);

  const namaBulan = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  let grandMasuk = 0;
  let grandKeluar = 0;

  doc.fontSize(9).font('Helvetica-Bold');
  const hdrY = doc.y;
  doc.text('Bulan', 50, hdrY, { width: 100 });
  doc.text('Pemasukan', 180, hdrY, { width: 110, align: 'right' });
  doc.text('Pengeluaran', 300, hdrY, { width: 110, align: 'right' });
  doc.text('Saldo', 420, hdrY, { width: 90, align: 'right' });
  doc.moveDown(0.5);
  doc.moveTo(50, doc.y).lineTo(510, doc.y).stroke();
  doc.moveDown(0.3);

  doc.font('Helvetica');
  for (let m = 1; m <= 12; m++) {
    const startDate = new Date(tahun, m - 1, 1);
    const endDate = new Date(tahun, m, 0, 23, 59, 59, 999);

    const kasData = await KasHarian.findAll({
      where: {
        tanggal: { [Op.between]: [startDate, endDate] }
      }
    });

    const masuk = kasData.filter(k => k.jenis === 'masuk').reduce((s, k) => s + parseFloat(k.nominal), 0);
    const keluar = kasData.filter(k => k.jenis === 'keluar').reduce((s, k) => s + parseFloat(k.nominal), 0);
    grandMasuk += masuk;
    grandKeluar += keluar;

    const y = doc.y;
    doc.text(namaBulan[m], 50, y, { width: 100 });
    doc.text(`Rp ${masuk.toLocaleString('id-ID')}`, 180, y, { width: 110, align: 'right' });
    doc.text(`Rp ${keluar.toLocaleString('id-ID')}`, 300, y, { width: 110, align: 'right' });
    doc.text(`Rp ${(masuk - keluar).toLocaleString('id-ID')}`, 420, y, { width: 90, align: 'right' });
    doc.moveDown(0.5);
  }

  doc.moveDown(0.5);
  doc.moveTo(50, doc.y).lineTo(510, doc.y).stroke();
  doc.moveDown(0.5);
  doc.font('Helvetica-Bold');
  const totY = doc.y;
  doc.text('TOTAL', 50, totY, { width: 100 });
  doc.text(`Rp ${grandMasuk.toLocaleString('id-ID')}`, 180, totY, { width: 110, align: 'right' });
  doc.text(`Rp ${grandKeluar.toLocaleString('id-ID')}`, 300, totY, { width: 110, align: 'right' });
  doc.text(`Rp ${(grandMasuk - grandKeluar).toLocaleString('id-ID')}`, 420, totY, { width: 90, align: 'right' });

  doc.moveDown(3);
  doc.fontSize(9).font('Helvetica').text(`Digenerate pada: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`, { align: 'right' });

  doc.end();

  return new Promise((resolve, reject) => {
    stream.on('finish', () => resolve(`/api/uploads/${filename}`));
    stream.on('error', reject);
  });
};

/**
 * Generate arrears (tunggakan) report PDF
 */
const generateLaporanTunggakan = async (bulan, tahun) => {
  const filename = `laporan-tunggakan-${bulan}-${tahun}-${Date.now()}.pdf`;
  const filePath = path.join(UPLOADS_DIR, filename);

  const tunggakanData = await Tagihan.findAll({
    where: { 
      bulan, 
      tahun, 
      status: { [Op.ne]: 'lunas' } 
    },
    include: [{ model: Warga, as: 'warga' }],
    order: [[{ model: Warga, as: 'warga' }, 'no_rumah', 'ASC']]
  });

  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  doc.fontSize(18).font('Helvetica-Bold').text('LAPORAN TUNGGAKAN IURAN RT', { align: 'center' });
  doc.fontSize(12).font('Helvetica').text(`Periode: ${getBulanName(bulan)} ${tahun}`, { align: 'center' });
  doc.moveDown(2);

  doc.fontSize(11).font('Helvetica-Bold');
  const tableTop = doc.y;
  doc.text('No. Rumah', 50, tableTop, { width: 80 });
  doc.text('Nama Kepala Keluarga', 140, tableTop, { width: 180 });
  doc.text('Status', 330, tableTop, { width: 80 });
  doc.text('Tunggakan', 420, tableTop, { width: 90, align: 'right' });
  doc.moveDown(0.5);
  doc.moveTo(50, doc.y).lineTo(510, doc.y).stroke();
  doc.moveDown(0.3);

  doc.font('Helvetica').fontSize(10);
  let totalTunggakan = 0;
  
  for (const item of tunggakanData) {
    if (doc.y > 720) doc.addPage();
    const y = doc.y;
    doc.text(item.warga?.no_rumah || '-', 50, y, { width: 80 });
    doc.text(item.warga?.kepala_keluarga || '-', 140, y, { width: 180 });
    doc.text(item.status.replace('_', ' '), 330, y, { width: 80 });
    doc.text(`Rp ${parseFloat(item.total_nominal).toLocaleString('id-ID')}`, 420, y, { width: 90, align: 'right' });
    totalTunggakan += parseFloat(item.total_nominal);
    doc.moveDown(0.5);
  }

  doc.moveDown(0.5);
  doc.moveTo(50, doc.y).lineTo(510, doc.y).stroke();
  doc.moveDown(0.5);
  doc.font('Helvetica-Bold');
  doc.text('TOTAL TUNGGAKAN', 50, doc.y, { width: 300 });
  doc.text(`Rp ${totalTunggakan.toLocaleString('id-ID')}`, 410, doc.y, { width: 100, align: 'right' });

  doc.moveDown(3);
  doc.fontSize(9).font('Helvetica').text(`Digenerate pada: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`, { align: 'right' });

  doc.end();

  return new Promise((resolve, reject) => {
    stream.on('finish', () => resolve(`/api/uploads/${filename}`));
    stream.on('error', reject);
  });
};

const getBulanName = (bulan) => {
  const nama = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  return nama[parseInt(bulan)];
};

module.exports = { generateLaporanBulanan, generateLaporanTahunan, generateLaporanTunggakan };
