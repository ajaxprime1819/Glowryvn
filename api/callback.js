import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    try {
        const supabase = createClient(
            process.env.SUPABASE_URL, 
            process.env.SUPABASE_KEY
        );

        // Lấy dữ liệu trả về từ cổng nạp thẻ (hỗ trợ cả POST và GET)
        const data = req.method === 'POST' ? req.body : req.query;
        
        // Tùy theo API web đổi thẻ bạn dùng, các biến có thể là:
        // status (1: thành công, 2: sai mệnh giá, 3: thất bại)
        // amount (mệnh giá thực tế)
        // request_id hoặc callback_is (mã giao dịch chứa email của khách)
        const { status, amount, request_id } = data;

        // Kiểm tra nếu thẻ nạp thành công (status == 1)
        if (Number(status) === 1) {
            // Giả sử lúc khách gửi thẻ, bạn truyền request_id chính là email của khách (hoặc mã đơn hàng có chứa email)
            const customerEmail = request_id; 

            if (customerEmail) {
                // 1. Lấy số dư hiện tại của khách từ bảng user_balances
                let { data: userData, error: fetchError } = await supabase
                    .from('user_balances')
                    .select('balance')
                    .eq('email', customerEmail)
                    .single();

                let currentBalance = userData ? Number(userData.balance) : 0;
                let addedAmount = Number(amount);
                let newBalance = currentBalance + addedAmount;

                // 2. Cập nhật lại số dư mới vào bảng user_balances
                await supabase
                    .from('user_balances')
                    .upsert({ email: customerEmail, balance: newBalance });
            }
        }

        return res.status(200).json({ status: 'ok', message: 'Processed successfully' });
    } catch (error) {
        console.error("Lỗi callback:", error.message);
        return res.status(500).json({ error: error.message });
    }
}
