import { db } from './firebase-config.js';
import { collection, onSnapshot, doc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// --- 1. زمانەکان (Translations) ---
const translations = {
    en: { searchPlaceholder: "Search channels...", settings: "Settings", language: "Language", theme: "Theme", adminPanel: "Admin Panel", notifications: "Notifications", allChannels: "All", home: "Home", favorites: "Favorites", tvMode: "TV Mode", devInfo: "Developer Info" },
    ar: { searchPlaceholder: "البحث عن القنوات...", settings: "الإعدادات", language: "اللغة", theme: "المظهر", adminPanel: "لوحة الإدارة", notifications: "الإشعارات", allChannels: "الكل", home: "الرئيسية", favorites: "المفضلة", tvMode: "وضع التلفزيون", devInfo: "معلومات المطور" },
    ku: { searchPlaceholder: "گەڕان بۆ کەناڵەکان...", settings: "ڕێکخستنەکان", language: "زمان", theme: "ڕووکار", adminPanel: "پەنێڵی ئەدمین", notifications: "ئاگادارکردنەوەکان", allChannels: "هەموو", home: "سەرەکی", favorites: "دڵخوازەکان", tvMode: "تەلەفزیۆن", devInfo: "زانیاری گەشەپێدەر" }
};

// --- 2. باری ئەپڵیکەیشن (Application State) ---
let state = {
    channels: [],
    categories: [],
    slides: [],
    notifications: [],
    favorites: JSON.parse(localStorage.getItem('iptv_favs')) || [],
    theme: localStorage.getItem('iptv_theme') || 'dark',
    language: localStorage.getItem('iptv_lang') || 'ku',
    currentCategory: 'all',
    searchQuery: '',
    isFavoritesTab: false
};

let shakaPlayer = null;

// --- 3. دەستپێکردن (Initialization) ---
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    initTheme();
    initLanguage();
    setupEventListeners();
    initShakaApp();
    
    // گوێگرتن لە فایەربەیس بۆ کەناڵەکان
    onSnapshot(collection(db, 'channels'), (snapshot) => {
        state.channels = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderChannels();
    });

    // گوێگرتن بۆ پۆلەکان (Categories)
    onSnapshot(collection(db, 'categories'), (snapshot) => {
        state.categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderCategories();
    });

    // گوێگرتن بۆ سلاکدەر (Slider)
    onSnapshot(collection(db, 'slider'), (snapshot) => {
        state.slides = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderSlider();
    });

    // گوێگرتن بۆ ئاگادارکردنەوەکان
    onSnapshot(query(collection(db, 'notifications'), orderBy('timestamp', 'desc')), (snapshot) => {
        state.notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        updateNotificationBadge();
    });
});

// --- 4. ڕێکخستنی UI (Theme & Language) ---
function initTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
}

function initLanguage() {
    const langData = translations[state.language];
    document.body.setAttribute('dir', ['ar', 'ku'].includes(state.language) ? 'rtl' : 'ltr');
    
    // وەرگێڕانی هەموو ئەو توخمانەی data-i18n یان هەیە
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (langData[key]) {
            if (el.tagName === 'INPUT') el.placeholder = langData[key];
            else el.textContent = langData[key];
        }
    });
}

// --- 5. گوێگرەکان (Event Listeners) ---
function setupEventListeners() {
    // دوگمەی ڕێکخستنەکان (Settings)
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsPanel = document.getElementById('settingsPanel');
    if (settingsBtn) {
        settingsBtn.onclick = (e) => {
            e.stopPropagation();
            settingsPanel.classList.toggle('hidden');
            document.getElementById('notificationsPanel')?.classList.add('hidden');
        };
    }

    // داخستنی پەنێڵەکان کاتێک لە دەرەوە کلیک دەکرێت
    window.onclick = (e) => {
        if (settingsPanel && !settingsPanel.contains(e.target) && e.target !== settingsBtn) {
            settingsPanel.classList.add('hidden');
        }
    };

    // گەڕان (Search)
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.oninput = (e) => {
            state.searchQuery = e.target.value.toLowerCase();
            renderChannels();
        };
    }

    // گۆڕینی زمان
    const langSelect = document.getElementById('languageSelect');
    if (langSelect) {
        langSelect.value = state.language;
        langSelect.onchange = (e) => {
            state.language = e.target.value;
            localStorage.setItem('iptv_lang', state.language);
            initLanguage();
            renderCategories();
            renderChannels();
        };
    }

    // گۆڕینی تێم (Dark/Light)
    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) {
        themeBtn.onclick = () => {
            state.theme = state.theme === 'dark' ? 'light' : 'dark';
            localStorage.setItem('iptv_theme', state.theme);
            initTheme();
        };
    }

    // دوگمەکانی خوارەوە (Bottom Navigation)
    document.querySelectorAll('.nav-item').forEach(item => {
        item.onclick = () => {
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            const tab = item.getAttribute('data-tab');
            state.isFavoritesTab = (tab === 'favorites');
            renderChannels();
        };
    });
}

