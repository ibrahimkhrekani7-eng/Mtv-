import { db } from './firebase-config.js';
import { collection, onSnapshot, doc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const translations = {
    en: {
        searchPlaceholder: "Search channels...",
        settings: "Settings",
        language: "Language",
        theme: "Theme",
        adminInfo: "Developer Info",
        adminPanel: "Admin Panel",
        notifications: "Notifications",
        allChannels: "All Channels",
        home: "Home",
        favorites: "Favorites",
        tvMode: "TV Mode"
    },
    ar: {
        searchPlaceholder: "البحث عن القنوات...",
        settings: "الإعدادات",
        language: "اللغة",
        theme: "المظهر",
        adminInfo: "معلومات المطور",
        adminPanel: "لوحة الإدارة",
        notifications: "الإشعارات",
        allChannels: "كل القنوات",
        home: "الرئيسية",
        favorites: "المفضلة",
        tvMode: "وضع التلفزيون"
    },
    ku: {
        searchPlaceholder: "گەڕان بۆ کەناڵەکان...",
        settings: "ڕێکخستنەکان",
        language: "زمان",
        theme: "ڕووکار",
        adminInfo: "زانیاری گەشەپێدەر",
        adminPanel: "پەنێڵی ئەدمین",
        notifications: "ئاگادارکردنەوەکان",
        allChannels: "هەموو کەناڵەکان",
        home: "سەرەکی",
        favorites: "دڵخوازەکان",
        tvMode: "دۆخی تەلەفزیۆن"
    },
    fa: {
        searchPlaceholder: "جستجوی کانال ها...",
        settings: "تنظیمات",
        language: "زبان",
        theme: "پوسته",
        adminInfo: "اطلاعات توسعه دهنده",
        adminPanel: "پنل مدیریت",
        notifications: "اعلان ها",
        allChannels: "همه کانال ها",
        home: "خانه",
        favorites: "علاقه مندی ها",
        tvMode: "حالت تلویزیون"
    },
    tr: {
        searchPlaceholder: "Kanal ara...",
        settings: "Ayarlar",
        language: "Dil",
        theme: "Tema",
        adminInfo: "Geliştirici Bilgisi",
        adminPanel: "Yönetici Paneli",
        notifications: "Bildirimler",
        allChannels: "Tüm Kanallar",
        home: "Ana Sayfa",
        favorites: "Favoriler",
        tvMode: "TV Modu"
    }
};

// Developer Info Configuration
const developerInfo = {
    name: "IPTV Master Admin",
    socials: [
        { icon: "twitter", link: "https://twitter.com" },
        { icon: "github", link: "https://github.com" },
        { icon: "linkedin", link: "https://linkedin.com" }
    ]
};

// State
let state = {
    channels: [],
    categories: [],
    slides: [],
    notifications: [],
    ads: [],
    favorites: JSON.parse(localStorage.getItem('iptv_favs')) || [],
    deletedNotifs: JSON.parse(localStorage.getItem('iptv_deleted_notifs')) || [],
    theme: localStorage.getItem('iptv_theme') || 'dark',
    language: localStorage.getItem('iptv_lang') || 'en',
    currentCategory: 'all',
    searchQuery: ''
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    initTheme();
    initLanguage();
    setupEventListeners();
    
    // Firebase Realtime Listeners
    onSnapshot(collection(db, 'channels'), (snapshot) => {
        state.channels = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Add default favorites
        state.channels.forEach(c => {
            if (c.isFavorite && !state.favorites.includes(c.id)) {
                state.favorites.push(c.id);
            }
        });
        localStorage.setItem('iptv_favs', JSON.stringify(state.favorites));
        const activeTab = document.querySelector('.bottom-nav .active');
        if(activeTab) renderChannels(activeTab.getAttribute('data-tab') === 'favorites');
    }, (error) => {
        console.error("Error fetching channels:", error);
    });

    onSnapshot(collection(db, 'categories'), (snapshot) => {
        state.categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderCategories();
    }, (error) => {
        console.error("Error fetching categories:", error);
    });

    onSnapshot(collection(db, 'slider'), (snapshot) => {
        state.slides = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderSlider();
    }, (error) => {
        console.error("Error fetching slider:", error);
    });

    onSnapshot(collection(db, 'notifications'), (snapshot) => {
        state.notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => b.timestamp - a.timestamp);
        updateNotifBadge();
        if (!document.getElementById('notificationsPanel').classList.contains('hidden')) {
            renderNotifications();
        }
    }, (error) => {
        console.error("Error fetching notifications:", error);
    });

    onSnapshot(collection(db, 'ads'), (snapshot) => {
        state.ads = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const activeTab = document.querySelector('.bottom-nav .active');
        if(activeTab) renderChannels(activeTab.getAttribute('data-tab') === 'favorites');
    }, (error) => {
        console.error("Error fetching ads:", error);
    });

    // Register Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(err => console.log('SW Reg Failed:', err));
    }
    
    renderDeveloperInfo();
});

