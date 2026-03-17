import { db } from './firebase-config.js';
import { collection, onSnapshot, doc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const translations = {
    en: { searchPlaceholder: "Search channels...", settings: "Settings", language: "Language", theme: "Theme", adminInfo: "Developer Info", adminPanel: "Admin Panel", notifications: "Notifications", allChannels: "All Channels", home: "Home", favorites: "Favorites", tvMode: "TV Mode", advertisement: "Advertisement" },
    ar: { searchPlaceholder: "البحث عن القنوات...", settings: "الإعدادات", language: "اللغة", theme: "المظهر", adminInfo: "معلومات المطور", adminPanel: "لوحة الإدارة", notifications: "الإشعارات", allChannels: "كل القنوات", home: "الرئيسية", favorites: "المفضلة", tvMode: "وضع التلفزيون", advertisement: "إعلان" },
    ku: { searchPlaceholder: "گەڕان بۆ کەناڵەکان...", settings: "ڕێکخستنەکان", language: "زمان", theme: "ڕووکار", adminInfo: "زانیاری گەشەپێدەر", adminPanel: "پەنێڵی ئەدمین", notifications: "ئاگادارکردنەوەکان", allChannels: "هەموو کەناڵەکان", home: "سەرەکی", favorites: "دڵخوازەکان", tvMode: "دۆخی تەلەفزیۆن", advertisement: "ڕیکلام" },
    fa: { searchPlaceholder: "جستجوی کانال ها...", settings: "تنظیمات", language: "زبان", theme: "پوسته", adminInfo: "اطلاعات توسعه دهنده", adminPanel: "پنل مدیریت", notifications: "اعلان ها", allChannels: "همه کانال ها", home: "خانه", favorites: "علاقه مندی ها", tvMode: "حالت تلویزیون", advertisement: "تبلیغات" },
    tr: { searchPlaceholder: "Kanal ara...", settings: "Ayarlar", language: "Dil", theme: "Tema", adminInfo: "Geliştirici Bilgisi", adminPanel: "Yönetici Paneli", notifications: "Bildirimler", allChannels: "Tüm Kanallar", home: "Ana Sayfa", favorites: "Favoriler", tvMode: "TV Modu", advertisement: "Reklam" }
};

let state = {
    channels: [],
    categories: [],
    slides: [],
    notifications: [],
    ads: { bannerUrl: '', link: '', active: false },
    favorites: JSON.parse(localStorage.getItem('iptv_favs')) || [],
    theme: localStorage.getItem('iptv_theme') || 'dark',
    language: localStorage.getItem('iptv_lang') || 'en',
    currentCategory: 'all',
    searchQuery: ''
};

// Shaka Player Variables
let shakaPlayer = null;
let slideIndex = 0;
let slideInterval;

// --- Initialize ---
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    initTheme();
    initLanguage();
    setupEventListeners();
    
    // ئامادەکردنی Shaka Player
    initShakaApp();
    
    // Firebase Listeners
    onSnapshot(collection(db, 'channels'), (snapshot) => {
        state.channels = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderChannels(document.querySelector('.nav-item.active')?.getAttribute('data-tab') === 'favorites');
    });

    onSnapshot(collection(db, 'categories'), (snapshot) => {
        state.categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderCategories();
    });

    onSnapshot(collection(db, 'slider'), (snapshot) => {
        state.slides = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderSlider();
    });

    onSnapshot(collection(db, 'notifications'), (snapshot) => {
        state.notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // updateNotifBadge(); // ئەگەر فەنکشنی بۆ هەیە
    });

    onSnapshot(doc(db, 'settings', 'ads'), (docSnap) => {
        if (docSnap.exists()) {
            state.ads = docSnap.data();
            // renderAds(); // ئەگەر فەنکشنی بۆ هەیە
        }
    });

    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch(err => console.log("SW error", err));
    }
});

// --- Shaka Player Setup ---
function initShakaApp() {
    if (window.shaka) {
        shaka.polyfill.installAll();
        if (shaka.Player.isBrowserSupported()) {
            const video = document.getElementById('videoPlayer');
            shakaPlayer = new shaka.Player(video);
            
            shakaPlayer.addEventListener('error', (event) => {
                console.error('Shaka Error:', event.detail);
            });
        } else {
            console.error('Browser not supported for Shaka Player!');
        }
    }
}

async function openPlayer(channel) {
    const modal = document.getElementById('tvModeModal');
    const title = document.getElementById('playerTitle');
    const video = document.getElementById('videoPlayer');
    
    modal.style.display = 'block';
    title.textContent = channel.name;

    // لێرەدا پشت بە ناوی لینکی کەناڵەکە دەبەستین لە داتابەیس (url یان streamUrl)
    const streamLink = channel.url || channel.streamUrl;

    if (!streamLink) {
        console.error("هیچ لینکێک نەدۆزرایەوە بۆ ئەم کەناڵە");
        return;
    }

    try {
        if (shakaPlayer) {
            await shakaPlayer.load(streamLink);
            console.log('Video loaded successfully!');
            video.play();
        } else {
            // ئەگەر ئامێرەکە خۆی پشتگیری HLS بکات وەک iPhone
            video.src = streamLink;
            video.play();
        }
    } catch (e) {
        console.error('Error loading video', e);
    }
}

window.closePlayer = function() {
    const modal = document.getElementById('tvModeModal');
    const video = document.getElementById('videoPlayer');
    
    modal.style.display = 'none';
    
    video.pause();
    if (shakaPlayer) {
        shakaPlayer.unload();
    } else {
        video.removeAttribute('src');
        video.load();
    }
}

