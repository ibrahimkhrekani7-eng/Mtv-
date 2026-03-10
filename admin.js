import { db, auth } from './firebase-config.js';
import { collection, onSnapshot, doc, setDoc, addDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

let adminState = {
    channels: [],
    categories: [],
    slides: [],
    notifications: [],
    ads: []
};

document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    
    // Auth Listener
    onAuthStateChanged(auth, (user) => {
        if (user) {
            document.getElementById('loginSection').classList.add('hidden');
            document.getElementById('adminLayout').classList.remove('hidden');
            initAdmin();
        } else {
            document.getElementById('loginSection').classList.remove('hidden');
            document.getElementById('adminLayout').classList.add('hidden');
        }
    });

    const loginBtn = document.getElementById('loginBtn');
    if(loginBtn) {
        loginBtn.addEventListener('click', async () => {
            const email = document.getElementById('loginEmail').value;
            const pass = document.getElementById('loginPassword').value;
            try {
                await signInWithEmailAndPassword(auth, email, pass);
            } catch (error) {
                const errEl = document.getElementById('loginError');
                errEl.textContent = "ئیمێڵ یان پاسوورد هەڵەیە!";
                errEl.classList.remove('hidden');
            }
        });
    }
    
    // Add logout button to sidebar
    const sidebarNav = document.querySelector('.sidebar-nav');
    if(sidebarNav) {
        const logoutBtn = document.createElement('a');
        logoutBtn.href = "#";
        logoutBtn.className = "nav-link logout-link";
        logoutBtn.style.marginTop = "auto";
        logoutBtn.innerHTML = '<i data-lucide="log-out"></i> Logout';
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            signOut(auth);
        });
        sidebarNav.appendChild(logoutBtn);
    }

    // Responsive Sidebar Toggle
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const adminSidebar = document.getElementById('adminSidebar');
    const closeSidebarBtn = document.getElementById('closeSidebarBtn');
    
    if(mobileMenuBtn && adminSidebar) {
        mobileMenuBtn.addEventListener('click', () => {
            adminSidebar.classList.add('open');
        });
        
        if(closeSidebarBtn) {
            closeSidebarBtn.addEventListener('click', () => {
                adminSidebar.classList.remove('open');
            });
        }
    }
});

function initAdmin() {
    setupAdminNav();
    setupAdminForms();
    
    // Listeners for Data
    onSnapshot(collection(db, 'channels'), (snapshot) => {
        adminState.channels = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderAdminChannels();
        updateDashboardStats();
    });

    onSnapshot(collection(db, 'categories'), (snapshot) => {
        adminState.categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderAdminCategories();
        updateDashboardStats();
        updateCategorySelects();
    });

    onSnapshot(collection(db, 'slider'), (snapshot) => {
        adminState.slides = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderAdminSlides();
    });

    onSnapshot(collection(db, 'notifications'), (snapshot) => {
        adminState.notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => b.timestamp - a.timestamp);
        renderAdminNotifs();
        updateDashboardStats();
    });

    onSnapshot(collection(db, 'ads'), (snapshot) => {
        adminState.ads = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderAdminAds();
    });
}

function setupAdminNav() {
    document.querySelectorAll('.nav-link[data-target]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = e.currentTarget.getAttribute('data-target');
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            e.currentTarget.classList.add('active');
            
            document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
            const targetEl = document.getElementById(`${target}View`);
            if(targetEl) targetEl.classList.add('active');
            
            if(window.innerWidth <= 768) {
                document.getElementById('adminSidebar').classList.remove('open');
            }
        });
    });
}

function updateDashboardStats() {
    const totalChannels = document.getElementById('statTotalChannels');
    const totalCategories = document.getElementById('statTotalCategories');
    const totalNotifs = document.getElementById('statTotalNotifs');
    
    if(totalChannels) totalChannels.textContent = adminState.channels.length;
    if(totalCategories) totalCategories.textContent = adminState.categories.length;
    if(totalNotifs) totalNotifs.textContent = adminState.notifications.length;
}

