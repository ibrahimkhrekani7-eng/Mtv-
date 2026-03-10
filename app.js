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

// --- Initialize ---
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    initTheme();
    initLanguage();
    setupEventListeners();
    
    // Firebase Listeners
    onSnapshot(collection(db, 'channels'), (snapshot) => {
        state.channels = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const activeTab = document.querySelector('.nav-item.active')?.getAttribute('data-tab');
        renderChannels(activeTab === 'favorites');
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

// --- Render Functions ---
function renderSlider() {
    const slider = document.getElementById('slider');
    if (!slider) return;
    slider.innerHTML = '';
    state.slides.forEach(slide => {
        const div = document.createElement('div');
        div.className = 'slide';
        div.style.backgroundImage = `url(${slide.imageUrl})`;
        div.innerHTML = `<div class="slide-content"><h2>${slide.title}</h2></div>`;
        if (slide.link) div.onclick = () => window.open(slide.link, '_blank');
        slider.appendChild(div);
    });
}

function renderCategories() {
    const container = document.getElementById('categoriesList');
    if (!container) return;
    container.innerHTML = `<button class="category-btn ${state.currentCategory === 'all' ? 'active' : ''}" data-category="all">${translations[state.language].allChannels}</button>`;
    
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
    
    // کاتێک کاتێگۆری دەگۆڕدرێت دەمانگەڕێنێتەوە بۆ Home
    container.querySelector('[data-category="all"]').onclick = () => {
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
                <i data-lucide="heart" style="${isFav ? 'fill: orange;' : ''}"></i>
            </button>
            <img src="${channel.logoUrl}" class="channel-logo">
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
    const activeTab = document.querySelector('.nav-item.active')?.getAttribute('data-tab');
    renderChannels(activeTab === 'favorites');
};

// --- Player Logic ---
function openPlayer(channel) {
    const modal = document.getElementById('tvModeModal');
    const video = document.getElementById('videoPlayer');
    document.getElementById('playerTitle').textContent = channel.name;
    modal.classList.remove('hidden');
    
    if (Hls.isSupported()) {
        if (hls) hls.destroy();
        hls = new Hls();
        hls.loadSource(channel.streamUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => video.play());
    } else {
        video.src = channel.streamUrl;
        video.play();
    }
}

function closePlayer() {
    document.getElementById('tvModeModal').classList.add('hidden');
    const video = document.getElementById('videoPlayer');
    video.pause();
    if (hls) hls.destroy();
}

// --- Event Listeners ---
function setupEventListeners() {
    document.getElementById('searchInput').oninput = (e) => {
        state.searchQuery = e.target.value;
        const activeTab = document.querySelector('.nav-item.active')?.getAttribute('data-tab');
        renderChannels(activeTab === 'favorites');
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
        renderCategories(); // بۆ نوێکردنەوەی زمانی دوگمەی "All"
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
            if (tab === 'tvmode') return openPlayer(state.channels[0]);
            
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            renderChannels(tab === 'favorites');
        };
    });

    document.getElementById('closePlayerBtn').onclick = closePlayer;
    document.getElementById('fullscreenBtn').onclick = () => {
        const video = document.getElementById('videoPlayer');
        if (video.requestFullscreen) video.requestFullscreen();
    };
            }

