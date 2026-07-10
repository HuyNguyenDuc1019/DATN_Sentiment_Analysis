const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const app = express();

const PYTHON_API = 'http://localhost:8000';
const PORT = 3000;

const SERPAPI_KEY = process.env.SERPAPI_KEY || '';

const compareCache = new Map();
const COMPARE_CACHE_TTL_MS = 15 * 60 * 1000;
const COMPARE_MAX_REVIEWS = 25;

const runningScrapeTasks = new Map();

function createScrapeTask(taskId) {
  if (!taskId) return null;

  const task = {
    id: taskId,
    stopped: false,
    createdAt: Date.now(),
  };

  runningScrapeTasks.set(taskId, task);

  return task;
}

function getScrapeTask(taskId) {
  if (!taskId) return null;
  return runningScrapeTasks.get(taskId) || null;
}

function stopScrapeTask(taskId) {
  const task = getScrapeTask(taskId);

  if (!task) {
    return false;
  }

  task.stopped = true;
  return true;
}

function removeScrapeTask(taskId) {
  if (!taskId) return;
  runningScrapeTasks.delete(taskId);
}

function ensureTaskNotStopped(task) {
  if (task?.stopped) {
    const error = new Error('Tác vụ thu thập dữ liệu đã được dừng.');
    error.status = 499;
    throw error;
  }
}

app.use(cors());
app.use(express.json());

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
    reviews,
  });
}

function detectUrlSource(url) {
  const normalized = String(url || '').trim().toLowerCase();

  if (normalized.includes('foody.vn')) {
    return {
      type: 'foody',
      name: 'Foody',
    };
  }

  if (
    normalized.includes('google.com/maps') ||
    normalized.includes('www.google.com/maps') ||
    normalized.includes('maps.google.com') ||
    normalized.includes('maps.app.goo.gl') ||
    normalized.includes('goo.gl/maps') ||
    normalized.includes('google.com/search')
  ) {
    return {
      type: 'google_maps',
      name: 'Google Maps',
    };
  }

  return {
    type: 'unknown',
    name: 'Không xác định',
  };
}

function isValidComment(text) {
  if (!text) return false;

  let cleanText = String(text).trim();

  cleanText = cleanText.replace(/Xem thêm$/g, '').trim();

  if (cleanText.length < 5) return false;
  if (cleanText.split(' ').length < 2) return false;
  if (!/[a-zA-ZÀ-ỹ]/.test(cleanText)) return false;

  return true;
}

function parseFoodyDate(dateStr) {
  if (!dateStr) return new Date();

  const str = String(dateStr).toLowerCase().trim();
  const now = new Date();

  if (str.includes('hôm nay') || str.includes('vừa xong')) {
    return now;
  }

  if (str.includes('hôm qua')) {
    now.setDate(now.getDate() - 1);
    return now;
  }

  if (str.includes('ngày trước')) {
    const days = parseInt(str, 10) || 0;
    now.setDate(now.getDate() - days);
    return now;
  }

  if (str.includes('tháng trước')) {
    const months = parseInt(str, 10) || 0;
    now.setMonth(now.getMonth() - months);
    return now;
  }

  const parts = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);

  if (parts) {
    return new Date(parts[3], parts[2] - 1, parts[1]);
  }

  return now;
}

function parseVietnameseDate(dateString) {
  if (!dateString) return new Date();

  const now = new Date();
  const str = String(dateString).toLowerCase().trim();

  if (str.includes('hôm nay') || str.includes('vừa xong')) {
    return now;
  }

  if (str.includes('hôm qua')) {
    now.setDate(now.getDate() - 1);
    return now;
  }

  const match = str.match(/(\d+)/);
  const num = match ? parseInt(match[1], 10) : 1;

  if (str.includes('phút')) {
    now.setMinutes(now.getMinutes() - num);
  } else if (str.includes('giờ') || str.includes('tiếng')) {
    now.setHours(now.getHours() - num);
  } else if (str.includes('ngày')) {
    now.setDate(now.getDate() - num);
  } else if (str.includes('tuần')) {
    now.setDate(now.getDate() - num * 7);
  } else if (str.includes('tháng')) {
    now.setMonth(now.getMonth() - num);
  } else if (str.includes('năm')) {
    now.setFullYear(now.getFullYear() - num);
  }

  return now;
}

