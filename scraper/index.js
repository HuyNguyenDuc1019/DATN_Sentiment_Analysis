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

function extractGoogleMapsPlaceInfo(url) {
  const rawUrl = String(url || '').trim();

  let query = extractGoogleMapsSearchQuery(rawUrl);
  let latitude = null;
  let longitude = null;

  try {
    const decodedUrl = decodeURIComponent(rawUrl);

    const coordMatch = decodedUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);

    if (coordMatch) {
      latitude = Number(coordMatch[1]);
      longitude = Number(coordMatch[2]);
    }

    if (decodedUrl.includes('/place/')) {
      const placeName = decodedUrl.split('/place/')[1].split('/')[0];
      query = placeName.replace(/\+/g, ' ').trim();
    }
  } catch {
    console.log('⚠️ Không thể tách tọa độ Google Maps, dùng từ khóa gốc.');
  }

  return {
    query,
    latitude,
    longitude,
  };
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  if (
    lat1 === null ||
    lon1 === null ||
    lat2 === null ||
    lon2 === null ||
    Number.isNaN(lat1) ||
    Number.isNaN(lon1) ||
    Number.isNaN(lat2) ||
    Number.isNaN(lon2)
  ) {
    return Number.MAX_SAFE_INTEGER;
  }

  const earthRadiusKm = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}

function pickBestGoogleMapsResult(data, placeInfo) {
  if (data.place_results && data.place_results.data_id) {
    const gps = data.place_results.gps_coordinates || {};

    if (placeInfo.latitude !== null && placeInfo.longitude !== null && gps.latitude && gps.longitude) {
      const distance = calculateDistance(
        placeInfo.latitude,
        placeInfo.longitude,
        Number(gps.latitude),
        Number(gps.longitude),
      );

      console.log(
        `📍 Exact Match: ${data.place_results.title || 'Không rõ tên'} - cách tọa độ URL ${distance.toFixed(3)} km`,
      );
    }

    return data.place_results.data_id;
  }

  const localResults = data.local_results || [];

  if (!localResults.length) {
    return null;
  }

  if (placeInfo.latitude !== null && placeInfo.longitude !== null) {
    const sorted = localResults
      .filter((item) => item.data_id)
      .map((item) => {
        const gps = item.gps_coordinates || {};

        const distance = calculateDistance(
          placeInfo.latitude,
          placeInfo.longitude,
          Number(gps.latitude),
          Number(gps.longitude),
        );

        return {
          ...item,
          distance,
        };
      })
      .sort((a, b) => a.distance - b.distance);

    if (sorted.length > 0) {
      console.log(
        `📍 Đã chọn địa điểm gần tọa độ URL nhất: ${sorted[0].title || 'Không rõ tên'} - cách ${sorted[0].distance.toFixed(3)} km`,
      );

      return sorted[0].data_id;
    }
  }

  console.log('⚠️ Không có tọa độ URL, dùng kết quả local_results đầu tiên.');
  return localResults[0].data_id || null;
}

