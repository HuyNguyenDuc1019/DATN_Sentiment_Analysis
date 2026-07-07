const express = require('express');
const cors = require('cors');
const axios = require('axios');
// Khai báo thư viện tàng hình
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const app = express();

// ==========================================
// 0. CACHE TẠM CHO CHỨC NĂNG SO SÁNH
// Cache 15 phút để user bấm so sánh lại không phải cào lại.
// Cache này nằm trong RAM, không lưu DB.
// ==========================================
const compareCache = new Map();
const COMPARE_CACHE_TTL_MS = 15 * 60 * 1000;
const COMPARE_MAX_REVIEWS = 25;

function getCompareCache(url) {
    const cached = compareCache.get(url);

    if (!cached) return null;

    const isExpired = Date.now() - cached.createdAt > COMPARE_CACHE_TTL_MS;
    if (isExpired) {
        compareCache.delete(url);
        return null;
    }

    return cached.reviews;
}

function setCompareCache(url, reviews) {
    compareCache.set(url, {
        createdAt: Date.now(),
        reviews
    });
}

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
    if (!dateStr) return new Date();
    
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
    
    let parts = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (parts) {
        return new Date(parts[3], parts[2] - 1, parts[1]); 
    }
    
    return now;
}

// ==========================================
// 3.1. CÀO FOODY CHỈ ĐỂ SO SÁNH, KHÔNG LƯU DB
// Endpoint compare sẽ dùng hàm này.
// Hàm này chỉ trả về reviews, KHÔNG gọi /predict/batch.
// Vì vậy dữ liệu so sánh không bị ghi vào scraped_reviews.
// ==========================================
async function scrapeFoodyForCompare(url) {
    const cachedReviews = getCompareCache(url);
    if (cachedReviews) {
        console.log(`⚡ Compare cache hit: ${cachedReviews.length} bình luận cho ${url}`);
        return cachedReviews;
    }

    console.log('⚖️ Đang cào Foody cho chức năng so sánh, không lưu DB...');
    console.log('🤖 Khởi động trình duyệt ảo Puppeteer...');

    const browser = await puppeteer.launch({ 
        headless: false,
        defaultViewport: null 
    });

    const page = await browser.newPage();

    try {
        console.log(`🌐 Đang truy cập trang: ${url}`);
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

        console.log('⏳ Đang đợi Foody khởi tạo giao diện...');
        await new Promise(resolve => setTimeout(resolve, 2500));

        console.log('⏳ Đang tìm và tự động click nút "Xem thêm bình luận" cho so sánh...');

        let hasMoreComments = true;
        let clickCount = 0;

        // Compare chỉ cần lấy nhanh một mẫu bình luận, không cần cào quá sâu như Dashboard
        while (hasMoreComments && clickCount < 3) {
            try {
                await page.waitForSelector('a.fd-btn-more', { timeout: 1500 });
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
                console.log(`👉 Compare đã click "Xem thêm" lần ${clickCount}...`);
                await new Promise(resolve => setTimeout(resolve, 900));
            } catch (error) {
                console.log('✅ Nút "Xem thêm" đã biến mất hoàn toàn.');
                hasMoreComments = false;
            }
        }

        console.log('🔍 Bắt đầu bóc tách bình luận cho so sánh...');

        const rawReviews = await page.evaluate(() => {
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

            if (results.length === 0) {
                document.querySelectorAll('.rd-des').forEach(node => {
                    results.push({ text: node.innerText, date_str: null });
                });
            }

            return results;
        });

        const cleanReviews = [];

        for (let item of rawReviews) {
            let formattedText = item.text.replace(/[\r\n]+/g, ' ').trim();
            formattedText = formattedText.replace(/Xem thêm$/g, '').trim();
            formattedText = formattedText.replace(/[^\p{L}\p{N}\p{P}\s]/gu, '');

            if (isValidComment(formattedText)) {
                let reviewDate = parseFoodyDate(item.date_str);

                cleanReviews.push({
                    content: formattedText,
                    review_date: reviewDate.toISOString()
                });
            }
        }

        const limitedReviews = cleanReviews.slice(0, COMPARE_MAX_REVIEWS);
        setCompareCache(url, limitedReviews);

        console.log(`💎 Compare scrape: Thu thập ${cleanReviews.length}, gửi ${limitedReviews.length} bình luận, cache 15 phút!`);
        return limitedReviews;

    } finally {
        await browser.close();
    }
}

