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
                errEl.textContent = error.message;
                errEl.classList.remove('hidden');
            }
        });
    }
    
    // Add logout button to sidebar
    const sidebarNav = document.querySelector('.sidebar-nav');
    if(sidebarNav) {
        const logoutBtn = document.createElement('a');
        logoutBtn.href = "#";
        logoutBtn.className = "nav-link";
        logoutBtn.innerHTML = '<i data-lucide="log-out"></i> Logout';
        logoutBtn.addEventListener('click', () => signOut(auth));
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
        
        // Close sidebar when clicking a link on mobile
        document.querySelectorAll('.admin-sidebar .nav-link').forEach(link => {
            link.addEventListener('click', () => {
                if(window.innerWidth <= 768) {
                    adminSidebar.classList.remove('open');
                }
            });
        });
    }
});

function initAdmin() {
    setupAdminNav();
    setupAdminForms();
    
    // Listeners
    onSnapshot(collection(db, 'channels'), (snapshot) => {
        adminState.channels = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderAdminChannels();
        updateDashboardStats();
    }, (error) => {
        console.error("Error fetching admin channels:", error);
    });

    onSnapshot(collection(db, 'categories'), (snapshot) => {
        adminState.categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderAdminCategories();
        updateDashboardStats();
        updateCategorySelects();
    }, (error) => {
        console.error("Error fetching admin categories:", error);
    });

    onSnapshot(collection(db, 'slider'), (snapshot) => {
        adminState.slides = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderAdminSlides();
    }, (error) => {
        console.error("Error fetching admin slider:", error);
    });

    onSnapshot(collection(db, 'notifications'), (snapshot) => {
        adminState.notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => b.timestamp - a.timestamp);
        renderAdminNotifs();
        updateDashboardStats();
    }, (error) => {
        console.error("Error fetching admin notifications:", error);
    });

    onSnapshot(collection(db, 'ads'), (snapshot) => {
        adminState.ads = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderAdminAds();
    }, (error) => {
        console.error("Error fetching admin ads:", error);
    });
}