function renderDeveloperInfo() {
    const devInfoContainer = document.querySelector('.dev-info');
    if (devInfoContainer) {
        let socialsHtml = '';
        developerInfo.socials.forEach(social => {
            socialsHtml += `<a href="${social.link}" target="_blank" style="color: inherit;"><i data-lucide="${social.icon}"></i></a>`;
        });
        
        devInfoContainer.innerHTML = `
            <p>${developerInfo.name}</p>
            <div class="social-links" style="display: flex; gap: 10px; margin-top: 10px;">
                ${socialsHtml}
            </div>
        `;
        lucide.createIcons();
    }
}

// Theme & Language
function initTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
}

function toggleTheme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('iptv_theme', state.theme);
    initTheme();
}

function initLanguage() {
    document.getElementById('languageSelect').value = state.language;
    applyTranslations();
    if (['ar', 'ku', 'fa'].includes(state.language)) {
        document.body.setAttribute('dir', 'rtl');
    } else {
        document.body.setAttribute('dir', 'ltr');
    }
}

function applyTranslations() {
    const langData = translations[state.language];
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (langData[key]) {
            if (el.tagName === 'INPUT' && el.hasAttribute('placeholder')) {
                el.placeholder = langData[key];
            } else {
                el.textContent = langData[key];
            }
        }
    });
}

function changeLanguage(lang) {
    state.language = lang;
    localStorage.setItem('iptv_lang', lang);
    initLanguage();
}

// Render Functions
function renderCategories() {
    const container = document.getElementById('categoriesList');
    if(!container) return;
    container.innerHTML = `<button class="category-btn ${state.currentCategory === 'all' ? 'active' : ''}" data-category="all" data-i18n="allChannels">${translations[state.language].allChannels}</button>`;
    
    state.categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = `category-btn ${state.currentCategory === cat.name ? 'active' : ''}`;
        btn.setAttribute('data-category', cat.name);
        btn.innerHTML = `<i data-lucide="${cat.icon}" style="width:16px; height:16px; margin-right:5px; display:inline-block; vertical-align:middle;"></i> ${cat.name}`;
        container.appendChild(btn);
    });
    lucide.createIcons();

    // Reattach listeners
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            state.currentCategory = e.currentTarget.getAttribute('data-category');
            
            // Switch to home tab if in favorites
            const homeTab = document.querySelector('[data-tab="home"]');
            if(homeTab) {
                document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                homeTab.classList.add('active');
            }
            
            renderChannels();
        });
    });
}

function renderSlider() {
    const slider = document.getElementById('slider');
    if(!slider) return;
    slider.innerHTML = '';
    state.slides.forEach(slide => {
        const div = document.createElement('div');
        div.className = 'slide';
        div.style.backgroundImage = `url(${slide.imageUrl})`;
        if (slide.link) {
            div.style.cursor = 'pointer';
            div.onclick = () => window.open(slide.link, '_blank');
        }
        div.innerHTML = `<div class="slide-content"><h2>${slide.title}</h2></div>`;
        slider.appendChild(div);
    });

    // Auto slide
    if (!window.sliderInterval) {
        let currentSlide = 0;
        window.sliderInterval = setInterval(() => {
            if (state.slides.length === 0) return;
            currentSlide = (currentSlide + 1) % state.slides.length;
            slider.style.transform = `translateX(-${currentSlide * 100}%)`;
        }, 5000);
    }
}

