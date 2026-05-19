const router = require('express').Router();
const kasController = require('../controllers/kas.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { pengurusOnly, bendaharaUp } = require('../middlewares/role.middleware');
const { upload, validateFileContent } = require('../middlewares/upload.middleware');

router.use(authenticate);

// Everyone can view Kas (transparency)
router.get('/', kasController.getAllKas);
router.get('/stats', kasController.getStats);

// Only bendahara/RT can add manual kas entry
router.post('/', bendaharaUp, upload.single('bukti'), validateFileContent, kasController.createKas);

module.exports = router;