// ==========================================
// 3.2. CÀO GOOGLE MAPS CHỈ ĐỂ SO SÁNH, KHÔNG LƯU DB
// ==========================================
async function scrapeGoogleMapsForCompare(url) {
    // 1. Kiểm tra Cache trước cho nhẹ server
    const cachedReviews = getCompareCache(url);
    if (cachedReviews) {
        console.log(`⚡ Compare cache hit: ${cachedReviews.length} bình luận cho Google Maps`);
        return cachedReviews;
    }

    console.log('⚖️ Đang cào Google Maps cho chức năng so sánh, không lưu DB...');
    
    // ĐIỀN MÃ API KEY CỦA BẠN VÀO ĐÂY LẦN NỮA NHÉ
    const API_KEY = "2d7afde6c5f875e747f9bf067e8147e6c0b63aec2dab90fddf70e621f357c92f"; 

    // 2. Chặt thịt URL lấy từ khóa (Y chang hàm chuẩn)
    let searchQuery = url;
    if (url.includes('/place/')) {
        try {
            const parts = url.split('/place/')[1].split('/')[0];
            searchQuery = decodeURIComponent(parts.replace(/\+/g, ' '));
            console.log(`🪄 [Compare] Đã ép kiểu URL thành: "${searchQuery}"`);
        } catch (e) {
            console.log('⚠️ Không thể tự bóc tách tên quán, sử dụng URL gốc.');
        }
    }

    try {
        console.log(`🔍 Bước 1: Tìm ID quán cho chức năng Compare...`);
        const searchUrl = `https://serpapi.com/search.json?engine=google_maps&q=${encodeURIComponent(searchQuery)}&api_key=${API_KEY}&hl=vi`;
        const searchRes = await axios.get(searchUrl);
        const data = searchRes.data;

        // Xử lý tìm ID ở cả 2 trường hợp như đã fix
        let dataId = null;
        if (data.place_results && data.place_results.data_id) {
            dataId = data.place_results.data_id;
        } else if (data.local_results && data.local_results.length > 0) {
            dataId = data.local_results[0].data_id;
        }

        if (!dataId) {
            throw new Error(`Không tìm thấy địa điểm trên bản đồ cho từ khóa: ${searchQuery}`);
        }

        // 3. Cào bình luận
        console.log(`🔍 Bước 2: Tải bình luận Google Maps (Compare)...`);
        const reviewUrl = `https://serpapi.com/search.json?engine=google_maps_reviews&data_id=${dataId}&api_key=${API_KEY}&hl=vi`;
        const reviewRes = await axios.get(reviewUrl);
        const rawReviews = reviewRes.data.reviews;

        if (!rawReviews || rawReviews.length === 0) {
            return [];
        }

        const cleanReviews = [];
        for (let item of rawReviews) {
            let content = item.snippet || item.details || "";
            if (!content || content.trim() === "") continue;

            let reviewDate = item.iso_date ? new Date(item.iso_date) : new Date();

            cleanReviews.push({
                content: content.replace(/[\r\n]+/g, ' ').trim(),
                review_date: reviewDate.toISOString()
            });
        }

        // 4. Giới hạn số lượng review và lưu Cache y như Foody
        const limit = typeof COMPARE_MAX_REVIEWS !== 'undefined' ? COMPARE_MAX_REVIEWS : 50;
        const limitedReviews = cleanReviews.slice(0, limit);

        setCompareCache(url, limitedReviews);
        console.log(`💎 Compare Google Maps: Thu thập ${cleanReviews.length}, xuất ${limitedReviews.length} bình luận, lưu cache!`);

        return limitedReviews;

    } catch (error) {
        console.error('🔥 Lỗi cào Google Maps (Compare):', error.response?.data || error.message);
        throw new Error(error.response?.data?.error || "Lỗi khi gọi API Google Maps (SerpApi).");
    }
}

