require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const md5 = require('md5');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Khởi tạo Supabase Client với Service Role Key
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// 1. API KHÁCH HÀNG GỬI THẺ CÀO TỪ WEB
app.post('/api/card/submit', async (req, res) => {
    try {
        const { cardType, cardValue, cardCode, cardSeri, userEmail } = req.body;

        if (!cardType || !cardValue || !cardCode || !cardSeri || !userEmail) {
            return res.status(400).json({ success: false, message: 'Thừa/Thiếu thông tin thẻ hoặc Email!' });
        }

        // Tạo requestId duy nhất cho giao dịch
        const requestId = `${Date.now()}_${Math.floor(Math.random() * 1000)}`;

        // Tính Sign MD5 theo chuẩn của TheSieuRe: md5(partner_key + code + serial)
        const sign = md5(process.env.TSR_PARTNER_KEY + cardCode + cardSeri);

        // Gửi dữ liệu sang API TheSieuRe
        const formData = new URLSearchParams();
        formData.append('telco', cardType.toUpperCase()); // VIETTEL, VINAPHONE, MOBIFONE
        formData.append('code', cardCode);
        formData.append('serial', cardSeri);
        formData.append('amount', cardValue);
        formData.append('request_id', requestId);
        formData.append('partner_id', process.env.TSR_PARTNER_ID);
        formData.append('sign', sign);
        formData.append('command', 'charging');

        const response = await fetch('https://thesieure.com/chargingws/v2', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData
        });

        const data = await response.json();

        // status = 99 hoặc 1 có nghĩa là thẻ đã được đẩy lên hệ thống TSR thành công
        if (data.status === 99 || data.status === 1) {
            // Lưu lịch sử thẻ vào Supabase ở trạng thái 'pending'
            await supabase.from('card_transactions').insert([
                {
                    request_id: requestId,
                    user_email: userEmail,
                    card_type: cardType,
                    card_value: parseInt(cardValue),
                    card_code: cardCode,
                    card_seri: cardSeri,
                    status: 'pending'
                }
            ]);

            return res.json({ success: true, message: 'Gửi thẻ thành công! Vui lòng chờ 1-3 phút để hệ thống xử lý.' });
        } else {
            return res.status(400).json({ success: false, message: data.message || 'Thẻ cào không hợp lệ!' });
        }

    } catch (error) {
        console.error('Lỗi Submit Card:', error);
        return res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ!' });
    }
});

// 2. CALLBACK API: THẺ SIÊU RẺ TỰ ĐỘNG BẮN KẾT QUẢ VỀ ĐÂY
app.post('/api/card/callback', async (req, res) => {
    try {
        const { status, message, request_id, declared_value, value, amount, code, serial, callback_sign } = req.body;

        // Kiểm tra chữ ký bảo mật từ TheSieuRe: md5(partner_key + code + serial)
        const mySign = md5(process.env.TSR_PARTNER_KEY + code + serial);
        if (mySign !== callback_sign) {
            console.log('Cảnh báo: Sai chữ ký Callback Sign!');
            return res.status(400).send('Invalid Sign');
        }

        // Lấy thông tin giao dịch thẻ từ Supabase
        const { data: cardTx, error } = await supabase
            .from('card_transactions')
            .select('*')
            .eq('request_id', request_id)
            .single();

        if (error || !cardTx) {
            console.log('Không tìm thấy Request ID:', request_id);
            return res.status(404).send('Transaction Not Found');
        }

        // Nếu thẻ đúng (Status = 1)
        if (status == 1) {
            const realAmount = parseInt(value); // Mệnh giá thực của thẻ
            const userEmail = cardTx.user_email;

            // Update trạng thái thẻ thành 'success'
            await supabase.from('card_transactions')
                .update({ status: 'success', real_value: realAmount })
                .eq('request_id', request_id);

            // Cộng tiền trực tiếp vào tài khoản người dùng trên Supabase
            // Lấy số dư hiện tại của User
            const { data: userProfile } = await supabase
                .from('profiles')
                .select('balance')
                .eq('email', userEmail)
                .single();

            const currentBalance = userProfile ? userProfile.balance : 0;
            const newBalance = currentBalance + realAmount;

            // Cập nhật số dư mới
            await supabase
                .from('profiles')
                .upsert({ email: userEmail, balance: newBalance }, { onConflict: 'email' });

            console.log(`✅ [THÀNH CÔNG] Đã cộng ${realAmount} đ cho user: ${userEmail}`);
        } else {
            // Thẻ sai hoặc sai mệnh giá (Status != 1)
            await supabase.from('card_transactions')
                .update({ status: 'failed', note: message })
                .eq('request_id', request_id);

            console.log(`❌ [THẤT BẠI] Thẻ sai hoặc lỗi: ${message}`);
        }

        return res.status(200).send('OK');

    } catch (err) {
        console.error('Lỗi Callback Processing:', err);
        return res.status(500).send('Internal Server Error');
    }
});

// Chạy Server Backend
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server Backend đang chạy tại http://localhost:${PORT}`);
});