// --- 6. پیشاندان (Rendering) ---

function renderChannels() {
    const grid = document.getElementById('channelsGrid');
    if (!grid) return;
    grid.innerHTML = '';

    let filtered = state.channels;

    // فلتەرکردن بەپێی پۆل (Category)
    if (state.isFavoritesTab) {
        filtered = filtered.filter(c => state.favorites.includes(c.id));
    } else if (state.currentCategory !== 'all') {
        filtered = filtered.filter(c => c.category === state.currentCategory);
    }

    // فلتەرکردن بەپێی گەڕان (Search)
    if (state.searchQuery) {
        filtered = filtered.filter(c => c.name.toLowerCase().includes(state.searchQuery));
    }

    filtered.forEach(ch => {
        const isFav = state.favorites.includes(ch.id);
        const card = document.createElement('div');
        card.className = 'channel-card glass';
        card.innerHTML = `
            <button class="fav-btn ${isFav ? 'active' : ''}" onclick="event.stopPropagation(); toggleFavorite('${ch.id}')">
                <i data-lucide="heart" style="${isFav ? 'fill: #D4AF37; color: #D4AF37;' : ''}"></i>
            </button>
            <img src="${ch.logoUrl}" class="channel-logo" onerror="this.src='https://via.placeholder.com/150?text=TV'">
            <div class="channel-name">${ch.name}</div>
        `;
        card.onclick = () => openPlayer(ch);
        grid.appendChild(card);
    });
    lucide.createIcons();
}

function renderCategories() {
    const list = document.getElementById('categoriesList');
    if (!list) return;
    
    const allText = translations[state.language].allChannels;
    list.innerHTML = `
        <button class="category-btn ${state.currentCategory === 'all' ? 'active' : ''}" onclick="setCategory('all')">
            ${allText}
        </button>
    `;
    
    state.categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = `category-btn ${state.currentCategory === cat.name ? 'active' : ''}`;
        btn.innerText = cat.name;
        btn.onclick = () => setCategory(cat.name);
        list.appendChild(btn);
    });
}

window.setCategory = (name) => {
    state.currentCategory = name;
    state.isFavoritesTab = false; // کاتێک پۆلێک هەڵدەبژێرێت با لە دڵخوازەکان بێتە دەرەوە
    renderCategories();
    renderChannels();
};

function renderSlider() {
    const slider = document.getElementById('mainSlider');
    if (!slider || state.slides.length === 0) return;
    
    slider.innerHTML = state.slides.map(slide => `
        <div class="slide" style="background-image: url('${slide.imageUrl}')">
            <div class="slide-content">
                <h2>${slide.title || ''}</h2>
            </div>
        </div>
    `).join('');
}

// --- 7. دڵخوازەکان (Favorites Logic) ---
window.toggleFavorite = (id) => {
    if (state.favorites.includes(id)) {
        state.favorites = state.favorites.filter(favId => favId !== id);
    } else {
        state.favorites.push(id);
    }
    localStorage.setItem('iptv_favs', JSON.stringify(state.favorites));
    renderChannels();
};

// --- 8. کارپێکەری ڤیدیۆ (Player Logic) ---
function initShakaApp() {
    shaka.polyfill.installAll();
    const video = document.getElementById('videoPlayer');
    if (shaka.Player.isBrowserSupported()) {
        shakaPlayer = new shaka.Player(video);
        shakaPlayer.addEventListener('error', (e) => console.error("Shaka Error", e));
    }
}

async function openPlayer(channel) {
    const modal = document.getElementById('tvModeModal');
    const video = document.getElementById('videoPlayer');
    const title = document.getElementById('playerTitle');
    
    if (!channel.url) return;

    modal.classList.add('active');
    title.textContent = channel.name;

    try {
        if (shakaPlayer) {
            await shakaPlayer.load(channel.url);
            video.play();
        } else {
            video.src = channel.url;
            video.play();
        }
    } catch (error) {
        console.error("Error loading stream", error);
        alert("ناتوانرێت ئەم کەناڵە بکرێتەوە");
    }
}

window.closePlayer = () => {
    const modal = document.getElementById('tvModeModal');
    const video = document.getElementById('videoPlayer');
    modal.classList.remove('active');
    video.pause();
    if (shakaPlayer) shakaPlayer.unload();
};

function updateNotificationBadge() {
    const badge = document.getElementById('notifBadge');
    if (badge) {
        badge.textContent = state.notifications.length;
        badge.style.display = state.notifications.length > 0 ? 'block' : 'none';
    }
}
