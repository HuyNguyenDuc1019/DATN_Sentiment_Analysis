const axios = require('axios');

async function runTest() {
    console.log("🚀 Bắt đầu giả lập Frontend gửi lệnh...");
    try {
        const response = await axios.post('http://localhost:3000/api/scrape', {
            url: "https://www.foody.vn/ho-chi-minh/tau-hu-xe-lam-tran-hung-dao",
            // Đây là một mã UUID giả lập hợp lệ để test lưu Database
            user_id: "6321769c-b475-43d4-9d55-a1301a10501b" 
        });
        
        console.log("✅ KẾT QUẢ TỪ SERVER TRẢ VỀ FRONTEND:");
        console.log(response.data);
    } catch (error) {
        console.error("❌ Lỗi:", error.response ? error.response.data : error.message);
    }
}

runTest();