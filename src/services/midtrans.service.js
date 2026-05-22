const { snap } = require('../config/midtrans');
const crypto = require('crypto');
const env = require('../config/env');

/**
 * Create Midtrans Snap transaction
 */
const createTransaction = async (orderId, grossAmount, customerDetails, itemDetails) => {
  const parameter = {
    transaction_details: {
      order_id: orderId,
      gross_amount: grossAmount
    },
    customer_details: customerDetails,
    item_details: itemDetails,
    callbacks: {
      finish: `${env.frontendUrl}/dashboard/tagihan`
    }
  };

  const transaction = await snap.createTransaction(parameter);
  return {
    token: transaction.token,
    redirect_url: transaction.redirect_url
  };
};

/**
 * Verify Midtrans webhook signature
 */
const verifySignature = (orderId, statusCode, grossAmount) => {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  const hash = crypto
    .createHash('sha512')
    .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
    .digest('hex');
  return hash;
};

/**
 * Generate unique order ID
 */
const generateOrderId = (tagihanId) => {
  const timestamp = Date.now();
  return `IURAN-${tagihanId}-${timestamp}`;
};

/**
 * Check transaction status from Midtrans directly
 */
const checkStatus = async (orderId) => {
  try {
    return await snap.transaction.status(orderId);
  } catch (err) {
    throw err;
  }
};

module.exports = { createTransaction, verifySignature, generateOrderId, checkStatus };