function renderChannels(filterFavs = false) {
    const grid = document.getElementById('channelsGrid');
    if(!grid) return;
    grid.innerHTML = '';
    
    let filtered = state.channels;
    
    if (filterFavs) {
        filtered = filtered.filter(c => state.favorites.includes(c.id));
    } else if (state.currentCategory !== 'all') {
        filtered = filtered.filter(c => c.category === state.currentCategory);
    }

    if (state.searchQuery) {
        filtered = filtered.filter(c => c.name.toLowerCase().includes(state.searchQuery.toLowerCase()));
    }

    let activeAds = state.ads.filter(ad => ad.active);
    let adIndex = 0;

    filtered.forEach((channel, index) => {
        // Inject ad every 8 channels (approx 2 rows on desktop)
        if (index > 0 && index % 8 === 0 && activeAds.length > 0) {
            const ad = activeAds[adIndex % activeAds.length];
            const adBox = document.createElement('div');
            adBox.className = 'ad-box';
            if (ad.content.startsWith('http')) {
                adBox.innerHTML = `<a href="${ad.link || '#'}" target="_blank"><img src="${ad.content}" alt="Ad"></a>`;
            } else {
                adBox.innerHTML = ad.content; // Script or HTML
            }
            grid.appendChild(adBox);
            adIndex++;
        }

        const isFav = state.favorites.includes(channel.id);
        const card = document.createElement('div');
        card.className = 'channel-card glass';
        card.innerHTML = `
            <button class="fav-btn ${isFav ? 'active' : ''}" data-id="${channel.id}">
                <i data-lucide="heart" style="${isFav ? 'fill: var(--gold);' : ''}"></i>
            </button>
            <img src="${channel.logoUrl}" alt="${channel.name}" class="channel-logo">
            <div class="channel-name">${channel.name}</div>
        `;
        
        card.addEventListener('click', (e) => {
            if (e.target.closest('.fav-btn')) return;
            openPlayer(channel);
        });
        
        grid.appendChild(card);
    });
    lucide.createIcons();

    // Setup Fav Buttons
    document.querySelectorAll('.fav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            toggleFavorite(id);
        });
    });
}

function renderNotifications() {
    const list = document.getElementById('notificationsList');
    if(!list) return;
    list.innerHTML = '';
    
    const visibleNotifs = state.notifications.filter(n => !state.deletedNotifs.includes(n.id));
    
    if (visibleNotifs.length === 0) {
        list.innerHTML = '<p class="text-muted text-center">No notifications</p>';
        updateNotifBadge();
        return;
    }
    
    visibleNotifs.forEach(n => {
        const div = document.createElement('div');
        div.className = 'notif-item';
        div.innerHTML = `
            <h4>${n.title}</h4>
            <p class="text-muted" style="font-size: 0.85rem; margin-top: 5px;">${n.message}</p>
            <div class="notif-time">${new Date(n.timestamp).toLocaleString()}</div>
            <button class="notif-delete-btn" data-id="${n.id}"><i data-lucide="trash-2" style="width: 16px; height: 16px;"></i></button>
        `;
        list.appendChild(div);
    });
    lucide.createIcons();

    document.querySelectorAll('.notif-delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            state.deletedNotifs.push(id);
            localStorage.setItem('iptv_deleted_notifs', JSON.stringify(state.deletedNotifs));
            renderNotifications();
            updateNotifBadge();
        });
    });
}

function updateNotifBadge() {
    const badge = document.getElementById('notifBadge');
    if(!badge) return;
    const visibleNotifs = state.notifications.filter(n => !state.deletedNotifs.includes(n.id));
    badge.textContent = visibleNotifs.length;
    badge.style.display = visibleNotifs.length > 0 ? 'block' : 'none';
}

