const router = require('express').Router();
const wargaController = require('../controllers/warga.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { pengurusOnly, sekretarisUp } = require('../middlewares/role.middleware');
const { body } = require('express-validator');
const { validate } = require('../middlewares/validate.middleware');

const createValidation = [
  body('name').notEmpty().withMessage('Nama wajib diisi'),
  body('email').isEmail().withMessage('Format email tidak valid'),
  body('no_rumah').notEmpty().withMessage('Nomor rumah wajib diisi')
];

router.use(authenticate);

router.get('/', pengurusOnly, wargaController.getAllWarga);
router.get('/me', wargaController.getMyWarga);
router.get('/:id', pengurusOnly, wargaController.getWargaById);
router.post('/', sekretarisUp, createValidation, validate, wargaController.createWarga);
router.put('/:id', sekretarisUp, wargaController.updateWarga);
router.delete('/:id', sekretarisUp, wargaController.deleteWarga);

module.exports = router;
