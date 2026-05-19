/**
 * Standardized API response helpers
 */
const success = (res, data = null, message = 'Berhasil', code = 200) => {
  return res.status(code).json({
    success: true,
    message,
    data
  });
};

const error = (res, message = 'Terjadi kesalahan', code = 400, errors = null) => {
  const response = {
    success: false,
    message
  };
  if (errors) response.errors = errors;
  return res.status(code).json(response);
};

const paginate = (res, data, pagination, message = 'Berhasil') => {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination
  });
};

module.exports = { success, error, paginate };