function toggleFavorite(id) {
    if (state.favorites.includes(id)) {
        state.favorites = state.favorites.filter(fId => fId !== id);
    } else {
        state.favorites.push(id);
    }
    localStorage.setItem('iptv_favs', JSON.stringify(state.favorites));
    
    // Re-render based on current tab
    const activeTab = document.querySelector('.bottom-nav .active');
    if(activeTab) {
        renderChannels(activeTab.getAttribute('data-tab') === 'favorites');
    }
}

// Player Logic
let hls = null;
let tvTimeout;
let currentChannelIndex = 0;
let tvChannels = [];

function openPlayer(channel) {
    const modal = document.getElementById('tvModeModal');
    const video = document.getElementById('videoPlayer');
    const container = document.getElementById('tvModeContainer');
    
    if(!modal || !video || !container) return;
    
    modal.classList.remove('hidden');
    
    // Fullscreen immediately
    if (container.requestFullscreen) {
        container.requestFullscreen().catch(err => console.log(err));
    }
    
    playStream(channel.streamUrl, video);
    
    // Setup TV UI
    tvChannels = state.currentCategory === 'all' ? state.channels : state.channels.filter(c => c.category === state.currentCategory);
    currentChannelIndex = tvChannels.findIndex(c => c.id === channel.id);
    if(currentChannelIndex === -1) currentChannelIndex = 0;
    
    renderTVCategories();
    renderTVChannels();
    showTVUI();
}

function playStream(url, video) {
    if (Hls.isSupported()) {
        if (hls) hls.destroy();
        hls = new Hls();
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, function() {
            video.play().catch(e => console.log("Auto-play prevented"));
        });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = url;
        video.addEventListener('loadedmetadata', function() {
            video.play().catch(e => console.log("Auto-play prevented"));
        });
    }
}

function closePlayer() {
    const modal = document.getElementById('tvModeModal');
    const video = document.getElementById('videoPlayer');
    if(modal) modal.classList.add('hidden');
    if(video) {
        video.pause();
        video.src = '';
    }
    if (hls) {
        hls.destroy();
        hls = null;
    }
    if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => console.log(err));
    }
}

function showTVUI() {
    const container = document.getElementById('tvModeContainer');
    if(!container) return;
    container.classList.remove('tv-ui-hidden');
    clearTimeout(tvTimeout);
    tvTimeout = setTimeout(() => {
        container.classList.add('tv
     function showTVUI() {
    const container = document.getElementById('tvModeContainer');
    if(!container) return;
    container.classList.remove('tv-ui-hidden');
    clearTimeout(tvTimeout);
    tvTimeout = setTimeout(() => {
        container.classList.add('tv-ui-hidden');
    }, 4000);
}

function renderTVCategories() {
    const list = document.getElementById('tvCategoriesList');
    if(!list) return;
    list.innerHTML = `<button class="category-btn ${state.currentCategory === 'all' ? 'active' : ''}" data-category="all" style="width:100%; text-align:left;">All Channels</button>`;
    
    state.categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = `category-btn ${state.currentCategory === cat.name ? 'active' : ''}`;
        btn.setAttribute('data-category', cat.name);
        btn.style.width = '100%';
        btn.style.textAlign = 'left';
        btn.innerHTML = `<i data-lucide="${cat.icon}" style="width:16px; height:16px; margin-right:5px; display:inline-block; vertical-align:middle;"></i> ${cat.name}`;
        list.appendChild(btn);
    });
    lucide.createIcons();

    list.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            state.currentCategory = e.currentTarget.getAttribute('data-category');
            tvChannels = state.currentCategory === 'all' ? state.channels : state.channels.filter(c => c.category === state.currentCategory);
            currentChannelIndex = 0;
            renderTVCategories();
            renderTVChannels();
            if(tvChannels.length > 0) {
                playStream(tvChannels[0].streamUrl, document.getElementById('videoPlayer'));
            }
            showTVUI();
        });
    });
}