// --- Theme & Language ---
function initTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
}

function initLanguage() {
    const select = document.getElementById('languageSelect');
    if (select) select.value = state.language;
    applyTranslations();
    document.body.setAttribute('dir', ['ar', 'ku', 'fa'].includes(state.language) ? 'rtl' : 'ltr');
}

function applyTranslations() {
    const langData = translations[state.language];
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (langData[key]) {
            if (el.tagName === 'INPUT') el.placeholder = langData[key];
            else el.textContent = langData[key];
        }
    });
}

// --- Slider Logic ---
function renderSlider() {
    const slider = document.getElementById('slider');
    if (!slider || state.slides.length === 0) return;
    
    clearInterval(slideInterval);
    slider.innerHTML = '';
    slideIndex = 0;
    slider.style.transform = `translateX(0)`;

    state.slides.forEach((slide) => {
        const div = document.createElement('div');
        div.className = 'slide';
        div.style.backgroundImage = `url('${slide.imageUrl}')`;
        div.innerHTML = `<div class="slide-content"><h2>${slide.title}</h2></div>`;
        if (slide.link) div.onclick = () => window.open(slide.link, '_blank');
        slider.appendChild(div);
    });

    if (state.slides.length > 1) {
        startAutoSlide();
    }
}

function startAutoSlide() {
    slideInterval = setInterval(() => {
        const slider = document.getElementById('slider');
        const slidesCount = state.slides.length;
        slideIndex = (slideIndex + 1) % slidesCount;
        
        const direction = document.body.getAttribute('dir') === 'rtl' ? '' : '-';
        slider.style.transform = `translateX(${direction}${slideIndex * 100}%)`;
    }, 5000);
}

// --- Categories & Channels ---
function renderCategories() {
    const container = document.getElementById('categoriesList');
    if (!container) return;
    container.innerHTML = `<button class="category-btn ${state.currentCategory === 'all' ? 'active' : ''}" id="btn-all">${translations[state.language].allChannels}</button>`;
    
    state.categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = `category-btn ${state.currentCategory === cat.name ? 'active' : ''}`;
        btn.innerHTML = `<i data-lucide="${cat.icon}" style="width:16px;"></i> ${cat.name}`;
        btn.onclick = () => {
            state.currentCategory = cat.name;
            renderCategories();
            renderChannels(false);
        };
        container.appendChild(btn);
    });
    lucide.createIcons();
    
    const btnAll = document.getElementById('btn-all');
    if (btnAll) {
        btnAll.onclick = () => {
            state.currentCategory = 'all';
            renderCategories();
            renderChannels(false);
        };
    }
}

window.toggleFavorite = (channelId) => {
    if (state.favorites.includes(channelId)) {
        state.favorites = state.favorites.filter(id => id !== channelId);
    } else {
        state.favorites.push(channelId);
    }
    localStorage.setItem('iptv_favs', JSON.stringify(state.favorites));
    renderChannels(document.querySelector('.nav-item.active')?.getAttribute('data-tab') === 'favorites');
}

function renderChannels(filterFavs = false) {
    const grid = document.getElementById('channelsGrid');
    if (!grid) return;
    grid.innerHTML = '';
    
    let filtered = state.channels;
    if (filterFavs) filtered = filtered.filter(c => state.favorites.includes(c.id));
    else if (state.currentCategory !== 'all') filtered = filtered.filter(c => c.category === state.currentCategory);

    if (state.searchQuery) filtered = filtered.filter(c => c.name.toLowerCase().includes(state.searchQuery.toLowerCase()));

    filtered.forEach(channel => {
        const isFav = state.favorites.includes(channel.id);
        const card = document.createElement('div');
        card.className = 'channel-card glass';
        card.innerHTML = `
            <button class="fav-btn ${isFav ? 'active' : ''}" onclick="event.stopPropagation(); toggleFavorite('${channel.id}')">
                <i data-lucide="heart" style="${isFav ? 'fill: orange; color: orange;' : ''}"></i>
            </button>
            <img src="${channel.logoUrl}" class="channel-logo" onerror="this.src='https://via.placeholder.com/150?text=TV'">
            <div class="channel-name">${channel.name}</div>
        `;
        card.onclick = () => openPlayer(channel);
        grid.appendChild(card);
    });
    lucide.createIcons();
}

// --- Event Listeners ---
function setupEventListeners() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.onclick = () => {
            const tab = item.getAttribute('data-tab');
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            if (tab === 'tvmode') {
                if (state.channels.length > 0) openPlayer(state.channels[0]);
            } else {
                renderChannels(tab === 'favorites');
            }
        };
    });

    const closeBtn = document.getElementById('closePlayerBtn');
    if (closeBtn) closeBtn.onclick = window.closePlayer;
    
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    if (fullscreenBtn) {
        fullscreenBtn.onclick = () => {
            const video = document.getElementById('videoPlayer');
            if (video.requestFullscreen) video.requestFullscreen();
            else if (video.webkitRequestFullscreen) video.webkitRequestFullscreen();
            else if (video.msRequestFullscreen) video.msRequestFullscreen();
        };
    }
    
    const searchInput = document.getElementById('searchInput');
    if(searchInput) {
        searchInput.addEventListener('input', (e) => {
            state.searchQuery = e.target.value;
            renderChannels();
        });
    }
}
