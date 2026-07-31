import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    const data = req.method === 'POST' ? req.body : req.query;
    const { status, amount, request_id } = data;

    if (status == 1) {
        // Thẻ thành công -> Cộng tiền vào cơ sở dữ liệu Supabase ở đây
    }

    return res.status(200).json({ status: 'ok' });
}
