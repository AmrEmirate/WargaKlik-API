const router = require('express').Router();
const iuranController = require('../controllers/iuran.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { pengurusOnly, bendaharaUp } = require('../middlewares/role.middleware');

router.use(authenticate);

router.get('/', iuranController.getAllIuran);
router.post('/', bendaharaUp, iuranController.createIuran);
router.put('/:id', bendaharaUp, iuranController.updateIuran);
router.delete('/:id', bendaharaUp, iuranController.deleteIuran);

module.exports = router;