async function findGoogleMapsDataId(url, logLabel = 'Google Maps') {
  const placeInfo = extractGoogleMapsPlaceInfo(url);
  const searchQuery = placeInfo.query;

  console.log(`🔍 Bước 1: Tìm ID quán ${logLabel} cho từ khóa: ${searchQuery}...`);

  let searchUrl = `https://serpapi.com/search.json?engine=google_maps&q=${encodeURIComponent(
    searchQuery,
  )}&api_key=${SERPAPI_KEY}&hl=vi`;

  if (placeInfo.latitude !== null && placeInfo.longitude !== null) {
    searchUrl += `&ll=@${placeInfo.latitude},${placeInfo.longitude},16z`;
    console.log(`📍 Tọa độ từ URL: ${placeInfo.latitude}, ${placeInfo.longitude}`);
  }

  const searchRes = await axios.get(searchUrl);
  const data = searchRes.data;

  const dataId = pickBestGoogleMapsResult(data, placeInfo);

  if (!dataId) {
    throw new Error(`Không tìm thấy địa điểm trên Google Maps cho từ khóa: ${searchQuery}`);
  }

  console.log(`✅ Đã chọn data_id: ${dataId}`);

  return dataId;
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
}) {
  if (!cleanReviews.length) {
    return {
      message: 'Quán này không có bình luận nào mới kể từ lần cào trước.',
    };
  }

  console.log('🚀 Đang gửi dữ liệu sang FastAPI để AI phân tích...');

  try {
    const response = await axios.post(`${PYTHON_API}/predict/batch`, {
      reviews: cleanReviews,
      user_id: userId,
      source_url: url,
      dataset_name: datasetName,
      dataset_type: datasetType,
    });

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
    defaultViewport: null,
  });

  const page = await browser.newPage();

  try {
    console.log(`🌐 Đang truy cập trang: ${url}`);

    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 60000,
    });

    console.log('⏳ Đang đợi Foody khởi tạo giao diện...');
    await new Promise((resolve) => setTimeout(resolve, 2500));

    console.log('⏳ Đang tìm và click nút "Xem thêm bình luận" cho so sánh...');

    let hasMoreComments = true;
    let clickCount = 0;

    while (hasMoreComments && clickCount < 3) {
      try {
        await page.waitForSelector('a.fd-btn-more', {
          timeout: 1500,
        });

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
        console.log(`👉 Compare đã click "Xem thêm" lần ${clickCount}...`);

        await new Promise((resolve) => setTimeout(resolve, 900));
      } catch {
        console.log('✅ Nút "Xem thêm" đã biến mất hoàn toàn.');
        hasMoreComments = false;
      }
    }

    console.log('🔍 Bắt đầu bóc tách bình luận cho so sánh...');

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
      const formattedText = cleanReviewText(item.text);

      if (isValidComment(formattedText)) {
        const reviewDate = parseFoodyDate(item.date_str);

        cleanReviews.push({
          content: formattedText,
          review_date: reviewDate.toISOString(),
        });
      }
    }

    const limitedReviews = cleanReviews.slice(0, COMPARE_MAX_REVIEWS);

    setCompareCache(url, limitedReviews);

    console.log(
      `💎 Compare Foody: Thu thập ${cleanReviews.length}, gửi ${limitedReviews.length} bình luận, cache 15 phút!`,
    );

    return limitedReviews;
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

  try {
    const dataId = await findGoogleMapsDataId(url, 'Google Maps Compare');

    console.log('🔍 Bước 2: Tải bình luận Google Maps cho Compare...');

    const reviewUrl = `https://serpapi.com/search.json?engine=google_maps_reviews&data_id=${dataId}&api_key=${SERPAPI_KEY}&hl=vi&sort_by=newestFirst`;

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

      let safeString = String(rawText);

      if (safeString === '[object Object]') {
        safeString = '';
      }

      const content = cleanReviewText(safeString);

      if (!content) continue;

      const reviewDate = item.iso_date ? new Date(item.iso_date) : new Date();

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
) {
  console.log(`🤖 Nhận lệnh cào Foody từ User ID: ${userId}`);
  console.log(`⏱️ Mốc thời gian dừng cào: ${lastScrapedDate || 'Chưa từng cào'}`);
  console.log('🤖 Khởi động trình duyệt ảo Puppeteer...');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
  });

  const page = await browser.newPage();

  try {
    console.log(`🌐 Đang truy cập trang: ${url}`);

    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 60000,
    });

    console.log('⏳ Đang đợi Foody khởi tạo giao diện...');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    console.log('⏳ Đang tìm và tự động click nút "Xem thêm bình luận"...');

    let hasMoreComments = true;
    let clickCount = 0;

    while (hasMoreComments && clickCount < 50) {
      try {
        await page.waitForSelector('a.fd-btn-more', {
          timeout: 2000,
        });

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

    console.log(`💎 Thành phẩm Foody: Thu thập được ${cleanReviews.length} bình luận mới hợp lệ!`);

    return sendReviewsToPredictBatch({
      cleanReviews,
      userId,
      url,
      datasetName,
      datasetType,
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
) {
  console.log(`🤖 Nhận lệnh cào Google Maps từ User ID: ${userId}`);
  console.log(`⏱️ Mốc thời gian dừng cào: ${lastScrapedDate || 'Chưa từng cào'}`);

  if (!SERPAPI_KEY) {
    throw new Error(
      'Thiếu SERPAPI_KEY. Hãy tạo file .env trong thư mục scraper hoặc set biến môi trường trước khi chạy node index.js.',
    );
  }

  try {
    const dataId = await findGoogleMapsDataId(url, 'Google Maps');

    console.log(`✅ Tìm thấy mã quán data_id: ${dataId}. Bắt đầu tải bình luận...`);

    const cleanReviews = [];
    let nextToken = '';
    let pageCount = 0;
    let isStop = false;

    while (pageCount < 5 && !isStop) {
      pageCount += 1;
      console.log(`⏳ Đang cào dữ liệu Trang ${pageCount}...`);

      let reviewUrl = `https://serpapi.com/search.json?engine=google_maps_reviews&data_id=${dataId}&api_key=${SERPAPI_KEY}&hl=vi&sort_by=newestFirst`;

      if (nextToken) {
        reviewUrl += `&next_page_token=${encodeURIComponent(nextToken)}`;
      }

      const reviewRes = await axios.get(reviewUrl);
      const rawReviews = reviewRes.data.reviews || [];

      if (rawReviews.length === 0) break;

      for (const item of rawReviews) {
        let rawText = item.snippet || item.details || '';

        if (typeof rawText === 'object' && rawText !== null) {
          rawText = rawText.translated || rawText.original || rawText.text || '';
        }

        let safeString = String(rawText);

        if (safeString === '[object Object]') {
          safeString = '';
        }

        const content = cleanReviewText(safeString);

        if (!content) continue;

        const reviewDate = item.iso_date ? new Date(item.iso_date) : new Date();

        if (lastScrapedDate && reviewDate <= new Date(lastScrapedDate)) {
          console.log(
            `🛑 Đã chạm bình luận cũ (${reviewDate.toISOString()}) ở Trang ${pageCount}. Ngắt thu thập!`,
          );
          isStop = true;
          break;
        }

        cleanReviews.push({
          content,
          review_date: reviewDate.toISOString(),
        });
      }

      if (!isStop && reviewRes.data.serpapi_pagination?.next_page_token) {
        nextToken = reviewRes.data.serpapi_pagination.next_page_token;
      } else {
        break;
      }
    }

    if (cleanReviews.length === 0) {
      return {
        message: 'Quán này không có bình luận nào mới.',
        results: [],
        count: 0,
      };
    }

    console.log(
      `💎 Thành phẩm Google Maps: Lật ${pageCount} trang, thu thập được ${cleanReviews.length} bình luận mới hợp lệ!`,
    );

    return sendReviewsToPredictBatch({
      cleanReviews,
      userId,
      url,
      datasetName,
      datasetType,
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

app.post('/api/scrape', async (req, res) => {
  const { url, user_id, dataset_name, dataset_type, custom_start_date } = req.body;

  if (!url || !user_id) {
    return res.status(400).json({
      success: false,
      error: 'Thiếu url hoặc user_id',
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

    let cutoffDate = null;

    if (custom_start_date) {
      console.log(`🕒 User ép buộc mốc thời gian cào từ ngày: ${custom_start_date}`);
      cutoffDate = custom_start_date;
    } else {
      console.log('⏳ Không có mốc tùy chọn. Đang hỏi Database mốc thời gian cào lần cuối...');
      cutoffDate = await getLastScrapedDate({
        url,
        userId: user_id,
      });
    }

    const finalDatasetName = dataset_name || sourceInfo.name;
    const finalDatasetType = dataset_type || sourceInfo.type;

    let result;

    if (sourceInfo.type === 'foody') {
      console.log('👉 Phát hiện link Foody. Đang gọi Bot Foody...');

      result = await scrapeFoody(
        url,
        user_id,
        cutoffDate,
        finalDatasetName,
        finalDatasetType,
      );
    } else if (sourceInfo.type === 'google_maps') {
      console.log('👉 Phát hiện link Google Maps. Đang gọi Bot SerpApi...');

      result = await scrapeGoogleMaps(
        url,
        user_id,
        cutoffDate,
        finalDatasetName,
        finalDatasetType,
      );
    }

    return res.json({
      success: true,
      source_url: url,
      dataset_name: finalDatasetName,
      dataset_type: finalDatasetType,
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