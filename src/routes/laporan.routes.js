const router = require('express').Router();
const laporanController = require('../controllers/laporan.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { pengurusOnly, rtOnly, bendaharaUp } = require('../middlewares/role.middleware');

router.use(authenticate);

// Everyone can view reports (warga only sees approved ones, logic handled in controller)
router.get('/', laporanController.getAllLaporan);

// Bendahara, RT, Wakil RT can generate
router.post('/generate', bendaharaUp, laporanController.generateLaporan);

// Bendahara, RT, Wakil RT can delete their drafts
router.delete('/:id', bendaharaUp, laporanController.deleteLaporan);

// ONLY RT can approve
router.put('/:id/approve', rtOnly, laporanController.approveLaporan);

module.exports = router;