function cleanReviewText(text) {
  return String(text || '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/Xem thêm$/g, '')
    .replace(/[^\p{L}\p{N}\p{P}\s]/gu, '')
    .trim();
}

function extractGoogleMapsSearchQuery(url) {
  let searchQuery = String(url || '').trim();

  try {
    const decodedUrl = decodeURIComponent(searchQuery);

    if (decodedUrl.includes('/place/')) {
      const parts = decodedUrl.split('/place/')[1].split('/')[0];
      searchQuery = parts.replace(/\+/g, ' ').trim();

      console.log(`🪄 Đã ép kiểu Google Maps URL thành từ khóa: "${searchQuery}"`);
      return searchQuery;
    }

    if (decodedUrl.includes('/search/')) {
      const parts = decodedUrl.split('/search/')[1].split('/')[0];
      searchQuery = parts.replace(/\+/g, ' ').trim();

      console.log(`🪄 Đã ép kiểu Google Maps Search URL thành từ khóa: "${searchQuery}"`);
      return searchQuery;
    }

    const parsed = new URL(decodedUrl);
    const q = parsed.searchParams.get('q') || parsed.searchParams.get('query');

    if (q) {
      searchQuery = q.replace(/\+/g, ' ').trim();

      console.log(`🪄 Đã lấy từ khóa Google Maps từ query: "${searchQuery}"`);
      return searchQuery;
    }
  } catch (error) {
    console.log('⚠️ Không thể bóc tách tên quán từ Google Maps URL, dùng URL gốc.');
  }

  return searchQuery;
}

async function getLastScrapedDate({ url, userId }) {
  try {
    console.log('⏳ Đang hỏi FastAPI mốc thời gian cào lần cuối...');

    const dateCheck = await axios.get(`${PYTHON_API}/api/last-scraped`, {
      params: {
        source_url: url,
        user_id: userId,
      },
    });

    return dateCheck.data.last_scraped_date || null;
  } catch (error) {
    console.log('⚠️ Quán này chưa cào lần nào hoặc API last-scraped lỗi. Cào từ đầu.');
    return null;
  }
}

async function sendReviewsToPredictBatch({
  cleanReviews,
  userId,
  url,
  datasetName,
  datasetType,
  scrapeTask = null,
}) {
  ensureTaskNotStopped(scrapeTask);

  if (!cleanReviews.length) {
    return {
      message: 'Quán này không có bình luận nào mới kể từ lần cào trước.',
      results: [],
      count: 0,
    };
  }

  console.log('🚀 Đang gửi dữ liệu sang FastAPI để AI phân tích...');

  try {
    ensureTaskNotStopped(scrapeTask);

    const response = await axios.post(`${PYTHON_API}/predict/batch`, {
      reviews: cleanReviews,
      user_id: userId,
      source_url: url,
      dataset_name: datasetName,
      dataset_type: datasetType,
    });

    ensureTaskNotStopped(scrapeTask);

    console.log('🎉 AI và Database đã xử lý xong!');
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
}

async function scrapeFoody(
  url,
  userId,
  lastScrapedDate,
  datasetName = 'Foody',
  datasetType = 'foody',
  scrapeTask = null,
) {
  console.log(`🤖 Nhận lệnh cào Foody từ User ID: ${userId}`);
  console.log(`⏱️ Mốc thời gian bắt đầu cào: ${lastScrapedDate || 'Chưa từng cào'}`);
  console.log('🤖 Khởi động trình duyệt ảo Puppeteer...');

  ensureTaskNotStopped(scrapeTask);

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
  });

  const page = await browser.newPage();

  try {
    ensureTaskNotStopped(scrapeTask);

    console.log(`🌐 Đang truy cập trang: ${url}`);

    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 60000,
    });

    ensureTaskNotStopped(scrapeTask);

    console.log('⏳ Đang đợi Foody khởi tạo giao diện...');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    ensureTaskNotStopped(scrapeTask);

    console.log('⏳ Đang tìm và tự động click nút "Xem thêm bình luận"...');

    let hasMoreComments = true;
    let clickCount = 0;

    while (hasMoreComments && clickCount < 50) {
      ensureTaskNotStopped(scrapeTask);

      try {
        await page.waitForSelector('a.fd-btn-more', {
          timeout: 2000,
        });

        ensureTaskNotStopped(scrapeTask);

        const clicked = await page.evaluate(() => {
          const buttons = document.querySelectorAll('a.fd-btn-more');

          for (const btn of buttons) {
            if (
              btn.innerText.includes('Xem thêm bình luận') ||
              btn.textContent.includes('Xem thêm bình luận')
            ) {
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

        clickCount += 1;
        console.log(`👉 Đã click "Xem thêm" lần ${clickCount}...`);

        await new Promise((resolve) => setTimeout(resolve, 1500));
      } catch {
        console.log('✅ Nút "Xem thêm" đã biến mất hoàn toàn.');
        hasMoreComments = false;
      }
    }

    ensureTaskNotStopped(scrapeTask);

    console.log('🔍 Bắt đầu bóc tách nội dung và ngày đăng...');

    const rawReviews = await page.evaluate(() => {
      const commentItems = document.querySelectorAll('.item-comment, .review-item');
      const results = [];

      commentItems.forEach((item) => {
        const textNode = item.querySelector('.rd-des');
        const timeNode = item.querySelector('.ru-time, .time, span[datetime], .date');

        if (textNode) {
          results.push({
            text: textNode.innerText || textNode.textContent,
            date_str: timeNode ? timeNode.innerText || timeNode.textContent : null,
          });
        }
      });

      if (results.length === 0) {
        document.querySelectorAll('.rd-des').forEach((node) => {
          results.push({
            text: node.innerText,
            date_str: null,
          });
        });
      }

      return results;
    });

    const cleanReviews = [];
    const seenContents = new Set();
    const startDate = lastScrapedDate ? new Date(lastScrapedDate) : null;

    for (const item of rawReviews) {
      ensureTaskNotStopped(scrapeTask);

      const formattedText = cleanReviewText(item.text);

      if (!isValidComment(formattedText)) {
        continue;
      }

      const reviewDate = parseFoodyDate(item.date_str);

      if (startDate && reviewDate < startDate) {
        console.log(
          `⏭️ Bỏ qua bình luận cũ (${reviewDate.toISOString()}) vì nhỏ hơn mốc ${startDate.toISOString()}`,
        );
        continue;
      }

      const contentKey = formattedText.toLowerCase().replace(/\s+/g, ' ').trim();

      if (seenContents.has(contentKey)) {
        console.log('⏭️ Bỏ qua bình luận trùng nội dung.');
        continue;
      }

      seenContents.add(contentKey);

      cleanReviews.push({
        content: formattedText,
        review_date: reviewDate.toISOString(),
      });
    }

    ensureTaskNotStopped(scrapeTask);

    console.log(`💎 Thành phẩm Foody: Thu thập được ${cleanReviews.length} bình luận mới hợp lệ!`);

    return sendReviewsToPredictBatch({
      cleanReviews,
      userId,
      url,
      datasetName,
      datasetType,
      scrapeTask,
    });
  } finally {
    await browser.close();
  }
}

async function scrapeGoogleMapsForCompare(url) {
  const cachedReviews = getCompareCache(url);

  if (cachedReviews) {
    console.log(`⚡ Compare cache hit: ${cachedReviews.length} bình luận Google Maps`);
    return cachedReviews;
  }

  console.log('⚖️ Đang cào Google Maps cho chức năng so sánh, không lưu DB...');

  if (!SERPAPI_KEY) {
    throw new Error(
      'Thiếu SERPAPI_KEY. Hãy tạo file .env trong thư mục scraper hoặc set biến môi trường trước khi chạy node index.js.',
    );
  }

  const searchQuery = extractGoogleMapsSearchQuery(url);

  try {
    console.log('🔍 Bước 1: Tìm ID quán Google Maps cho Compare...');

    const searchUrl = `https://serpapi.com/search.json?engine=google_maps&q=${encodeURIComponent(
      searchQuery,
    )}&api_key=${SERPAPI_KEY}&hl=vi`;

    const searchRes = await axios.get(searchUrl);
    const data = searchRes.data;

    let dataId = null;

    if (data.place_results && data.place_results.data_id) {
      dataId = data.place_results.data_id;
    } else if (data.local_results && data.local_results.length > 0) {
      dataId = data.local_results[0].data_id;
    }

    if (!dataId) {
      throw new Error(`Không tìm thấy địa điểm trên Google Maps cho từ khóa: ${searchQuery}`);
    }

    console.log('🔍 Bước 2: Tải bình luận Google Maps cho Compare...');

    const reviewUrl = `https://serpapi.com/search.json?engine=google_maps_reviews&data_id=${dataId}&api_key=${SERPAPI_KEY}&hl=vi`;

    const reviewRes = await axios.get(reviewUrl);
    const rawReviews = reviewRes.data.reviews;

    if (!rawReviews || rawReviews.length === 0) {
      return [];
    }

    const cleanReviews = [];

    for (const item of rawReviews) {
      let rawText = item.snippet || item.details || '';

      if (typeof rawText === 'object' && rawText !== null) {
        rawText = rawText.translated || rawText.original || rawText.text || '';
      }

      const content = cleanReviewText(String(rawText));

      if (!content || content.includes('[object Object]')) continue;

      const reviewDate = item.iso_date
        ? new Date(item.iso_date)
        : item.date
          ? parseVietnameseDate(item.date)
          : new Date();

      cleanReviews.push({
        content,
        review_date: reviewDate.toISOString(),
      });
    }

    const limitedReviews = cleanReviews.slice(0, COMPARE_MAX_REVIEWS);

    setCompareCache(url, limitedReviews);

    console.log(
      `💎 Compare Google Maps: Thu thập ${cleanReviews.length}, xuất ${limitedReviews.length} bình luận, cache 15 phút!`,
    );

    return limitedReviews;
  } catch (error) {
    console.error('🔥 Lỗi cào Google Maps Compare:', error.response?.data || error.message);

    throw new Error(
      error.response?.data?.error ||
        error.response?.data?.message ||
        'Lỗi khi gọi API Google Maps SerpApi.',
    );
  }
}

async function scrapeFoody(
  url,
  userId,
  lastScrapedDate,
  datasetName = 'Foody',
  datasetType = 'foody',
  scrapeTask = null,
) {
  console.log(`🤖 Nhận lệnh cào Foody từ User ID: ${userId}`);
  console.log(`⏱️ Mốc thời gian dừng cào: ${lastScrapedDate || 'Chưa từng cào'}`);
  console.log('🤖 Khởi động trình duyệt ảo Puppeteer...');

  ensureTaskNotStopped(scrapeTask);

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
  });

  const page = await browser.newPage();

  try {
    ensureTaskNotStopped(scrapeTask);

    console.log(`🌐 Đang truy cập trang: ${url}`);

    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 60000,
    });

    ensureTaskNotStopped(scrapeTask);

    console.log('⏳ Đang đợi Foody khởi tạo giao diện...');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    ensureTaskNotStopped(scrapeTask);

    console.log('⏳ Đang tìm và tự động click nút "Xem thêm bình luận"...');

    let hasMoreComments = true;
    let clickCount = 0;

    while (hasMoreComments && clickCount < 50) {
      ensureTaskNotStopped(scrapeTask);

      try {
        await page.waitForSelector('a.fd-btn-more', {
          timeout: 2000,
        });

        ensureTaskNotStopped(scrapeTask);

        const clicked = await page.evaluate(() => {
          const buttons = document.querySelectorAll('a.fd-btn-more');

          for (const btn of buttons) {
            if (
              btn.innerText.includes('Xem thêm bình luận') ||
              btn.textContent.includes('Xem thêm bình luận')
            ) {
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

        clickCount += 1;
        console.log(`👉 Đã click "Xem thêm" lần ${clickCount}...`);

        await new Promise((resolve) => setTimeout(resolve, 1500));
      } catch {
        console.log('✅ Nút "Xem thêm" đã biến mất hoàn toàn.');
        hasMoreComments = false;
      }
    }

    ensureTaskNotStopped(scrapeTask);

    console.log('🔍 Bắt đầu bóc tách nội dung và ngày đăng...');

    const rawReviews = await page.evaluate(() => {
      const commentItems = document.querySelectorAll('.item-comment, .review-item');
      const results = [];

      commentItems.forEach((item) => {
        const textNode = item.querySelector('.rd-des');
        const timeNode = item.querySelector('.ru-time, .time, span[datetime], .date');

        if (textNode) {
          results.push({
            text: textNode.innerText || textNode.textContent,
            date_str: timeNode ? timeNode.innerText || timeNode.textContent : null,
          });
        }
      });

      if (results.length === 0) {
        document.querySelectorAll('.rd-des').forEach((node) => {
          results.push({
            text: node.innerText,
            date_str: null,
          });
        });
      }

      return results;
    });

    const cleanReviews = [];

    for (const item of rawReviews) {
      ensureTaskNotStopped(scrapeTask);

      const formattedText = cleanReviewText(item.text);

      if (isValidComment(formattedText)) {
        const reviewDate = parseFoodyDate(item.date_str);

        if (lastScrapedDate && reviewDate <= new Date(lastScrapedDate)) {
          console.log(
            `🛑 Đã chạm bình luận cũ (${reviewDate.toISOString()}). Ngắt thu thập dữ liệu!`,
          );
          break;
        }

        cleanReviews.push({
          content: formattedText,
          review_date: reviewDate.toISOString(),
        });
      }
    }

    ensureTaskNotStopped(scrapeTask);

    console.log(`💎 Thành phẩm Foody: Thu thập được ${cleanReviews.length} bình luận mới hợp lệ!`);

    return sendReviewsToPredictBatch({
      cleanReviews,
      userId,
      url,
      datasetName,
      datasetType,
      scrapeTask,
    });
  } finally {
    await browser.close();
  }
}

async function scrapeGoogleMaps(
  url,
  userId,
  lastScrapedDate,
  datasetName = 'Google Maps',
  datasetType = 'google_maps',
  scrapeTask = null,
) {
  console.log(`🤖 Nhận lệnh cào Google Maps từ User ID: ${userId}`);
  console.log(`⏱️ Mốc thời gian dừng cào: ${lastScrapedDate || 'Chưa từng cào'}`);

  ensureTaskNotStopped(scrapeTask);

  if (!SERPAPI_KEY) {
    throw new Error(
      'Thiếu SERPAPI_KEY. Hãy tạo file .env trong thư mục scraper hoặc set biến môi trường trước khi chạy node index.js.',
    );
  }

  const searchQuery = extractGoogleMapsSearchQuery(url);

  try {
    console.log(`🔍 Bước 1: Tìm ID quán trên Google Maps cho từ khóa: ${searchQuery}...`);

    ensureTaskNotStopped(scrapeTask);

    const searchUrl = `https://serpapi.com/search.json?engine=google_maps&q=${encodeURIComponent(
      searchQuery,
    )}&api_key=${SERPAPI_KEY}&hl=vi`;

    const searchRes = await axios.get(searchUrl);

    ensureTaskNotStopped(scrapeTask);

    const data = searchRes.data;

    let dataId = null;

    if (data.place_results && data.place_results.data_id) {
      dataId = data.place_results.data_id;
      console.log('👉 Bắt được quán ở chế độ Exact Match.');
    } else if (data.local_results && data.local_results.length > 0) {
      dataId = data.local_results[0].data_id;
      console.log('👉 Bắt được quán ở chế độ List Match.');
    }

    if (!dataId) {
      throw new Error(`Không tìm thấy địa điểm trên Google Maps cho từ khóa: ${searchQuery}`);
    }

    console.log(`✅ Tìm thấy mã quán data_id: ${dataId}. Bắt đầu tải bình luận...`);

    const cleanReviews = [];
    let nextToken = null;
    let pageCount = 0;
    let isStop = false;

    while (!isStop && pageCount < 10) {
      ensureTaskNotStopped(scrapeTask);

      pageCount += 1;

      let reviewUrl = `https://serpapi.com/search.json?engine=google_maps_reviews&data_id=${dataId}&api_key=${SERPAPI_KEY}&hl=vi&sort_by=newestFirst`;

      if (nextToken) {
        reviewUrl += `&next_page_token=${encodeURIComponent(nextToken)}`;
      }

      console.log(`📄 Đang tải trang bình luận Google Maps số ${pageCount}...`);

      const reviewRes = await axios.get(reviewUrl);

      ensureTaskNotStopped(scrapeTask);

      const rawReviews = reviewRes.data.reviews || [];

      if (!rawReviews.length) {
        console.log('✅ Không còn bình luận Google Maps để tải.');
        break;
      }

      for (const item of rawReviews) {
        ensureTaskNotStopped(scrapeTask);

        let rawText = item.snippet || item.details || '';

        if (typeof rawText === 'object' && rawText !== null) {
          rawText = rawText.translated || rawText.original || rawText.text || '';
        }

        let safeString = String(rawText);

        if (safeString === '[object Object]') {
          safeString = '';
        }

        const content = cleanReviewText(safeString);

        if (!content || content.includes('[object Object]')) {
          continue;
        }

        let reviewDate;

        if (item.iso_date) {
          reviewDate = new Date(item.iso_date);
        } else if (item.date) {
          reviewDate = parseVietnameseDate(item.date);
        } else {
          reviewDate = new Date();
        }

        if (lastScrapedDate && reviewDate <= new Date(lastScrapedDate)) {
          console.log(
            `🛑 Đã chạm bình luận cũ (Ngày: ${reviewDate.toISOString()}) ở trang ${pageCount}. Ngắt thu thập!`,
          );
          isStop = true;
          break;
        }

        cleanReviews.push({
          content,
          review_date: reviewDate.toISOString(),
        });
      }

      ensureTaskNotStopped(scrapeTask);

      if (!isStop && reviewRes.data.serpapi_pagination?.next_page_token) {
        nextToken = reviewRes.data.serpapi_pagination.next_page_token;

        await new Promise((resolve) => setTimeout(resolve, 1500));
      } else {
        break;
      }
    }

    if (!cleanReviews.length) {
      return {
        message: 'Quán này không có bình luận nào mới kể từ lần cào trước.',
        results: [],
        count: 0,
      };
    }

    ensureTaskNotStopped(scrapeTask);

    console.log(
      `💎 Thành phẩm Google Maps: Thu thập được ${cleanReviews.length} bình luận mới hợp lệ!`,
    );

    return sendReviewsToPredictBatch({
      cleanReviews,
      userId,
      url,
      datasetName,
      datasetType,
      scrapeTask,
    });
  } catch (error) {
    console.error('🔥 Lỗi cào Google Maps:', error.response?.data || error.message);

    throw new Error(
      error.response?.data?.error ||
        error.response?.data?.message ||
        'Lỗi khi gọi API Google Maps SerpApi.',
    );
  }
}

app.post('/api/scrape/stop', (req, res) => {
  const { task_id } = req.body;

  if (!task_id) {
    return res.status(400).json({
      success: false,
      error: 'Thiếu task_id.',
    });
  }

  const stopped = stopScrapeTask(task_id);

  return res.json({
    success: true,
    stopped,
    task_id,
  });
});

app.post('/api/scrape', async (req, res) => {
  const {
    task_id,
    url,
    user_id,
    dataset_name,
    dataset_type,
    custom_start_date,
  } = req.body;

  if (!url || !user_id) {
    return res.status(400).json({
      success: false,
      error: 'Thiếu url hoặc user_id',
    });
  }

  const scrapeTask = createScrapeTask(task_id);

  try {
    const sourceInfo = detectUrlSource(url);

    if (sourceInfo.type === 'unknown') {
      return res.status(400).json({
        success: false,
        error: 'Hệ thống hiện chỉ hỗ trợ link từ Foody và Google Maps.',
      });
    }

    ensureTaskNotStopped(scrapeTask);

    const dbLastScrapedDate = await getLastScrapedDate({
      url,
      userId: user_id,
    });

    const lastScrapedDate = custom_start_date || dbLastScrapedDate;

    if (custom_start_date) {
      console.log(`📅 Sử dụng mốc ngày tùy chọn từ người dùng: ${custom_start_date}`);
    } else {
      console.log(
        `📅 Sử dụng mốc ngày tự động từ database: ${dbLastScrapedDate || 'Chưa có'}`,
      );
    }

    ensureTaskNotStopped(scrapeTask);

    const finalDatasetName = dataset_name || sourceInfo.name;
    const finalDatasetType = dataset_type || sourceInfo.type;

    let result;

    if (sourceInfo.type === 'foody') {
      console.log('👉 Phát hiện link Foody. Đang gọi Bot Foody...');

      result = await scrapeFoody(
        url,
        user_id,
        lastScrapedDate,
        finalDatasetName,
        finalDatasetType,
        scrapeTask,
      );
    } else if (sourceInfo.type === 'google_maps') {
      console.log('👉 Phát hiện link Google Maps. Đang gọi Bot SerpApi...');

      result = await scrapeGoogleMaps(
        url,
        user_id,
        lastScrapedDate,
        finalDatasetName,
        finalDatasetType,
        scrapeTask,
      );
    }

    return res.json({
      success: true,
      source_url: url,
      dataset_name: finalDatasetName,
      dataset_type: finalDatasetType,
      custom_start_date: custom_start_date || null,
      last_scraped_date_used: lastScrapedDate || null,
      data: result,
    });
  } catch (error) {
    console.error('🔥 Lỗi server cào dữ liệu:', error.message);

    return res.status(error.status || 500).json({
      success: false,
      error: error.message,
      detail: error.message,
      status: error.status || 500,
    });
  } finally {
    removeScrapeTask(task_id);
  }
});

app.post('/api/compare/scrape', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({
      success: false,
      error: 'Thiếu url',
    });
  }

  try {
    const sourceInfo = detectUrlSource(url);

    if (sourceInfo.type === 'unknown') {
      return res.status(400).json({
        success: false,
        error: 'Hệ thống hiện chỉ hỗ trợ link từ Foody và Google Maps.',
      });
    }

    let reviews = [];

    if (sourceInfo.type === 'foody') {
      console.log('⚖️ Phát hiện link Foody. Đang cào dữ liệu cho so sánh...');
      reviews = await scrapeFoodyForCompare(url);
    } else if (sourceInfo.type === 'google_maps') {
      console.log('⚖️ Phát hiện link Google Maps. Đang cào dữ liệu cho so sánh...');
      reviews = await scrapeGoogleMapsForCompare(url);
    }

    return res.json({
      success: true,
      source_url: url,
      dataset_name: sourceInfo.name,
      dataset_type: sourceInfo.type,
      total_reviews: reviews.length,
      reviews,
    });
  } catch (error) {
    console.error('🔥 Lỗi server cào dữ liệu so sánh:', error.message);

    return res.status(error.status || 500).json({
      success: false,
      error: error.message,
      detail: error.message,
      status: error.status || 500,
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Cỗ máy Web Scraping đang lắng nghe tại http://localhost:${PORT}`);
  console.log('Đang chờ lệnh từ Frontend...');
});