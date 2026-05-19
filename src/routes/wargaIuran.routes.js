const router = require('express').Router();
const wargaIuranController = require('../controllers/wargaIuran.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { pengurusOnly } = require('../middlewares/role.middleware');

router.use(authenticate);
router.use(pengurusOnly);

router.get('/:warga_id', wargaIuranController.getWargaIuran);
router.put('/:warga_id', wargaIuranController.setWargaIuran);

module.exports = router;