function updateCategorySelects() {
    const select = document.getElementById('channelCategory');
    if(!select) return;
    select.innerHTML = '';
    adminState.categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.name;
        option.textContent = cat.name;
        select.appendChild(option);
    });
}

// --- RENDERING FUNCTIONS ---

function renderAdminCategories() {
    const tbody = document.getElementById('categoriesTableBody');
    if(!tbody) return;
    tbody.innerHTML = '';
    adminState.categories.forEach(cat => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><i data-lucide="${cat.icon}"></i></td>
            <td>${cat.name}</td>
            <td>
                <div class="action-btns">
                    <button class="icon-btn edit-cat" onclick="editCategory('${cat.id}')"><i data-lucide="edit"></i></button>
                    <button class="icon-btn delete-cat" onclick="deleteCategory('${cat.id}')" style="color:red;"><i data-lucide="trash-2"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
    lucide.createIcons();
}

function renderAdminChannels() {
    const tbody = document.getElementById('channelsTableBody');
    if(!tbody) return;
    tbody.innerHTML = '';
    adminState.channels.forEach(channel => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><img src="${channel.logoUrl}" style="width:30px; border-radius:4px;"></td>
            <td>${channel.name}</td>
            <td>${channel.category}</td>
            <td class="url-cell">${channel.streamUrl}</td>
            <td>
                <div class="action-btns">
                    <button class="icon-btn" onclick="editChannel('${channel.id}')"><i data-lucide="edit"></i></button>
                    <button class="icon-btn" onclick="deleteChannel('${channel.id}')" style="color:red;"><i data-lucide="trash-2"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
    lucide.createIcons();
}

function renderAdminSlides() {
    const grid = document.getElementById('adminSliderGrid');
    if(!grid) return;
    grid.innerHTML = '';
    adminState.slides.forEach(slide => {
        const div = document.createElement('div');
        div.className = 'admin-slide-card glass';
        div.style.position = 'relative';
        div.innerHTML = `
            <img src="${slide.imageUrl}" style="width:100%; height:100px; object-fit:cover; border-radius:8px;">
            <div style="padding:5px; font-size:12px;">${slide.title}</div>
            <div class="action-btns" style="position:absolute; top:5px; right:5px;">
                <button class="icon-btn" onclick="editSlide('${slide.id}')" style="background:rgba(0,0,0,0.5);"><i data-lucide="edit"></i></button>
                <button class="icon-btn" onclick="deleteSlide('${slide.id}')" style="background:rgba(0,0,0,0.5); color:red;"><i data-lucide="trash-2"></i></button>
            </div>
        `;
        grid.appendChild(div);
    });
    lucide.createIcons();
}

function renderAdminAds() {
    const container = document.getElementById('adminAdsList');
    if(!container) return;
    container.innerHTML = '';
    adminState.ads.forEach(ad => {
        const div = document.createElement('div');
        div.className = 'glass-card';
        div.style.padding = '10px';
        div.style.marginBottom = '10px';
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <strong>Ad Link:</strong> ${ad.link || 'No Link'}<br>
                    <strong>Status:</strong> ${ad.active ? 'Active' : 'Inactive'}
                </div>
                <div class="action-btns">
                    <button class="icon-btn" onclick="editAd('${ad.id}')"><i data-lucide="edit"></i></button>
                    <button class="icon-btn" onclick="deleteAd('${ad.id}')" style="color:red;"><i data-lucide="trash-2"></i></button>
                </div>
            </div>
        `;
        container.appendChild(div);
    });
    lucide.createIcons();
}

function renderAdminNotifs() {
    const container = document.getElementById('adminNotifsList');
    if(!container) return;
    container.innerHTML = adminState.notifications.map(n => `
        <div class="glass-card" style="padding:10px; margin-bottom:10px; position:relative;">
            <strong>${n.title}</strong>
            <p style="font-size:13px; color:#ccc;">${n.message}</p>
            <button onclick="deleteNotif('${n.id}')" style="position:absolute; right:10px; top:10px; background:none; border:none; color:red; cursor:pointer;"><i data-lucide="trash-2"></i></button>
        </div>
    `).join('');
    lucide.createIcons();
}

// --- FORMS & MODALS ---

function setupAdminForms() {
    // Category Modal
    document.getElementById('addCategoryBtn')?.addEventListener('click', () => {
        resetForm('category');
        document.getElementById('categoryModal').classList.remove('hidden');
    });

    document.getElementById('saveCategoryBtn')?.addEventListener('click', async () => {
        const id = document.getElementById('categoryId').value;
        const name = document.getElementById('categoryName').value;
        const icon = document.getElementById('categoryIcon').value;
        if (!name || !icon) return alert('Please fill all fields');
        
        try {
            if (id) await setDoc(doc(db, 'categories', id), { name, icon });
            else await addDoc(collection(db, 'categories'), { name, icon });
            document.getElementById('categoryModal').classList.add('hidden');
        } catch (e) { alert(e.message); }
    });

    // Channel Modal
    document.getElementById('addChannelBtn')?.addEventListener('click', () => {
        if (adminState.categories.length === 0) return alert('Add category first');
        resetForm('channel');
        document.getElementById('channelModal').classList.remove('hidden');
    });

    document.getElementById('saveChannelBtn')?.addEventListener('click', async () => {
        const id = document.getElementById('channelId').value;
        const data = {
            name: document.getElementById('channelName').value,
            category: document.getElementById('channelCategory').value,
            logoUrl: document.getElementById('channelLogoUrl').value,
            streamUrl: document.getElementById('channelStreamUrl').value,
            isFavorite: document.getElementById('channelIsFavorite').value === 'true'
        };
        if (!data.name || !data.logoUrl || !data.streamUrl) return alert('Fill all fields');

        try {
            if (id) await setDoc(doc(db, 'channels', id), data);
            else await addDoc(collection(db, 'channels'), data);
            document.getElementById('channelModal').classList.add('hidden');
        } catch (e) { alert(e.message); }
    });

    // Slider Modal
    document.getElementById('addSlideBtn')?.addEventListener('click', () => {
        resetForm('slide');
        document.getElementById('slideModal').classList.remove('hidden');
    });

    document.getElementById('saveSlideBtn')?.addEventListener('click', async () => {
        const id = document.getElementById('slideId').value;
        const data = {
            title: document.getElementById('slideTitle').value,
            imageUrl: document.getElementById('slideImageUrl').value,
            link: document.getElementById('slideLink').value
        };
        try {
            if (id) await setDoc(doc(db, 'slider', id), data);
            else await addDoc(collection(db, 'slider'), data);
            document.getElementById('slideModal').classList.add('hidden');
        } catch (e) { alert(e.message); }
    });

    // Ads Modal
    document.getElementById('addAdBtn')?.addEventListener('click', () => {
        resetForm('ad');
        document.getElementById('adModal').classList.remove('hidden');
    });

    document.getElementById('saveAdBtn')?.addEventListener('click', async () => {
        const id = document.getElementById('adId').value;
        const data = {
            bannerUrl: document.getElementById('adContent').value, // Used 'adContent' field for Banner URL
            link: document.getElementById('adLink').value,
            active: document.getElementById('adActive').value === 'true'
        };
        try {
            if (id) await setDoc(doc(db, 'ads', id), data);
            else await addDoc(collection(db, 'ads'), data);
            document.getElementById('adModal').classList.add('hidden');
        } catch (e) { alert(e.message); }
    });

    // Notification Send
    document.getElementById('sendNotifBtn')?.addEventListener('click', async () => {
        const title = document.getElementById('notifTitle').value;
        const message = document.getElementById('notifMessage').value;
        if (!title || !message) return alert('Fill fields');
        try {
            await addDoc(collection(db, 'notifications'), { title, message, timestamp: Date.now() });
            document.getElementById('notifTitle').value = '';
            document.getElementById('notifMessage').value = '';
            alert('Notification Sent!');
        } catch (e) { alert(e.message); }
    });

    // Close Modals logic
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.onclick = () => btn.closest('.modal').classList.add('hidden');
    });
}

// --- HELPER ACTIONS (GLOBAL WINDOW FOR HTML ONCLICK) ---

window.editCategory = (id) => {
    const cat = adminState.categories.find(c => c.id === id);
    if (!cat) return;
    document.getElementById('categoryId').value = cat.id;
    document.getElementById('categoryName').value = cat.name;
    document.getElementById('categoryIcon').value = cat.icon;
    document.getElementById('categoryModal').classList.remove('hidden');
};

window.deleteCategory = async (id) => {
    if (confirm('Delete Category?')) await deleteDoc(doc(db, 'categories', id));
};

window.editChannel = (id) => {
    const ch = adminState.channels.find(c => c.id === id);
    if (!ch) return;
    document.getElementById('channelId').value = ch.id;
    document.getElementById('channelName').value = ch.name;
    document.getElementById('channelCategory').value = ch.category;
    document.getElementById('channelLogoUrl').value = ch.logoUrl;
    document.getElementById('channelStreamUrl').value = ch.streamUrl;
    document.getElementById('channelIsFavorite').value = ch.isFavorite ? 'true' : 'false';
    document.getElementById('channelModal').classList.remove('hidden');
};

window.deleteChannel = async (id) => {
    if (confirm('Delete Channel?')) await deleteDoc(doc(db, 'channels', id));
};

window.editSlide = (id) => {
    const s = adminState.slides.find(sl => sl.id === id);
    if (!s) return;
    document.getElementById('slideId').value = s.id;
    document.getElementById('slideTitle').value = s.title;
    document.getElementById('slideImageUrl').value = s.imageUrl;
    document.getElementById('slideLink').value = s.link;
    document.getElementById('slideModal').classList.remove('hidden');
};

window.deleteSlide = async (id) => {
    if (confirm('Delete Slide?')) await deleteDoc(doc(db, 'slider', id));
};

window.editAd = (id) => {
    const ad = adminState.ads.find(a => a.id === id);
    if (!ad) return;
    document.getElementById('adId').value = ad.id;
    document.getElementById('adContent').value = ad.bannerUrl || '';
    document.getElementById('adLink').value = ad.link;
    document.getElementById('adActive').value = ad.active ? 'true' : 'false';
    document.getElementById('adModal').classList.remove('hidden');
};

window.deleteAd = async (id) => {
    if (confirm('Delete Ad?')) await deleteDoc(doc(db, 'ads', id));
};

window.deleteNotif = async (id) => {
    await deleteDoc(doc(db, 'notifications', id));
};

function resetForm(type) {
    if (type === 'category') {
        document.getElementById('categoryId').value = '';
        document.getElementById('categoryName').value = '';
        document.getElementById('categoryIcon').value = '';
    } else if (type === 'channel') {
        document.getElementById('channelId').value = '';
        document.getElementById('channelName').value = '';
        document.getElementById('channelLogoUrl').value = '';
        document.getElementById('channelStreamUrl').value = '';
    } else if (type === 'slide') {
        document.getElementById('slideId').value = '';
        document.getElementById('slideTitle').value = '';
        document.getElementById('slideImageUrl').value = '';
        document.getElementById('slideLink').value = '';
    } else if (type === 'ad') {
        document.getElementById('adId').value = '';
        document.getElementById('adContent').value = '';
        document.getElementById('adLink').value = '';
    }
        }
                        
