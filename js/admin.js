/**
 * admin.js — Admin Moderation Dashboard Logic (Immersive Fiesta 2026)
 * ===================================================================
 */

// =============================================
// STATE & CONFIG
// =============================================
const DEFAULT_PIN = "1234";
let allEntries = [];
let activeTab = "pending"; // 'pending' | 'approved' | 'rejected' | 'all'
let searchQuery = "";
let realtimeChannel = null;

// DOM References
const pinModal = document.getElementById('pinModal');
const pinForm = document.getElementById('pinForm');
const pinInput = document.getElementById('pinInput');
const pinError = document.getElementById('pinError');

const imageModal = document.getElementById('imageModal');
const btnCloseZoom = document.getElementById('btnCloseZoom');
const zoomedImg = document.getElementById('zoomedImg');
const zoomedNama = document.getElementById('zoomedNama');
const zoomedCaption = document.getElementById('zoomedCaption');

const adminApp = document.getElementById('adminApp');
const btnLockAdmin = document.getElementById('btnLockAdmin');
const realtimeBadge = document.getElementById('realtimeBadge');
const realtimeText = document.getElementById('realtimeText');

const countPending = document.getElementById('countPending');
const countApproved = document.getElementById('countApproved');
const countRejected = document.getElementById('countRejected');
const countFlagged = document.getElementById('countFlagged');

const tabCountPending = document.getElementById('tabCountPending');
const tabCountApproved = document.getElementById('tabCountApproved');
const tabCountRejected = document.getElementById('tabCountRejected');
const tabCountAll = document.getElementById('tabCountAll');

const searchInput = document.getElementById('searchInput');
const btnApproveAll = document.getElementById('btnApproveAll');
const btnRejectAll = document.getElementById('btnRejectAll');
const btnRefresh = document.getElementById('btnRefresh');

const cardsGrid = document.getElementById('cardsGrid');
const emptyState = document.getElementById('emptyState');
const emptySubtext = document.getElementById('emptySubtext');
const toastContainer = document.getElementById('toastContainer');

// =============================================
// AUTHENTICATION (PIN CHECK)
// =============================================
function checkAuth() {
    const isAuth = localStorage.getItem('admin_authenticated') === 'true';
    if (isAuth) {
        pinModal.classList.add('hidden');
        adminApp.classList.remove('hidden');
        initDashboard();
    } else {
        pinModal.classList.remove('hidden');
        adminApp.classList.add('hidden');
        setTimeout(() => pinInput && pinInput.focus(), 100);
    }
}

if (pinForm) {
    pinForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const inputVal = pinInput.value.trim();
        if (inputVal === DEFAULT_PIN) {
            localStorage.setItem('admin_authenticated', 'true');
            pinError.classList.add('hidden');
            pinInput.value = '';
            checkAuth();
            showToast('Login berhasil! Selamat datang Admin.', 'success');
        } else {
            pinError.classList.remove('hidden');
            pinInput.value = '';
            pinInput.focus();
        }
    });
}

if (btnLockAdmin) {
    btnLockAdmin.addEventListener('click', () => {
        localStorage.removeItem('admin_authenticated');
        if (realtimeChannel) supabaseClient.removeChannel(realtimeChannel);
        checkAuth();
    });
}

// =============================================
// CORE DASHBOARD INITIALIZATION
// =============================================
async function initDashboard() {
    if (!supabaseClient) {
        showToast('Supabase client tidak ditemukan di config.js!', 'danger');
        return;
    }

    await fetchAllEntries();
    setupRealtimeSubscription();
    setupEventListeners();
}

/** Fetch data dari Supabase */
async function fetchAllEntries() {
    try {
        const { data, error } = await supabaseClient
            .from(DB_TABLE)
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        allEntries = data || [];
        renderDashboard();
    } catch (err) {
        console.error('[Admin] Error fetching entries:', err);
        showToast(`Gagal mengambil data: ${err.message}`, 'danger');
    }
}

/** Setup Supabase Realtime Listener */
function setupRealtimeSubscription() {
    if (realtimeChannel) supabaseClient.removeChannel(realtimeChannel);

    realtimeText.textContent = 'Menghubungkan...';
    realtimeBadge.className = 'status-live-pill offline';

    realtimeChannel = supabaseClient
        .channel('admin-realtime-changes')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: DB_TABLE },
            (payload) => {
                handleRealtimeEvent(payload);
            }
        )
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                realtimeBadge.className = 'status-live-pill online';
                realtimeText.textContent = 'Live Realtime Active';
            } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                realtimeBadge.className = 'status-live-pill offline';
                realtimeText.textContent = 'Realtime Reconnecting...';
            }
        });
}

