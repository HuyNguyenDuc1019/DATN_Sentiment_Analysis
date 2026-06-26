const express = require('express');
const cors = require('cors');
const axios = require('axios');
// Khai báo thư viện tàng hình
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const app = express();

// Cho phép Frontend (React) gọi API mà không bị chặn lỗi CORS
app.use(cors());
// Cấu hình để API đọc được dữ liệu JSON gửi lên
app.use(express.json());

// ==========================================
// 1. HÀM LỌC RÁC (TIỀN XỬ LÝ VĂN BẢN)
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
// 2. HÀM CHUYỂN ĐỔI NGÀY THÁNG (MỚI THÊM 🎯)
// Xử lý các định dạng ngày hiển thị trên trang web thành chuẩn Datetime
// ==========================================
function parseFoodyDate(dateStr) {
    if (!dateStr) return new Date(); // Nếu không có ngày, mặc định là hiện tại
    
    let str = dateStr.toLowerCase().trim();
    let now = new Date();

    if (str.includes('hôm nay') || str.includes('vừa xong')) {
        return now;
    }
    if (str.includes('hôm qua')) {
        now.setDate(now.getDate() - 1);
        return now;
    }
    if (str.includes('ngày trước')) {
        let days = parseInt(str) || 0;
        now.setDate(now.getDate() - days);
        return now;
    }
    if (str.includes('tháng trước')) {
        let months = parseInt(str) || 0;
        now.setMonth(now.getMonth() - months);
        return now;
    }
    
    // Xử lý định dạng chuẩn DD/MM/YYYY
    let parts = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (parts) {
        // Cú pháp: new Date(year, monthIndex, day)
        return new Date(parts[3], parts[2] - 1, parts[1]); 
    }
    
    return now; // Fallback nếu không khớp bất kỳ mẫu nào
}

