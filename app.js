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

let hls = null;
let slideIndex = 0;
let slideInterval;

// --- Initialize ---
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    initTheme();
    initLanguage();
    setupEventListeners();
    
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
        updateNotifBadge();
    });

    onSnapshot(doc(db, 'settings', 'ads'), (docSnap) => {
        if (docSnap.exists()) {
            state.ads = docSnap.data();
            renderAds();
        }
    });

    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch(err => console.log("SW error", err));
    }
});

// --- Theme & Language ---
function initTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
}

function initLanguage() {
    document.getElementById('languageSelect').value = state.language;
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

// --- Slider Logic (Auto-Moving) ---
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
        div.style.backgroundImage = `url(${slide.imageUrl})`;
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
        
        // پشتیبانی لە RTL و LTR بۆ جوڵەی سڵایدەرەکە
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
    
    document.getElementById('btn-all').onclick = () => {
        state.currentCategory = 'all';
        renderCategories();
        renderChannels(false);
    };
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

function renderAds() {
    const adSection = document.getElementById('adsSection');
    if (state.ads.active && state.ads.bannerUrl) {
        adSection.style.display = 'flex';
        adSection.style.backgroundImage = `url(${state.ads.bannerUrl})`;
        adSection.style.height = "90px";
        adSection.style.backgroundSize = "contain";
        adSection.style.backgroundRepeat = "no-repeat";
        adSection.style.backgroundPosition = "center";
        adSection.onclick = () => window.open(state.ads.link, '_blank');
    } else {
        adSection.style.display = 'none';
    }
}

function updateNotifBadge() {
    const badge = document.getElementById('notifBadge');
    if (badge) {
        badge.textContent = state.notifications.length;
        badge.style.display = state.notifications.length > 0 ? 'block' : 'none';
    }
}

window.toggleFavorite = function(id) {
    if (state.favorites.includes(id)) {
        state.favorites = state.favorites.filter(f => f !== id);
    } else {
        state.favorites.push(id);
    }
    localStorage.setItem('iptv_favs', JSON.stringify(state.favorites));
    renderChannels(document.querySelector('.nav-item.active')?.getAttribute('data-tab') === 'favorites');
};

// --- Player Logic (Full Responsive) ---
function openPlayer(channel) {
    if (!channel) return;
    const modal = document.getElementById('tvModeModal');
    const video = document.getElementById('videoPlayer');
    document.getElementById('playerTitle').textContent = channel.name;
    
    modal.classList.remove('hidden');
    modal.style.display = "flex";
    
    // سێتکردنی ڤیدیۆ بۆ هەموو شاشەکە
    video.style.width = "100%";
    video.style.height = "100%";
    video.style.objectFit = "contain";

    if (Hls.isSupported()) {
        if (hls) hls.destroy();
        hls = new Hls();
        hls.loadSource(channel.streamUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
            video.play().catch(() => console.log("User interaction required"));
        });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = channel.streamUrl;
        video.play();
    }
}

function closePlayer() {
    const modal = document.getElementById('tvModeModal');
    modal.classList.add('hidden');
    modal.style.display = "none";
    const video = document.getElementById('videoPlayer');
    video.pause();
    if (hls) hls.destroy();
}

// --- Event Listeners ---
function setupEventListeners() {
    document.getElementById('searchInput').oninput = (e) => {
        state.searchQuery = e.target.value;
        renderChannels(document.querySelector('.nav-item.active')?.getAttribute('data-tab') === 'favorites');
    };

    document.getElementById('themeToggle').onclick = () => {
        state.theme = state.theme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('iptv_theme', state.theme);
        initTheme();
    };

    document.getElementById('languageSelect').onchange = (e) => {
        state.language = e.target.value;
        localStorage.setItem('iptv_lang', state.language);
        initLanguage();
        renderCategories();
    };

    document.getElementById('settingsBtn').onclick = () => document.getElementById('settingsPanel').classList.toggle('hidden');
    
    document.getElementById('notificationBtn').onclick = () => {
        const panel = document.getElementById('notificationsPanel');
        panel.classList.toggle('hidden');
        if (!panel.classList.contains('hidden')) {
            const list = document.getElementById('notificationsList');
            list.innerHTML = state.notifications.map(n => `<div class="notif-item"><h4>${n.title}</h4><p>${n.message}</p></div>`).join('');
        }
    };

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

    document.getElementById('closePlayerBtn').onclick = closePlayer;
    
    document.getElementById('fullscreenBtn').onclick = () => {
        const video = document.getElementById('videoPlayer');
        if (video.requestFullscreen) video.requestFullscreen();
        else if (video.webkitRequestFullscreen) video.webkitRequestFullscreen();
        else if (video.msRequestFullscreen) video.msRequestFullscreen();
    };
}
