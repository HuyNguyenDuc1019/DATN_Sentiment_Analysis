const puppeteer = require('puppeteer');
const axios = require('axios');

// ==========================================
// HÀM LỌC RÁC (TIỀN XỬ LÝ DỮ LIỆU)
// ==========================================
function isValidComment(text) {
    if (!text) return false;
    let cleanText = text.trim();
    
    // Loại bỏ chữ "Xem thêm" dính ở cuối bình luận dài
    cleanText = cleanText.replace(/Xem thêm$/g, '').trim();
    
    // (Đã xóa dòng replace icon ở đây vì nó chỉ đánh giá biến cục bộ chứ không làm thay đổi chuỗi gốc)

    if (cleanText.length < 5) return false; // Quá ngắn
    if (cleanText.split(' ').length < 2) return false; // Không đủ chữ
    if (!/[a-zA-ZÀ-ỹ]/.test(cleanText)) return false; // Chỉ toàn số/icon

    return true;
}

// ==========================================
// KỊCH BẢN CÀO DỮ LIỆU CÓ AUTO-CLICK
// ==========================================
async function scrapeFoody(url) {
    console.log('🤖 Khởi động trình duyệt ảo Puppeteer...');
    
    const browser = await puppeteer.launch({ 
        headless: false, // Vẫn để false để bạn nhìn nó tự click
        defaultViewport: null 
    });
    
    const page = await browser.newPage();

    console.log(`🌐 Đang truy cập trang: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2' });

    console.log('⏳ Đang đợi Foody khởi tạo giao diện (AngularJS)...');
    // Dừng 3 giây để đảm bảo Foody đã render xong cái nút
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('⏳ Đang tìm và tự động click nút "Xem thêm bình luận"...');
    
    let hasMoreComments = true;
    let clickCount = 0;

    while (hasMoreComments) {
        try {
            // Đợi 2 giây xem có thẻ fd-btn-more nào trên màn hình không
            await page.waitForSelector('a.fd-btn-more', { timeout: 2000 });
            
            // Chọc vào DOM, lặp qua tất cả các nút và chỉ click nút đúng mục tiêu
            const clicked = await page.evaluate(() => {
                const buttons = document.querySelectorAll('a.fd-btn-more');
                for (let btn of buttons) {
                    // Kiểm tra xem chữ trên nút có phải là Xem thêm bình luận không
                    if (btn.innerText.includes('Xem thêm bình luận') || btn.textContent.includes('Xem thêm bình luận')) {
                        btn.click();
                        return true; // Báo hiệu đã click thành công
                    }
                }
                return false; // Báo hiệu không tìm thấy nút nào có chữ này
            });

            // Nếu quét hết các nút mà không có nút "Xem thêm bình luận", nghĩa là đã cạn kiệt
            if (!clicked) {
                console.log('✅ Đã hết nút "Xem thêm bình luận". Đã mở khóa toàn bộ!');
                hasMoreComments = false;
                break;
            }
            
            clickCount++;
            console.log(`👉 Đã click trúng đích "Xem thêm" lần ${clickCount}...`);
            
            // Đợi 2 giây cho dữ liệu mới tải ra
            await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
            // Hết nút do Foody ẩn đi
            console.log('✅ Nút "Xem thêm" đã biến mất hoàn toàn.');
            hasMoreComments = false;
        }
    }
    
    console.log('🔍 Bắt đầu bóc tách và lọc dữ liệu...');
    // Lấy dữ liệu (sử dụng lại logic cũ của bạn)
    const rawReviews = await page.evaluate(() => {
        // Selector chứa text bình luận (giữ nguyên cái hôm trước bạn đã tìm đúng)
        const commentSelector = '.rd-des'; 
        const nodes = document.querySelectorAll(commentSelector);
        const results = [];
        nodes.forEach(node => {
            const text = node.innerText || node.textContent;
            if (text) results.push(text);
        });
        return results;
    });

    console.log(`🗑️ Đã cào được ${rawReviews.length} câu thô. Bắt đầu đưa qua màng lọc...`);
    
    // Lọc rác và xử lý mảng
    const cleanReviews = [];
    rawReviews.forEach(text => {
        // Loại bỏ mấy cái xuống dòng \n để câu liền mạch
        let formattedText = text.replace(/[\r\n]+/g, ' ').trim();
        
        // Loại bỏ chữ "Xem thêm" bị dính trong text
        formattedText = formattedText.replace(/Xem thêm$/g, '').trim();

        // XÓA ICON / EMOJI TRỰC TIẾP TẠI ĐÂY
        // Áp dụng regex dọn dẹp thẳng vào biến formattedText trước khi đưa vào mảng
        formattedText = formattedText.replace(/[^\p{L}\p{N}\p{P}\s]/gu, '');

        if (isValidComment(formattedText)) {
             // Chuỗi lúc này đã sạch bóng icon, an toàn để đưa vào mảng
            cleanReviews.push(formattedText);
        }
    });

    console.log(`💎 Thành phẩm: Giữ lại được ${cleanReviews.length} bình luận chất lượng!`);
    console.log(cleanReviews);

    // ==========================================
    // GỌI API FASTAPI ĐỂ PHÂN LOẠI CẢM XÚC
    // ==========================================
    if (cleanReviews.length > 0) {
        console.log(`🚀 Đang gửi ${cleanReviews.length} bình luận sang AI Backend (FastAPI)...`);
        try {
            // Nhớ đảm bảo Terminal chạy uvicorn (FastAPI) của bạn đang được bật
            const response = await axios.post('http://localhost:8000/predict/batch', {
                texts: cleanReviews
            });
            
            console.log('🎉 AI ĐÃ XỬ LÝ XONG MẢNG DỮ LIỆU LỚN!');
            console.log(`⏱️ Thời gian suy luận: ${response.data.processing_time}`);
            console.log('📊 Trích xuất 3 kết quả đầu tiên để nghiệm thu:');
            console.log(response.data.results.slice(0, 3));
            
        } catch (error) {
            console.error('❌ Lỗi khi kết nối với Backend:', error.message);
            console.error('Vui lòng kiểm tra xem server FastAPI ở cổng 8000 đã bật chưa.');
        }
    }

    await browser.close(); 
}

const testUrl = 'https://www.foody.vn/ho-chi-minh/tau-hu-xe-lam-tran-hung-dao';
scrapeFoody(testUrl);