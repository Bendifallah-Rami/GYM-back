const QRCode = require('qrcode');

/**
 * Generate simple attendance QR code for gym check-in
 * @param {Object} userData - User data
 */
const generateAttendanceQR = async (userData) => {
  try {
    // Simple QR data for attendance check-in
    const qrData = {
      userId: userData.id,
      name: userData.name,
      email: userData.email,
      action: 'check-in',
      memberId: userData.id.toString().padStart(6, '0')
    };

    // Convert to JSON string for QR code
    const qrContent = JSON.stringify(qrData);

    // QR Code generation options
    const qrOptions = {
      type: 'image/png',
      quality: 0.92,
      margin: 2,
      color: {
        dark: '#2196F3',
        light: '#FFFFFF'
      },
      width: 300
    };

    // Generate QR code as base64 data URL and buffer
    const qrCodeDataURL = await QRCode.toDataURL(qrContent, qrOptions);
    const qrCodeBuffer = await QRCode.toBuffer(qrContent, qrOptions);

    return {
      success: true,
      qrCode: {
        dataURL: qrCodeDataURL,
        buffer: qrCodeBuffer,
        data: qrData
      }
    };

  } catch (error) {
    console.error('QR Code generation error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  generateAttendanceQR
};