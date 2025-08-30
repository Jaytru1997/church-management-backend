const axios = require('axios');
const crypto = require('crypto');

class MonnifyService {
  constructor() {
    this.baseURL = process.env.MONNIFY_BASE_URL;
    this.apiKey = process.env.MONNIFY_API_KEY;
    this.secretKey = process.env.MONNIFY_SECRET_KEY;
    this.contractCode = process.env.MONNIFY_CONTRACT_CODE;
  }

  // Generate authentication header
  generateAuthHeader() {
    const authString = `${this.apiKey}:${this.secretKey}`;
    return Buffer.from(authString).toString('base64');
  }

  // Generate request signature
  generateSignature(requestBody) {
    const stringToHash = `${requestBody}${this.secretKey}`;
    return crypto.createHash('sha512').update(stringToHash).digest('hex');
  }

  // Initialize payment
  async initializePayment(paymentData) {
    try {
      const {
        amount,
        customerName,
        customerEmail,
        paymentReference,
        paymentDescription,
        currencyCode = 'NGN',
        redirectUrl,
        metadata = {},
      } = paymentData;

      const requestBody = {
        amount,
        customerName,
        customerEmail,
        paymentReference,
        paymentDescription,
        currencyCode,
        contractCode: this.contractCode,
        redirectUrl,
        paymentMethods: ['CARD', 'ACCOUNT_TRANSFER'],
        metadata,
      };

      const signature = this.generateSignature(JSON.stringify(requestBody));

      const response = await axios.post(
        `${this.baseURL}/v1/merchant/transactions/init-transaction`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${this.generateAuthHeader()}`,
            'Signature': signature,
          },
        }
      );

      return {
        success: true,
        data: response.data,
        checkoutUrl: response.data.responseBody.checkoutUrl,
        transactionReference: response.data.responseBody.transactionReference,
      };
    } catch (error) {
      console.error('❌ Monnify payment initialization error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  // Verify payment
  async verifyPayment(transactionReference) {
    try {
      const signature = this.generateSignature(transactionReference);

      const response = await axios.get(
        `${this.baseURL}/v2/transactions/${transactionReference}`,
        {
          headers: {
            'Authorization': `Basic ${this.generateAuthHeader()}`,
            'Signature': signature,
          },
        }
      );

      return {
        success: true,
        data: response.data,
        paymentStatus: response.data.responseBody.paymentStatus,
        amount: response.data.responseBody.amount,
        paidAmount: response.data.responseBody.paidAmount,
        transactionReference: response.data.responseBody.transactionReference,
        paymentDate: response.data.responseBody.paidOn,
      };
    } catch (error) {
      console.error('❌ Monnify payment verification error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  // Get transaction status
  async getTransactionStatus(transactionReference) {
    try {
      const response = await axios.get(
        `${this.baseURL}/v1/merchant/transactions/query-transaction-status?paymentReference=${transactionReference}`,
        {
          headers: {
            'Authorization': `Basic ${this.generateAuthHeader()}`,
          },
        }
      );

      return {
        success: true,
        data: response.data,
        status: response.data.responseBody.status,
      };
    } catch (error) {
      console.error('❌ Monnify transaction status error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message,
      };
    }
  }

  // Handle webhook callback
  handleWebhookCallback(payload, signature) {
    try {
      const expectedSignature = this.generateSignature(JSON.stringify(payload));
      
      if (signature !== expectedSignature) {
        return {
          success: false,
          error: 'Invalid signature',
        };
      }

      return {
        success: true,
        data: payload,
        paymentStatus: payload.paymentStatus,
        transactionReference: payload.transactionReference,
        amount: payload.amount,
        paidAmount: payload.paidAmount,
        paymentDate: payload.paidOn,
      };
    } catch (error) {
      console.error('❌ Monnify webhook handling error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = new MonnifyService();