function setupAdminNav() {
    document.querySelectorAll('.nav-link[data-target]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = e.currentTarget.getAttribute('data-target');
            
            // Update active link
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            e.currentTarget.classList.add('active');
            
            // Update active section
            document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
            const targetEl = document.getElementById(`${target}View`);
            if(targetEl) targetEl.classList.add('active');
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

// Categories Management
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
                    <button class="icon-btn edit-category-btn" data-id="${cat.id}"><i data-lucide="edit"></i></button>
                    <button class="icon-btn delete-category-btn" data-id="${cat.id}" style="color: var(--danger);"><i data-lucide="trash-2"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
    lucide.createIcons();

    document.querySelectorAll('.edit-category-btn').forEach(btn => {
        btn.addEventListener('click', (e) => editCategory(e.currentTarget.getAttribute('data-id')));
    });
    document.querySelectorAll('.delete-category-btn').forEach(btn => {
        btn.addEventListener('click', (e) => deleteCategory(e.currentTarget.getAttribute('data-id')));
    });
}

// Channels Management
function renderAdminChannels() {
    const tbody = document.getElementById('channelsTableBody');
    if(!tbody) return;
    tbody.innerHTML = '';
    
    adminState.channels.forEach(channel => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><img src="${channel.logoUrl}" alt="logo"></td>
            <td>${channel.name}</td>
            <td style="text-transform: capitalize;">${channel.category}</td>
            <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${channel.streamUrl}</td>
            <td>
                <div class="action-btns">
                    <button class="icon-btn edit-channel-btn" data-id="${channel.id}"><i data-lucide="edit"></i></button>
                    <button class="icon-btn delete-channel-btn" data-id="${channel.id}" style="color: var(--danger);"><i data-lucide="trash-2"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
    lucide.createIcons();

    document.querySelectorAll('.edit-channel-btn').forEach(btn => {
        btn.addEventListener('click', (e) => editChannel(e.currentTarget.getAttribute('data-id')));
    });
    document.querySelectorAll('.delete-channel-btn').forEach(btn => {
        btn.addEventListener('click', (e) => deleteChannel(e.currentTarget.getAttribute('data-id')));
    });
}

function setupAdminForms() {
    // Category Modal
    const catModal = document.getElementById('categoryModal');
    const addCategoryBtn = document.getElementById('addCategoryBtn');
    if(addCategoryBtn) {
        addCategoryBtn.addEventListener('click', () => {
            document.getElementById('categoryId').value = '';
            document.getElementById('categoryName').value = '';
            document.getElementById('categoryIcon').value = '';
            document.getElementById('categoryModalTitle').textContent = 'Add Category';
            catModal.classList.remove('hidden');
        });
    }

    const saveCategoryBtn = document.getElementById('saveCategoryBtn');
    if(saveCategoryBtn) {
        saveCategoryBtn.addEventListener('click', async () => {
            const id = document.getElementById('categoryId').value;
            const name = document.getElementById('categoryName').value;
            const icon = document.getElementById('categoryIcon').value;

            if (!name || !icon) {
                alert('Please fill all fields');
                return;
            }

            try {
                if (id) {
                    await setDoc(doc(db, 'categories', id), { name, icon });
                } else {
                    await addDoc(collection(db, 'categories'), { name, icon });
                }
                catModal.classList.add('hidden');
            } catch (error) {
                alert('Error saving category: ' + error.message);
            }
        });
    }

    // Channel Modal
    const channelModal = document.getElementById('channelModal');
    const addChannelBtn = document.getElementById('addChannelBtn');
    if(addChannelBtn) {
        addChannelBtn.addEventListener('click', () => {
            if (adminState.categories.length === 0) {
                alert('Please add a category first');
                return;
            }
            document.getElementById('channelId').value = '';
            document.getElementById('channelName').value = '';
            document.getElementById('channelLogoUrl').value = '';
            document.getElementById('channelStreamUrl').value = '';
            document.getElementById('channelIsFavorite').value = 'false';
            document.getElementById('channelModalTitle').textContent = 'Add Channel';
            channelModal.classList.remove('hidden');
        });
    }

    const saveChannelBtn = document.getElementById('saveChannelBtn');
    if(saveChannelBtn) {
        saveChannelBtn.addEventListener('click', async () => {
            const id = document.getElementById('channelId').value;
            const name = document.getElementById('channelName').value;
            const category = document.getElementById('channelCategory').value;
            const logoUrl = document.getElementById('channelLogoUrl').value;
            const streamUrl = document.getElementById('channelStreamUrl').value;
            const isFavorite = document.getElementById('channelIsFavorite').value === 'true';

            if (!name || !logoUrl || !streamUrl) {
                alert('Please fill all fields');
                return;
            }

            try {
                if (id) {
                    await setDoc(doc(db, 'channels', id), { name, category, logoUrl, streamUrl, isFavorite });
                } else {
                    await addDoc(collection(db, 'channels'), { name, category, logoUrl, streamUrl, isFavorite });
                }
                channelModal.classList.add('hidden');
            } catch (error) {
                alert('Error saving channel: ' + error.message);
            }
        });
    }

    // Slide Modal
    const slideModal = document.getElementById('slideModal');
    const addSlideBtn = document.getElementById('addSlideBtn');
    if(addSlideBtn) {
        addSlideBtn.addEventListener('click', () => {
            document.getElementById('slideId').value = '';
            document.getElementById('slideTitle').value = '';
            document.getElementById('slideImageUrl').value = '';
            document.getElementById('slideLink').value = '';
            document.getElementById('slideModalTitle').textContent = 'Add Slide';
            slideModal.classList.remove('hidden');
        });
    }

    const saveSlideBtn = document.getElementById('saveSlideBtn');
    if(saveSlideBtn) {
        saveSlideBtn.addEventListener('click', async () => {
            const id = document.getElementById('slideId').value;
            const title = document.getElementById('slideTitle').value;
            const imageUrl = document.getElementById('slideImageUrl').value;
            const link = document.getElementById('slideLink').value;

            if (!title || !imageUrl) {
                alert('Please fill title and image URL');
                return;
            }

            try {
                if (id) {
                    await setDoc(doc(db, 'slider', id), { title, imageUrl, link });
                } else {
                    await addDoc(collection(db, 'slider'), { title, imageUrl, link });
                }
                slideModal.classList.add('hidden');
            } catch (error) {
                alert('Error saving slide: ' + error.message);
            }
        });
    }

    // Ads Modal
    const adModal = document.getElementById('adModal');
    const addAdBtn = document.getElementById('addAdBtn');
    if(addAdBtn) {
        addAdBtn.addEventListener('click', () => {
            document.getElementById('adId').value = '';
            document.getElementById('adContent').value = '';
            document.getElementById('adLink').value = '';
            document.getElementById('adActive').value = 'true';
            document.getElementById('adModalTitle').textContent = 'Add Ad';
            adModal.classList.remove('hidden');
        });
    }

    const saveAdBtn = document.getElementById('saveAdBtn');
    if(saveAdBtn) {
        saveAdBtn.addEventListener('click', async () => {
            const id = document.getElementById('adId').value;
            const content = document.getElementById('adContent').value;
            const link = document.getElementById('adLink').value;
            const active = document.getElementById('adActive').value === 'true';

            if (!content) {
                alert('Please provide Ad content');
                return;
            }

            try {
                if (id) {
                    await setDoc(doc(db, 'ads', id), { content, link, active });
                } else {
                    await addDoc(collection(db, 'ads'), { content, link, active });
                }
                adModal.classList.add('hidden');
            } catch (error) {
                alert('Error saving ad: ' + error.message);
            }
        });
    }

    // Close Modals
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('.modal').classList.add('hidden');
        });
    });

    // Notifications
    const sendNotifBtn = document.getElementById('sendNotifBtn');
    if(sendNotifBtn) {
        sendNotifBtn.addEventListener('click', async () => {
            const title = document.getElementById('notifTitle').value;
            const message = document.getElementById('notifMessage').value;
            
            if (!title || !message) {
                alert('Please fill title and message');
                return;
            }

            try {
                await addDoc(collection(db, 'notifications'), {
                    title,
                    message,
                    timestamp: Date.now()
                });
                document.getElementById('notifTitle').value = '';
                document.getElementById('notifMessage').value = '';
                alert('Notification Sent!');
            } catch (error) {
                alert('Error sending notification: ' + error.message);
            }
        });
    }
}