/** Tangani event realtime (INSERT, UPDATE, DELETE) */
function handleRealtimeEvent(payload) {
    const { eventType, new: newRow, old: oldRow } = payload;

    if (eventType === 'INSERT') {
        allEntries.unshift(newRow);
        showToast(`📥 Foto baru dari ${escapeHtml(newRow.nama)} masuk ke antrean!`, 'success');
    } else if (eventType === 'UPDATE') {
        const idx = allEntries.findIndex(e => e.id === newRow.id);
        if (idx !== -1) {
            allEntries[idx] = newRow;
        }
    } else if (eventType === 'DELETE') {
        allEntries = allEntries.filter(e => e.id !== oldRow.id);
    }

    renderDashboard();
}

// =============================================
// RENDER & FILTER UI
// =============================================
function renderDashboard() {
    // 1. Hitung Statistik
    const pendingList = allEntries.filter(e => (e.status || 'pending') === 'pending');
    const approvedList = allEntries.filter(e => e.status === 'approved');
    const rejectedList = allEntries.filter(e => e.status === 'rejected');
    const flaggedList = allEntries.filter(e => e.is_flagged === true);

    countPending.textContent = pendingList.length;
    countApproved.textContent = approvedList.length;
    countRejected.textContent = rejectedList.length;
    countFlagged.textContent = flaggedList.length;

    tabCountPending.textContent = pendingList.length;
    tabCountApproved.textContent = approvedList.length;
    tabCountRejected.textContent = rejectedList.length;
    tabCountAll.textContent = allEntries.length;

    // Pulse animation jika ada pending
    const statCardPending = document.getElementById('statCardPending');
    if (statCardPending) {
        statCardPending.style.borderColor = pendingList.length > 0 ? '#f39c12' : '';
    }

    // 2. Filter berdasarkan Tab Aktif & Search Query
    let filtered = allEntries;

    if (activeTab === 'pending') {
        filtered = pendingList;
    } else if (activeTab === 'approved') {
        filtered = approvedList;
    } else if (activeTab === 'rejected') {
        filtered = rejectedList;
    }

    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(e =>
            (e.nama && e.nama.toLowerCase().includes(q)) ||
            (e.caption && e.caption.toLowerCase().includes(q))
        );
    }

    // 3. Render Cards Grid
    cardsGrid.innerHTML = '';

    if (filtered.length === 0) {
        emptyState.classList.remove('hidden');
        if (activeTab === 'pending') emptySubtext.textContent = 'Semua foto pengunjung sudah disetujui / ditolak.';
        else if (activeTab === 'approved') emptySubtext.textContent = 'Belum ada foto yang disetujui.';
        else if (activeTab === 'rejected') emptySubtext.textContent = 'Belum ada foto yang ditolak.';
        else emptySubtext.textContent = 'Belum ada data pengunjung yang masuk.';
        return;
    }

    emptyState.classList.add('hidden');

    filtered.forEach(entry => {
        const card = createVisitorCard(entry);
        cardsGrid.appendChild(card);
    });
}

/** Membentuk DOM Card Pengunjung */
function createVisitorCard(entry) {
    const card = document.createElement('div');
    const status = entry.status || 'pending';
    const isFlagged = entry.is_flagged || false;

    card.className = `visitor-card glass-panel ${isFlagged ? 'flagged-card' : ''}`;
    card.dataset.id = entry.id;

    const timeAgo = formatTimeAgo(entry.created_at);

    card.innerHTML = `
        <div class="card-img-container" onclick="openZoomModal('${entry.image_url}', '${escapeHtml(entry.nama)}', '${escapeHtml(entry.caption || '')}')">
            <img class="card-img" src="${entry.image_url}" alt="${escapeHtml(entry.nama)}" loading="lazy">
            <div class="card-overlay-badges">
                <span class="badge-status ${status}">${status}</span>
                ${isFlagged ? '<span class="badge-flagged">⚠️ BADWORD DETECTED</span>' : ''}
            </div>
        </div>
        <div class="card-body">
            <h3 class="card-nama">${escapeHtml(entry.nama)}</h3>
            <p class="card-caption">${entry.caption ? escapeHtml(entry.caption) : '<em style="opacity:0.5;">Tanpa caption</em>'}</p>
            <div class="card-time">🕒 ${timeAgo}</div>
            <div class="card-actions">
                <button class="btn-card-action btn-approve" onclick="handleUpdateStatus(${entry.id}, 'approved')" title="Setujui (Tayang di Proyektor)">
                    ✓ Approve
                </button>
                <button class="btn-card-action btn-reject" onclick="handleUpdateStatus(${entry.id}, 'rejected')" title="Tolak Foto/Caption">
                    ✕ Reject
                </button>
                <button class="btn-card-action btn-delete" onclick="handleDelete(${entry.id})" title="Hapus Permanen">
                    🗑
                </button>
            </div>
        </div>
    `;

    return card;
}

