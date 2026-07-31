import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    try {
        const supabase = createClient(
            process.env.SUPABASE_URL, 
            process.env.SUPABASE_KEY
        );

        const data = req.method === 'POST' ? req.body : req.query;
        const { status, amount, request_id } = data;

        if (status == 1) {
            // Thẻ thành công -> Viết code cộng tiền vào bảng user_balances ở đây nếu cần
        }

        return res.status(200).json({ status: 'ok' });
    } catch (error) {
        console.error("Lỗi callback:", error.message);
        return res.status(500).json({ error: error.message });
    }
}
