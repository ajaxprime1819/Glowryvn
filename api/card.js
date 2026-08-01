export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const apiResponse = await fetch('https://gachthefast.com/api/card-charging', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });

    const data = await apiResponse.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ status: 0, message: 'Lỗi kết nối tới cổng gạch thẻ' });
  }
}
