const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const axios = require('axios');

const app = express();

// Cho phép Frontend (React) gọi API mà không bị chặn lỗi CORS
app.use(cors());
// Cấu hình để API đọc được dữ liệu JSON gửi lên
app.use(express.json());

// ==========================================
// HÀM LỌC RÁC (TIỀN XỬ LÝ DỮ LIỆU)
// ==========================================
function isValidComment(text) {
    if (!text) return false;
    let cleanText = text.trim();
    
    cleanText = cleanText.replace(/Xem thêm$/g, '').trim();

    if (cleanText.length < 5) return false; 
    if (cleanText.split(' ').length < 2) return false; 
    if (!/[a-zA-ZÀ-ỹ]/.test(cleanText)) return false; 

    return true;
}

// ==========================================
// CỖ MÁY CÀO DỮ LIỆU (Đã được chuyển thành hàm trả về)
// ==========================================
async function scrapeFoody(url, userId) {
    console.log(`🤖 Nhận lệnh cào từ User ID: ${userId}`);
    console.log('🤖 Khởi động trình duyệt ảo Puppeteer...');
    
    const browser = await puppeteer.launch({ 
        headless: false, // Vẫn để false để bạn nhìn nó tự click, lúc nào up production thì đổi thành true
        defaultViewport: null 
    });
    
    const page = await browser.newPage();

    console.log(`🌐 Đang truy cập trang: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2' });

    console.log('⏳ Đang đợi Foody khởi tạo giao diện...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('⏳ Đang tìm và tự động click nút "Xem thêm bình luận"...');
    
    let hasMoreComments = true;
    let clickCount = 0;

    while (hasMoreComments) {
        try {
            await page.waitForSelector('a.fd-btn-more', { timeout: 2000 });
            const clicked = await page.evaluate(() => {
                const buttons = document.querySelectorAll('a.fd-btn-more');
                for (let btn of buttons) {
                    if (btn.innerText.includes('Xem thêm bình luận') || btn.textContent.includes('Xem thêm bình luận')) {
                        btn.click();
                        return true; 
                    }
                }
                return false; 
            });

            if (!clicked) {
                console.log('✅ Đã hết nút "Xem thêm bình luận". Đã mở khóa toàn bộ!');
                hasMoreComments = false;
                break;
            }
            
            clickCount++;
            console.log(`👉 Đã click trúng đích "Xem thêm" lần ${clickCount}...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
            console.log('✅ Nút "Xem thêm" đã biến mất hoàn toàn.');
            hasMoreComments = false;
        }
    }
    
    console.log('🔍 Bắt đầu bóc tách và lọc dữ liệu...');
    const rawReviews = await page.evaluate(() => {
        const commentSelector = '.rd-des'; 
        const nodes = document.querySelectorAll(commentSelector);
        const results = [];
        nodes.forEach(node => {
            const text = node.innerText || node.textContent;
            if (text) results.push(text);
        });
        return results;
    });

    const cleanReviews = [];
    rawReviews.forEach(text => {
        let formattedText = text.replace(/[\r\n]+/g, ' ').trim();
        formattedText = formattedText.replace(/Xem thêm$/g, '').trim();
        // Dọn dẹp emoji
        formattedText = formattedText.replace(/[^\p{L}\p{N}\p{P}\s]/gu, '');

        if (isValidComment(formattedText)) {
            cleanReviews.push(formattedText);
        }
    });

    console.log(`💎 Thành phẩm: Giữ lại được ${cleanReviews.length} bình luận chất lượng!`);
    await browser.close(); 
    
    // Gửi mảng dữ liệu kèm user_id sang FastAPI
    if (cleanReviews.length > 0) {
        console.log(`🚀 Đang gửi ${cleanReviews.length} bình luận sang FastAPI...`);
        try {
            const response = await axios.post('http://localhost:8000/predict/batch', {
                texts: cleanReviews,
                user_id: userId ,
                source_url: url// 👈 ĐIỂM MẤU CHỐT: Truyền UUID sang cho AI
            });
            console.log('🎉 AI ĐÃ XỬ LÝ XONG!');
            return response.data; // Trả cục kết quả này về cho Frontend
        } catch (error) {
            console.error('❌ Lỗi khi kết nối với Backend Python:', error.message);
            throw new Error('Không thể kết nối tới AI Backend');
        }
    } else {
        return { message: "Không cào được bình luận hợp lệ nào." };
    }
}

// ==========================================
// API ENDPOINT NHẬN LỆNH TỪ FRONTEND
// ==========================================
app.post('/api/scrape', async (req, res) => {
    // Rút trích url và user_id do React gửi lên
    const { url, user_id } = req.body;

    if (!url || !user_id) {
        return res.status(400).json({ error: 'Thiếu url hoặc user_id' });
    }

    try {
        // Gọi hàm cào và đợi kết quả
        const result = await scrapeFoody(url, user_id);
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Khởi động Server ở cổng 3000
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Cỗ máy Web Scraping đang lắng nghe tại http://localhost:${PORT}`);
    console.log('Đang chờ lệnh từ Frontend...');
});