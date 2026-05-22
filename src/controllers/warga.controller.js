const { Warga, User, WargaIuran, Tagihan } = require('../models');
const sequelize = require('../config/database');
const { success, error, paginate } = require('../utils/response');
const bcrypt = require('bcryptjs');

/**
 * GET /api/warga
 */
const getAllWarga = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 100); // FIX: cap at 100
    const offset = (page - 1) * limit;

    // FIX: Replace sequelize.literal (raw SQL) with safe Sequelize aggregation
    const { count, rows } = await Warga.findAndCountAll({
      limit,
      offset,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'no_telepon', 'role']
        },
        {
          model: WargaIuran,
          as: 'iuran_custom',
          attributes: ['id', 'nominal_custom', 'is_excluded']
        }
      ],
      order: [['no_rumah', 'ASC']]
    });

    // Safely count unpaid bills per warga using Sequelize (not raw SQL)
    const rowsWithCount = await Promise.all(rows.map(async (warga) => {
      const unpaid_count = await Tagihan.count({
        where: { warga_id: warga.id, status: 'belum_bayar' }
      });
      const plain = warga.toJSON();
      plain.unpaid_count = unpaid_count;
      return plain;
    }));

    return paginate(res, rowsWithCount, {
      total: count,
      page,
      total_pages: Math.ceil(count / limit)
    });
  } catch (err) {
    console.error('Get warga error:', err);
    return error(res, 'Gagal mengambil data warga', 500);
  }
};

/**
 * GET /api/warga/:id
 */
const getWargaById = async (req, res) => {
  try {
    const warga = await Warga.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'no_telepon', 'role']
        },
        {
          model: WargaIuran,
          as: 'iuran_custom',
          attributes: ['id', 'nominal_custom', 'is_excluded']
        }
      ]
    });

    if (!warga) return error(res, 'Warga tidak ditemukan', 404);
    return success(res, warga);
  } catch (err) {
    return error(res, 'Gagal mengambil data warga', 500);
  }
};

/**
 * POST /api/warga
 */
const createWarga = async (req, res) => {
  try {
    const { 
      name, email, no_telepon, 
      no_rumah, no_kk, jumlah_anggota, status_rumah 
    } = req.body;

    // 1. Check email
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) return error(res, 'Email sudah terdaftar', 400);

    // 2. Create User with a random unguessable password
    // Users MUST activate their account to set their real password
    const crypto = require('crypto');
    const randomPassword = crypto.randomBytes(32).toString('hex');
    const hashedPassword = await bcrypt.hash(randomPassword, 10);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      no_telepon,
      role: 'warga'
    });

    // 3. Create Warga
    const warga = await Warga.create({
      no_rumah,
      kepala_keluarga: name,
      no_kk,
      jumlah_anggota: jumlah_anggota || 1,
      status_rumah: status_rumah || 'tetap',
      user_id: user.id
    });

    return success(res, warga, 'Data warga berhasil ditambahkan', 201);
  } catch (err) {
    console.error('Create warga error:', err);
    return error(res, 'Gagal menambahkan warga', 500);
  }
};

/**
 * PUT /api/warga/:id
 */
const updateWarga = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, no_telepon, no_rumah, no_kk, jumlah_anggota, status_rumah, is_active } = req.body;

    const warga = await Warga.findByPk(id, { include: ['user'] });
    if (!warga) return error(res, 'Warga tidak ditemukan', 404);

    // Update User
    if (warga.user) {
      const userUpdate = {};
      if (name) userUpdate.name = name;
      if (no_telepon !== undefined) userUpdate.no_telepon = no_telepon;
      if (email && email !== warga.user.email) {
        const existing = await User.findOne({ where: { email } });
        if (existing) return error(res, 'Email sudah digunakan oleh akun lain', 400);
        userUpdate.email = email;
      }
      await warga.user.update(userUpdate);
    }

    // Update Warga
    await warga.update({
      no_rumah: no_rumah || warga.no_rumah,
      kepala_keluarga: name || warga.kepala_keluarga,
      no_kk: no_kk || warga.no_kk,
      jumlah_anggota: jumlah_anggota || warga.jumlah_anggota,
      status_rumah: status_rumah || warga.status_rumah,
      is_active: is_active !== undefined ? is_active : warga.is_active
    });

    return success(res, warga, 'Data warga berhasil diupdate');
  } catch (err) {
    console.error('Update warga error:', err);
    return error(res, 'Gagal mengupdate warga', 500);
  }
};

/**
 * DELETE /api/warga/:id
 */
const deleteWarga = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const warga = await Warga.findByPk(req.params.id);
    if (!warga) {
      await t.rollback();
      return error(res, 'Warga tidak ditemukan', 404);
    }

    // Cek apakah ada tagihan yang sudah lunas (riwayat keuangan)
    const paidBills = await Tagihan.count({
      where: {
        warga_id: warga.id,
        status: 'lunas'
      },
      transaction: t
    });

    if (paidBills > 0) {
      // Jika sudah ada transaksi lunas, lakukan soft delete (nonaktifkan)
      await warga.update({ is_active: false }, { transaction: t });
      await t.commit();
      return success(res, null, 'Warga memiliki riwayat pembayaran. Akun telah dinonaktifkan (soft delete).');
    } else {
      // Jika BELUM ADA transaksi lunas, hapus permanen (hard delete)
      const userId = warga.user_id;

      // Hapus data terkait yang merujuk ke warga ini
      // First, delete all TagihanItem for Tagihans belonging to this Warga
      const { TagihanItem } = require('../models');
      const tagihans = await Tagihan.findAll({ where: { warga_id: warga.id }, transaction: t });
      const tagihanIds = tagihans.map(tagihan => tagihan.id);
      
      if (tagihanIds.length > 0) {
        await TagihanItem.destroy({ where: { tagihan_id: tagihanIds }, transaction: t });
      }

      await Tagihan.destroy({ where: { warga_id: warga.id }, transaction: t });
      await WargaIuran.destroy({ where: { warga_id: warga.id }, transaction: t });
      
      // Hapus data warga
      await warga.destroy({ transaction: t });

      // Hapus data user dan relasinya jika ada
      if (userId) {
        const { RefreshToken } = require('../models');
        await RefreshToken.destroy({ where: { user_id: userId }, transaction: t });
        await User.destroy({ where: { id: userId }, transaction: t });
      }

      await t.commit();
      return success(res, null, 'Data warga salah input berhasil dihapus permanen beserta data terkait.');
    }
  } catch (err) {
    await t.rollback();
    console.error('Delete warga error:', err);
    return error(res, 'Gagal menghapus warga', 500);
  }
};

/**
 * GET /api/warga/me
 */
const getMyWarga = async (req, res) => {
  try {
    const warga = await Warga.findOne({
      where: { user_id: req.user.id },
      include: [
        { model: User, as: 'user', attributes: ['name', 'email', 'no_telepon', 'role'] }
      ]
    });
    if (!warga) return error(res, 'Data kependudukan tidak ditemukan', 404);
    return success(res, warga);
  } catch (err) {
    return error(res, 'Gagal mengambil data kependudukan', 500);
  }
};

module.exports = { getAllWarga, getWargaById, createWarga, updateWarga, deleteWarga, getMyWarga };
