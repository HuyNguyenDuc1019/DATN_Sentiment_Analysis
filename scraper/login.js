const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function loginGoogle() {
    console.log(' Mở trình duyệt để bạn tự đăng nhập...');
    const browser = await puppeteer.launch({ 
        headless: false, 
        defaultViewport: null, 
        channel: 'chrome', 
        // 👇 Bắt buộc phải trỏ vào ĐÚNG thư mục profile của con Bot chính
        userDataDir: './chrome_profile', 
        ignoreDefaultArgs: ['--enable-automation'], 
        
        args: [
            '--lang=vi-VN,vi', 
            '--start-maximized',
            '--disable-blink-features=AutomationControlled'
        ]
    });
    
    const page = await browser.newPage();
    await page.goto('https://accounts.google.com', { waitUntil: 'networkidle2' });
    
    console.log('=========================================');
    console.log('👉 HÃY LÀM THAO TÁC NÀY BẰNG TAY:');
    console.log('1. Đăng nhập một tài khoản Gmail vào cửa sổ vừa hiện lên.');
    console.log('2. Đăng nhập thành công, hãy tự bấm dấu X tắt trình duyệt đi.');
    console.log('=========================================');
    
    // Bot sẽ đứng im mãi mãi để chờ bạn thao tác tay
}

loginGoogle();