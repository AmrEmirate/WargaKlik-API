const router = require('express').Router();
const tagihanController = require('../controllers/tagihan.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { pengurusOnly, bendaharaUp } = require('../middlewares/role.middleware');

router.use(authenticate);

router.get('/', tagihanController.getAllTagihan);
router.get('/:id', tagihanController.getTagihanById);
router.post('/generate', bendaharaUp, tagihanController.generateTagihan);
router.post('/generate-future', tagihanController.generateFutureTagihan);

module.exports = router;