// ==========================================
// 3. CỖ MÁY CÀO DỮ LIỆU FOODY (ĐÃ NÂNG CẤP)
// ==========================================
async function scrapeFoody(url, userId, lastScrapedDate) {
    console.log(`🤖 Nhận lệnh cào từ User ID: ${userId}`);
    console.log(`⏱️ Mốc thời gian dừng cào (Last Scraped): ${lastScrapedDate || 'Chưa từng cào (Cào từ đầu)'}`);
    console.log('🤖 Khởi động trình duyệt ảo Puppeteer...');
    
    const browser = await puppeteer.launch({ 
        headless: false, // Để false để quan sát, khi up server chuyển thành true
        defaultViewport: null 
    });
    
    const page = await browser.newPage();

    console.log(`🌐 Đang truy cập trang: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2' });

    console.log('⏳ Đang đợi Foody khởi tạo giao diện...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // LƯU Ý LỚN: Nếu hệ thống có lastScrapedDate, việc bấm nút "Xem thêm" nhiều lần
    // có thể không cần thiết nếu dữ liệu mới chỉ nằm ở vài trang đầu. 
    // Tuy nhiên, ta vẫn giữ vòng lặp này để cào đủ số lượng, nó sẽ tự động ngắt ở phần bóc tách.
    console.log('⏳ Đang tìm và tự động click nút "Xem thêm bình luận"...');
    
    let hasMoreComments = true;
    let clickCount = 0;

    while (hasMoreComments && clickCount < 50) { // Giới hạn số lần click để chống treo vô hạn
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
                console.log('✅ Đã hết nút "Xem thêm bình luận" hoặc đã mở đủ.');
                hasMoreComments = false;
                break;
            }
            
            clickCount++;
            console.log(`👉 Đã click trúng đích "Xem thêm" lần ${clickCount}...`);
            await new Promise(resolve => setTimeout(resolve, 1500));
        } catch (error) {
            console.log('✅ Nút "Xem thêm" đã biến mất hoàn toàn.');
            hasMoreComments = false;
        }
    }
    
    console.log('🔍 Bắt đầu bóc tách song song Nội dung và Ngày đăng...');
    
    // Bóc tách text và chuỗi ngày hiển thị
    const rawReviews = await page.evaluate(() => {
        // Tìm toàn bộ các khối bình luận
        const commentItems = document.querySelectorAll('.item-comment, .review-item'); 
        const results = [];
        
        commentItems.forEach(item => {
            const textNode = item.querySelector('.rd-des');
            const timeNode = item.querySelector('.ru-time, .time, span[datetime], .date'); 
            
            if (textNode) {
                results.push({
                    text: textNode.innerText || textNode.textContent,
                    date_str: timeNode ? (timeNode.innerText || timeNode.textContent) : null
                });
            }
        });
        
        // Fallback: Nếu giao diện đổi class, lấy nội dung không lấy được ngày
        if (results.length === 0) {
            document.querySelectorAll('.rd-des').forEach(node => {
                results.push({ text: node.innerText, date_str: null });
            });
        }
        
        return results;
    });

    const cleanReviews = [];
    
    // Vòng lặp xử lý, làm sạch và chặn ngày (Incremental Scraping)
    for (let item of rawReviews) {
        let formattedText = item.text.replace(/[\r\n]+/g, ' ').trim();
        formattedText = formattedText.replace(/Xem thêm$/g, '').trim();
        formattedText = formattedText.replace(/[^\p{L}\p{N}\p{P}\s]/gu, ''); // Dọn dẹp emoji

        if (isValidComment(formattedText)) {
            // Chuyển chuỗi trên web thành Object Date
            let reviewDate = parseFoodyDate(item.date_str);

            // 🎯 CHỐT CHẶN CỦA THẦY: KIỂM TRA MỐC THỜI GIAN
            if (lastScrapedDate && reviewDate <= new Date(lastScrapedDate)) {
                console.log(`🛑 Đã chạm bình luận cũ (Ngày: ${reviewDate.toISOString()}). Ngắt thu thập dữ liệu!`);
                break; // THOÁT VÒNG LẶP, KHÔNG CÀO CÁC CÂU CŨ PHÍA SAU
            }

            cleanReviews.push({
                content: formattedText,
                review_date: reviewDate.toISOString() // Gửi chuẩn ISO sang Python
            });
        }
    }

    console.log(`💎 Thành phẩm: Thu thập được ${cleanReviews.length} bình luận mới hợp lệ!`);
    await browser.close(); 
    
    // Gửi mảng Object (content + review_date) sang FastAPI
    if (cleanReviews.length > 0) {
        console.log(`🚀 Đang gửi dữ liệu sang FastAPI để AI phân tích...`);
        try {
            const response = await axios.post('http://localhost:8000/predict/batch', {
                reviews: cleanReviews, // 👈 Truyền mảng reviews thay vì texts
                user_id: userId,
                source_url: url
            });
            console.log('🎉 AI VÀ DATABASE ĐÃ XỬ LÝ XONG!');
            return response.data;
        } catch (error) {
            console.error('❌ Lỗi khi kết nối với Backend Python:', error.message);
            throw new Error('Không thể kết nối tới AI Backend');
        }
    } else {
        return { message: "Quán này không có bình luận nào mới kể từ lần cào trước." };
    }
}

// ==========================================
// 4. API ENDPOINT NHẬN LỆNH TỪ FRONTEND
// ==========================================
app.post('/api/scrape', async (req, res) => {
    const { url, user_id } = req.body;

    if (!url || !user_id) {
        return res.status(400).json({ success: false, error: 'Thiếu url hoặc user_id' });
    }

    try {
        let result;
        let lastScrapedDate = null;
        
        // 🎯 LẤY MỐC THỜI GIAN CŨ TỪ FASTAPI TRƯỚC KHI CÀO
        try {
            console.log('⏳ Đang hỏi FastAPI mốc thời gian cào lần cuối...');
            const dateCheck = await axios.get(`http://localhost:8000/api/last-scraped`, {
                params: { source_url: url, user_id: user_id }
            });
            lastScrapedDate = dateCheck.data.last_scraped_date; 
        } catch (err) {
            console.log('⚠️ Trạm Database báo: Quán này chưa cào lần nào hoặc API lỗi. Cào từ đầu.');
        }
        
        // 🚦 TRẠM CHUYỂN MẠCH: KIỂM TRA URL ĐỂ GỌI ĐÚNG BOT
        if (url.includes('foody.vn')) {
            console.log('👉 Phát hiện link Foody. Đang gọi Bot Foody...');
            result = await scrapeFoody(url, user_id, lastScrapedDate); 
            
        } else if (url.includes('google.com') || url.includes('maps.app.goo.gl')) {
            // Nếu bạn có hàm scrapeGoogleMaps, bạn cũng cần cập nhật nó tương tự như Foody nhé
            console.log('👉 Phát hiện link Google Maps. Bot Google Maps hiện chưa cập nhật logic ngày tháng.');
            return res.status(400).json({ success: false, error: 'Bot Google Maps đang bảo trì cập nhật thuật toán thời gian.' });
            
        } else {
            console.log('❌ URL không hợp lệ:', url);
            return res.status(400).json({ 
                success: false, 
                error: 'Hệ thống hiện chỉ hỗ trợ link từ Foody và Google Maps.' 
            });
        }

        res.json({ success: true, data: result });
        
    } catch (error) {
        console.error('🔥 Lỗi server cào dữ liệu:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Khởi động Server ở cổng 3000
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Cỗ máy Web Scraping đang lắng nghe tại http://localhost:${PORT}`);
    console.log('Đang chờ lệnh từ Frontend...');
});