// =============================================
// MODERATION ACTIONS (APPROVE, REJECT, DELETE)
// =============================================
window.handleUpdateStatus = async function (id, newStatus) {
    try {
        const { error } = await supabaseClient
            .from(DB_TABLE)
            .update({ status: newStatus })
            .eq('id', id);

        if (error) throw error;

        // Update local state instan
        const item = allEntries.find(e => e.id === id);
        if (item) {
            item.status = newStatus;
            showToast(`Status ${escapeHtml(item.nama)} diubah menjadi ${newStatus.toUpperCase()}`, 'success');
        }

        renderDashboard();
    } catch (err) {
        console.error('[Admin] Update status error:', err);
        showToast(`Gagal merubah status: ${err.message}`, 'danger');
    }
};

window.handleDelete = async function (id) {
    if (!confirm('Apakah kamu yakin ingin menghapus data pengunjung ini secara permanen?')) {
        return;
    }

    try {
        const { error } = await supabaseClient
            .from(DB_TABLE)
            .delete()
            .eq('id', id);

        if (error) throw error;

        allEntries = allEntries.filter(e => e.id !== id);
        showToast('Data pengunjung berhasil dihapus.', 'success');
        renderDashboard();
    } catch (err) {
        console.error('[Admin] Delete error:', err);
        showToast(`Gagal menghapus: ${err.message}`, 'danger');
    }
};

// =============================================
// BULK ACTIONS & EVENT LISTENERS
// =============================================
function setupEventListeners() {
    // Filter Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeTab = btn.dataset.tab;
            renderDashboard();
        });
    });

    // Search Input
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.trim();
            renderDashboard();
        });
    }

    // Refresh Button
    if (btnRefresh) {
        btnRefresh.addEventListener('click', () => {
            fetchAllEntries();
            showToast('Data diperbarui dari server.', 'success');
        });
    }

    // Bulk Approve All Pending
    if (btnApproveAll) {
        btnApproveAll.addEventListener('click', async () => {
            const pendingList = allEntries.filter(e => (e.status || 'pending') === 'pending');
            if (pendingList.length === 0) {
                showToast('Tidak ada antrean pending yang perlu disetujui.', 'success');
                return;
            }

            if (!confirm(`Setujui semua ${pendingList.length} foto pending sekaligus?`)) return;

            const ids = pendingList.map(e => e.id);
            try {
                const { error } = await supabaseClient
                    .from(DB_TABLE)
                    .update({ status: 'approved' })
                    .in('id', ids);

                if (error) throw error;

                pendingList.forEach(e => e.status = 'approved');
                showToast(`Berhasil menyetujui ${pendingList.length} foto!`, 'success');
                renderDashboard();
            } catch (err) {
                showToast(`Gagal bulk approve: ${err.message}`, 'danger');
            }
        });
    }

    // Bulk Reject All Pending
    if (btnRejectAll) {
        btnRejectAll.addEventListener('click', async () => {
            const pendingList = allEntries.filter(e => (e.status || 'pending') === 'pending');
            if (pendingList.length === 0) {
                showToast('Tidak ada antrean pending.', 'success');
                return;
            }

            if (!confirm(`Tolak semua ${pendingList.length} foto pending?`)) return;

            const ids = pendingList.map(e => e.id);
            try {
                const { error } = await supabaseClient
                    .from(DB_TABLE)
                    .update({ status: 'rejected' })
                    .in('id', ids);

                if (error) throw error;

                pendingList.forEach(e => e.status = 'rejected');
                showToast(`Berhasil menolak ${pendingList.length} foto.`, 'success');
                renderDashboard();
            } catch (err) {
                showToast(`Gagal bulk reject: ${err.message}`, 'danger');
            }
        });
    }

    // Close Zoom Modal
    if (btnCloseZoom) {
        btnCloseZoom.addEventListener('click', () => {
            imageModal.classList.add('hidden');
        });
    }
    if (imageModal) {
        imageModal.addEventListener('click', (e) => {
            if (e.target === imageModal) imageModal.classList.add('hidden');
        });
    }
}

// Zoom Modal Handler
window.openZoomModal = function (url, nama, caption) {
    zoomedImg.src = url;
    zoomedNama.textContent = nama;
    zoomedCaption.textContent = caption || '';
    imageModal.classList.remove('hidden');
};

// =============================================
// UTILITY HELPERS
// =============================================
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatTimeAgo(isoString) {
    if (!isoString) return 'Baru saja';
    const date = new Date(isoString);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);

    if (diffSec < 60) return 'Baru saja';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} menit yang lalu`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} jam yang lalu`;
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function showToast(msg, type = 'success') {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = msg;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Inisialisasi awal saat script dimuat
document.addEventListener('DOMContentLoaded', checkAuth);