function renderTVChannels() {
    const overlay = document.getElementById('tvChannelsOverlay');
    if(!overlay) return;
    overlay.innerHTML = '';
    
    tvChannels.forEach((channel, index) => {
        const card = document.createElement('div');
        card.className = `tv-channel-card ${index === currentChannelIndex ? 'active' : ''}`;
        card.innerHTML = `
            <img src="${channel.logoUrl}" alt="${channel.name}">
            <span>${channel.name}</span>
        `;
        card.addEventListener('click', () => {
            currentChannelIndex = index;
            playStream(channel.streamUrl, document.getElementById('videoPlayer'));
            renderTVChannels();
            showTVUI();
        });
        overlay.appendChild(card);
        
        if(index === currentChannelIndex) {
            card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    });
}

// Event Listeners
function setupEventListeners() {
    // Search
    const searchInput = document.getElementById('searchInput');
    if(searchInput) {
        searchInput.addEventListener('input', (e) => {
            state.searchQuery = e.target.value;
            const activeTab = document.querySelector('.bottom-nav .active');
            if(activeTab) renderChannels(activeTab.getAttribute('data-tab') === 'favorites');
        });
    }

    // Bottom Nav
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const tab = e.currentTarget.getAttribute('data-tab');
            
            if (tab === 'tvmode') {
                if (state.channels.length > 0) {
                    openPlayer(state.channels[0]); // Open first channel in TV mode
                }
                return;
            }
            
            document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
            e.currentTarget.classList.add('active');
            
            if (tab === 'favorites') {
                renderChannels(true);
            } else {
                renderChannels(false);
            }
        });
    });

    // Panels
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsPanel = document.getElementById('settingsPanel');
    const notifBtn = document.getElementById('notificationBtn');
    const notifPanel = document.getElementById('notificationsPanel');

    if(settingsBtn && settingsPanel && notifBtn && notifPanel) {
        settingsBtn.addEventListener('click', () => {
            settingsPanel.classList.toggle('hidden');
            notifPanel.classList.add('hidden');
        });

        notifBtn.addEventListener('click', () => {
            notifPanel.classList.toggle('hidden');
            settingsPanel.classList.add('hidden');
            renderNotifications();
        });

        // Close panels when clicking outside
        document.addEventListener('click', (e) => {
            if (!settingsBtn.contains(e.target) && !settingsPanel.contains(e.target)) {
                settingsPanel.classList.add('hidden');
            }
            if (!notifBtn.contains(e.target) && !notifPanel.contains(e.target)) {
                notifPanel.classList.add('hidden');
            }
        });
    }

    // Settings Actions
    const themeToggle = document.getElementById('themeToggle');
    if(themeToggle) themeToggle.addEventListener('click', toggleTheme);
    
    const langSelect = document.getElementById('languageSelect');
    if(langSelect) langSelect.addEventListener('change', (e) => changeLanguage(e.target.value));

    // Player Actions
    const closePlayerBtn = document.getElementById('closePlayerBtn');
    if(closePlayerBtn) closePlayerBtn.addEventListener('click', closePlayer);
    
    const tvContainer = document.getElementById('tvModeContainer');
    if(tvContainer) {
        tvContainer.addEventListener('mousemove', showTVUI);
        tvContainer.addEventListener('click', showTVUI);
    }

    // Keyboard Navigation
    document.addEventListener('keydown', (e) => {
        const modal = document.getElementById('tvModeModal');
        if (modal && !modal.classList.contains('hidden')) {
            showTVUI();
            if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
                if(tvChannels.length === 0) return;
                currentChannelIndex = (currentChannelIndex + 1) % tvChannels.length;
                playStream(tvChannels[currentChannelIndex].streamUrl, document.getElementById('videoPlayer'));
                renderTVChannels();
            } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
                if(tvChannels.length === 0) return;
                currentChannelIndex = (currentChannelIndex - 1 + tvChannels.length) % tvChannels.length;
                playStream(tvChannels[currentChannelIndex].streamUrl, document.getElementById('videoPlayer'));
                renderTVChannels();
            } else if (e.key === 'Escape') {
                closePlayer();
            }
        }
    });
}   