// ==========================================
// 3. CỖ MÁY CÀO DỮ LIỆU FOODY
// ==========================================
async function scrapeFoody(url, userId, lastScrapedDate) {
    console.log(`🤖 Nhận lệnh cào từ User ID: ${userId}`);
    console.log(`⏱️ Mốc thời gian dừng cào (Last Scraped): ${lastScrapedDate || 'Chưa từng cào (Cào từ đầu)'}`);
    console.log('🤖 Khởi động trình duyệt ảo Puppeteer...');
    
    const browser = await puppeteer.launch({ 
        headless: false,
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

    while (hasMoreComments && clickCount < 50) {
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
    
    const rawReviews = await page.evaluate(() => {
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
        
        if (results.length === 0) {
            document.querySelectorAll('.rd-des').forEach(node => {
                results.push({ text: node.innerText, date_str: null });
            });
        }
        
        return results;
    });

    const cleanReviews = [];
    
    for (let item of rawReviews) {
        let formattedText = item.text.replace(/[\r\n]+/g, ' ').trim();
        formattedText = formattedText.replace(/Xem thêm$/g, '').trim();
        formattedText = formattedText.replace(/[^\p{L}\p{N}\p{P}\s]/gu, '');

        if (isValidComment(formattedText)) {
            let reviewDate = parseFoodyDate(item.date_str);

            if (lastScrapedDate && reviewDate <= new Date(lastScrapedDate)) {
                console.log(`🛑 Đã chạm bình luận cũ (Ngày: ${reviewDate.toISOString()}). Ngắt thu thập dữ liệu!`);
                break;
            }

            cleanReviews.push({
                content: formattedText,
                review_date: reviewDate.toISOString()
            });
        }
    }

    console.log(`💎 Thành phẩm: Thu thập được ${cleanReviews.length} bình luận mới hợp lệ!`);
    await browser.close(); 
    
    if (cleanReviews.length > 0) {
        console.log('🚀 Đang gửi dữ liệu sang FastAPI để AI phân tích...');
        try {
            const response = await axios.post('http://localhost:8000/predict/batch', {
                reviews: cleanReviews,
                user_id: userId,
                source_url: url
            });
            console.log('🎉 AI VÀ DATABASE ĐÃ XỬ LÝ XONG!');
            return response.data;
        } catch (error) {
            const status = error.response?.status;
            const backendMessage =
                error.response?.data?.detail ||
                error.response?.data?.message ||
                error.response?.data?.error ||
                error.message;

            console.error('❌ Lỗi từ Backend Python:', status || 'NO_STATUS', backendMessage);

            const apiError = new Error(backendMessage || 'Không thể kết nối tới AI Backend');
            apiError.status = status || 500;
            throw apiError;
        }
    } else {
        return { message: "Quán này không có bình luận nào mới kể từ lần cào trước." };
    }
}

// ==========================================
// 3.5. CỖ MÁY CÀO DỮ LIỆU GOOGLE MAPS (SERPAPI)
// ==========================================
async function scrapeGoogleMaps(url, userId, lastScrapedDate) {
    console.log(`🤖 Nhận lệnh cào Google Maps từ User ID: ${userId}`);
    console.log(`⏱️ Mốc thời gian dừng cào (Last Scraped): ${lastScrapedDate || 'Chưa từng cào'}`);
    
    // ĐIỀN MÃ API KEY CỦA BẠN VÀO ĐÂY
    const API_KEY = "2d7afde6c5f875e747f9bf067e8147e6c0b63aec2dab90fddf70e621f357c92f"; 

    // -------- 🪄 BƯỚC MỚI: XỬ LÝ URL --------
    let searchQuery = url;
    if (url.includes('/place/')) {
        try {
            // Cắt URL lấy phần tên quán (nằm giữa /place/ và dấu / tiếp theo)
            const parts = url.split('/place/')[1].split('/')[0];
            // Giải mã các ký tự %20, dấu + thành tiếng Việt có dấu
            searchQuery = decodeURIComponent(parts.replace(/\+/g, ' '));
            console.log(`🪄 Đã ép kiểu URL thành Từ khóa tìm kiếm: "${searchQuery}"`);
        } catch (e) {
            console.log('⚠️ Không thể tự bóc tách tên quán, sử dụng URL gốc.');
        }
    }
    // ----------------------------------------

try {
        console.log(`🔍 Bước 1: Đang tìm ID của quán trên Google Maps cho từ khóa: ${searchQuery}...`);
        
        const searchUrl = `https://serpapi.com/search.json?engine=google_maps&q=${encodeURIComponent(searchQuery)}&api_key=${API_KEY}&hl=vi`;
        
        const searchRes = await axios.get(searchUrl);
        const data = searchRes.data; // Lấy toàn bộ dữ liệu trả về

        // -------- BẢN NÂNG CẤP: TÌM DATA_ID Ở CẢ 2 TRƯỜNG HỢP --------
        let dataId = null;

        if (data.place_results && data.place_results.data_id) {
            // Trường hợp A: Trả về chính xác 1 quán duy nhất
            dataId = data.place_results.data_id;
            console.log("👉 Bắt được quán ở chế độ Exact Match (place_results)!");
        } else if (data.local_results && data.local_results.length > 0) {
            // Trường hợp B: Trả về một danh sách quán
            dataId = data.local_results[0].data_id;
            console.log("👉 Bắt được quán ở chế độ List Match (local_results)!");
        }

        if (!dataId) {
            // Nếu lục cả 2 hộp đều không có thì mới báo lỗi
            throw new Error(`Không tìm thấy địa điểm trên bản đồ cho từ khóa: ${searchQuery}`);
        }
        // -------------------------------------------------------------

        console.log(`✅ Tìm thấy mã quán (data_id: ${dataId}). Bắt đầu tải bình luận...`);

        // ==========================================
        // 🔍 Bước 2: Gọi API lấy danh sách bình luận (GIỮ NGUYÊN CODE CŨ BÊN DƯỚI)
        // ==========================================
        console.log('🔍 Bước 2: Gọi API lấy danh sách bình luận...');
        const reviewUrl = `https://serpapi.com/search.json?engine=google_maps_reviews&data_id=${dataId}&api_key=${API_KEY}&hl=vi`;
        const reviewRes = await axios.get(reviewUrl);
        const rawReviews = reviewRes.data.reviews;

        if (!rawReviews || rawReviews.length === 0) {
            return { message: "Quán này không có bình luận nào." };
        }

        const cleanReviews = [];

        for (let item of rawReviews) {
            // Lấy nội dung (SerpApi để ở trường snippet)
            let content = item.snippet || item.details || "";
            if (!content || content.trim() === "") continue; // Bỏ qua review chỉ chấm sao, ko viết chữ

            // Lấy ngày tháng chuẩn ISO (Cái này SerpApi trả về sẵn, quá sướng!)
            let reviewDate = item.iso_date ? new Date(item.iso_date) : new Date();

            // So sánh thời gian để ngắt cào nếu đụng review cũ
            if (lastScrapedDate && reviewDate <= new Date(lastScrapedDate)) {
                console.log(`🛑 Đã chạm bình luận cũ (Ngày: ${reviewDate.toISOString()}). Ngắt thu thập!`);
                break;
            }

            cleanReviews.push({
                content: content.replace(/[\r\n]+/g, ' ').trim(),
                review_date: reviewDate.toISOString()
            });
        }

        console.log(`💎 Thành phẩm: Thu thập được ${cleanReviews.length} bình luận mới hợp lệ!`);

        // ------------------------------------------
        console.log('🚀 Đang gửi dữ liệu sang FastAPI để AI phân tích...');
        if (cleanReviews.length > 0) {
            const response = await axios.post('http://localhost:8000/predict/batch', {
                reviews: cleanReviews,
                user_id: userId,
                source_url: url
            });
            console.log('🎉 AI VÀ DATABASE ĐÃ XỬ LÝ XONG (GOOGLE MAPS)!');
            return response.data;
        } else {
            return { message: "Quán này không có bình luận nào mới kể từ lần cào trước." };
        }

    } catch (error) {
        console.error('🔥 Lỗi cào Google Maps:', error.response?.data || error.message);
        throw new Error(error.response?.data?.error || "Lỗi khi gọi API Google Maps (SerpApi).");
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
        
        try {
            console.log('⏳ Đang hỏi FastAPI mốc thời gian cào lần cuối...');
            const dateCheck = await axios.get('http://localhost:8000/api/last-scraped', {
                params: { source_url: url, user_id: user_id }
            });
            lastScrapedDate = dateCheck.data.last_scraped_date; 
        } catch (err) {
            console.log('⚠️ Trạm Database báo: Quán này chưa cào lần nào hoặc API lỗi. Cào từ đầu.');
        }
        
        if (url.includes('foody.vn')) {
            console.log('👉 Phát hiện link Foody. Đang gọi Bot Foody...');
            result = await scrapeFoody(url, user_id, lastScrapedDate); 
            
            } else if (url.includes('google.com') || url.includes('maps')) {
            console.log('👉 Phát hiện link Google Maps. Đang gọi Bot SerpApi...');
            // Chuyển sang gọi hàm scrapeGoogleMaps vừa tạo ở trên
            result = await scrapeGoogleMaps(url, user_id, lastScrapedDate);
            
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
        res.status(error.status || 500).json({
            success: false,
            error: error.message,
            detail: error.message,
            status: error.status || 500
        });
    }
});

// ==========================================
// 5. API ENDPOINT CÀO DỮ LIỆU CHO CHỨC NĂNG SO SÁNH
// Chỉ trả về reviews, KHÔNG gọi FastAPI /predict/batch.
// Vì vậy không lưu vào scraped_reviews và không làm nhiễu Dashboard.
// ==========================================
app.post('/api/compare/scrape', async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ success: false, error: 'Thiếu url' });
    }

    try {
        let reviews;

        if (url.includes('foody.vn')) {
            console.log('⚖️ Phát hiện link Foody. Đang cào dữ liệu cho so sánh...');
            reviews = await scrapeFoodyForCompare(url);
        } else if (url.includes('google.com') || url.includes('maps')) {
            console.log('⚖️ Phát hiện link Google Maps. Đang cào dữ liệu cho so sánh...');
            reviews = await scrapeGoogleMapsForCompare(url);
        } else {
            console.log('❌ URL không hợp lệ:', url);
            return res.status(400).json({
                success: false,
                error: 'Hệ thống hiện chỉ hỗ trợ link từ Foody và Google Maps.'
            });
        }

        return res.json({
            success: true,
            source_url: url,
            total_reviews: reviews.length,
            reviews
        });

    } catch (error) {
        console.error('🔥 Lỗi server cào dữ liệu so sánh:', error.message);
        return res.status(error.status || 500).json({
            success: false,
            error: error.message,
            detail: error.message,
            status: error.status || 500
        });
    }
});

// Khởi động Server ở cổng 3000
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Cỗ máy Web Scraping đang lắng nghe tại http://localhost:${PORT}`);
    console.log('Đang chờ lệnh từ Frontend...');
});