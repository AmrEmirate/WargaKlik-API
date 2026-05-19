const router = require('express').Router();
const notifikasiController = require('../controllers/notifikasi.controller');
const { authenticate } = require('../middlewares/auth.middleware');

router.use(authenticate);

router.get('/', notifikasiController.getMyNotifikasi);
router.put('/read-all', notifikasiController.markAllAsRead);
router.put('/:id/read', notifikasiController.markAsRead);

module.exports = router;