function editCategory(id) {
    const cat = adminState.categories.find(c => c.id === id);
    if (!cat) return;

    document.getElementById('categoryId').value = cat.id;
    document.getElementById('categoryName').value = cat.name;
    document.getElementById('categoryIcon').value = cat.icon;
    
    document.getElementById('categoryModalTitle').textContent = 'Edit Category';
    document.getElementById('categoryModal').classList.remove('hidden');
}

async function deleteCategory(id) {
    if (confirm('Are you sure you want to delete this category?')) {
        try {
            await deleteDoc(doc(db, 'categories', id));
        } catch (error) {
            alert('Error deleting category: ' + error.message);
        }
    }
}

function editChannel(id) {
    const channel = adminState.channels.find(c => c.id === id);
    if (!channel) return;

    document.getElementById('channelId').value = channel.id;
    document.getElementById('channelName').value = channel.name;
    document.getElementById('channelCategory').value = channel.category;
    document.getElementById('channelLogoUrl').value = channel.logoUrl;
    document.getElementById('channelStreamUrl').value = channel.streamUrl;
    document.getElementById('channelIsFavorite').value = channel.isFavorite ? 'true' : 'false';
    
    document.getElementById('channelModalTitle').textContent = 'Edit Channel';
    document.getElementById('channelModal').classList.remove('hidden');
}

async function deleteChannel(id) {
    if (confirm('Are you sure you want to delete this channel?')) {
        try {
            await deleteDoc(doc(db, 'channels', id));
        } catch (error) {
            alert('Error deleting channel: ' + error.message);
        }
    }
}

function renderAdminSlides() {
    const grid = document.getElementById('adminSliderGrid');
    if(!grid) return;
    grid.innerHTML = '';
    
    adminState.slides.forEach(slide => {
        const div = document.createElement('div');
        div.className = 'admin-slide-card glass';
        div.innerHTML = `
            <img src="${slide.imageUrl}" alt="${slide.title}">
            <div class="admin-slide-actions">
                <button class="icon-btn edit-slide-btn" data-id="${slide.id}" style="background: rgba(0,0,0,0.5);"><i data-lucide="edit"></i></button>
                <button class="icon-btn delete-slide-btn" data-id="${slide.id}" style="background: rgba(0,0,0,0.5); color: var(--danger);"><i data-lucide="trash-2"></i></button>
            </div>
            <div style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.7); padding: 0.5rem; color: white;">
                ${slide.title}
            </div>
        `;
        grid.appendChild(div);
    });
    lucide.createIcons();

    document.querySelectorAll('.edit-slide-btn').forEach(btn => {
        btn.addEventListener('click', (e) => editSlide(e.currentTarget.getAttribute('data-id')));
    });
    document.querySelectorAll('.delete-slide-btn').forEach(btn => {
        btn.addEventListener('click', (e) => deleteSlide(e.currentTarget.getAttribute('data-id')));
    });
}

function editSlide(id) {
    const slide = adminState