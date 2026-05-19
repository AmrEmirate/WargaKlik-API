const router = require('express').Router();
const pengumumanController = require('../controllers/pengumuman.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { pengurusOnly, sekretarisUp } = require('../middlewares/role.middleware');

router.use(authenticate);

router.get('/', pengumumanController.getAllPengumuman);
router.post('/', pengurusOnly, pengumumanController.createPengumuman);
router.put('/:id', pengurusOnly, pengumumanController.updatePengumuman);
router.delete('/:id', pengurusOnly, pengumumanController.deletePengumuman);

module.exports = router;
