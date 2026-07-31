import fetch from 'node-fetch';
import md5 from 'md5';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    const { telco, amount, serial, pin, username } = req.body;

    // TODO: Thay thế Partner ID và Partner Key của bạn từ gachthefast.com vào đây
    const PARTNER_ID = 'DIEN_PARTNER_ID_CUA_BAN_VAO_DAY'; 
    const PARTNER_KEY = 'DIEN_PARTNER_KEY_CUA_BAN_VAO_DAY'; 
    
    const requestId = 'NAPS_' + Date.now();
    
    // Tạo chữ ký theo chuẩn của GachTheFast (thường là md5 của partner_key + pin + serial)
    const signature = md5(PARTNER_KEY + pin + serial);

    const apiUrl = `https://gachthefast.com/chargingws/v2?partner_id=${PARTNER_ID}&telco=${telco}&code=${pin}&serial=${serial}&amount=${amount}&request_id=${requestId}&sign=${signature}`;

    try {
        const response = await fetch(apiUrl);
        const result = await response.json();
        
        // result.status hoặc code == 1 thường là thành công/đã tiếp nhận thẻ chờ duyệt
        if (result.status === 1 || result.code === 1) {
            return res.status(200).json({ success: true, message: 'Gửi thẻ thành công, đang chờ duyệt!' });
        } else {
            return res.status(200).json({ success: false, message: result.message || 'Thẻ lỗi hoặc thông tin không hợp lệ.' });
        }
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Lỗi kết nối tới hệ thống gạch thẻ.' });
    }
}
