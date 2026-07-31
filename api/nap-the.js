import fetch from 'node-fetch';
import md5 from 'md5';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    const { telco, amount, serial, pin, username } = req.body;

    const PARTNER_ID = 'DIEN_PARTNER_ID_CUA_BAN_VAO_DAY'; 
    const PARTNER_KEY = 'DIEN_PARTNER_KEY_CUA_BAN_VAO_DAY'; 
    
    const requestId = 'NAPS_' + Date.now();
    const signature = md5(PARTNER_KEY + pin + serial);

    const apiUrl = `https://gachthefast.com/chargingws/v2?partner_id=${PARTNER_ID}&telco=${telco}&code=${pin}&serial=${serial}&amount=${amount}&request_id=${requestId}&sign=${signature}`;

    try {
        const response = await fetch(apiUrl);
        const result = await response.json();
        
        if (result.status === 1 || result.code === 1) {
            return res.status(200).json({ success: true, message: 'Gửi thẻ thành công, đang chờ duyệt!' });
        } else {
            return res.status(200).json({ success: false, message: result.message || 'Thẻ lỗi hoặc thông tin không hợp lệ.' });
        }
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Lỗi kết nối tới hệ thống gạch thẻ.' });
    }
}
