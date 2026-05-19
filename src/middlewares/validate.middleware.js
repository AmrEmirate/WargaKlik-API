const { validationResult } = require('express-validator');
const { error } = require('../utils/response');

/**
 * Middleware to check express-validator results
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map(e => e.msg);
    return error(res, messages[0], 422, errors.array());
  }
  next();
};

module.exports = { validate };
