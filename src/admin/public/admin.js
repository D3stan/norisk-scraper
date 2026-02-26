/**
 * NoRisk Admin Dashboard JavaScript
 * Handles submissions loading, pagination, search, filtering, and modal display
 */

// State management
const state = {
    submissions: [],
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20,
    searchQuery: '',
    dateFilter: '',
    isLoading: false
};

// DOM Elements
const elements = {
    submissionsTable: document.getElementById('submissionsTable'),
    pagination: document.getElementById('pagination'),
    searchInput: document.getElementById('searchInput'),
    dateFilter: document.getElementById('dateFilter'),
    searchBtn: document.getElementById('searchBtn'),
    logoutBtn: document.getElementById('logoutBtn'),
    exportBtn: document.getElementById('exportBtn'),
    changePasswordBtn: document.getElementById('changePasswordBtn'),
    detailModal: document.getElementById('detailModal'),
    modalBody: document.getElementById('modalBody'),
    modalClose: document.querySelector('.modal-close'),
    passwordModal: document.getElementById('passwordModal'),
    passwordModalClose: document.querySelector('.password-modal-close'),
    changePasswordForm: document.getElementById('changePasswordForm'),
    passwordMessage: document.getElementById('passwordMessage')
};

/**
 * Initialize the admin dashboard
 */
function init() {
    bindEvents();
    loadSubmissions();
}

/**
 * Bind event listeners
 */
function bindEvents() {
    // Search button
    elements.searchBtn.addEventListener('click', handleSearch);

    // Search input enter key
    elements.searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });

    // Date filter change
    elements.dateFilter.addEventListener('change', handleSearch);

    // Logout
    elements.logoutBtn.addEventListener('click', handleLogout);

    // Export CSV
    elements.exportBtn.addEventListener('click', handleExportCSV);

    // Change Password
    elements.changePasswordBtn.addEventListener('click', openPasswordModal);

    // Modal close
    elements.modalClose.addEventListener('click', closeModal);
    elements.detailModal.addEventListener('click', (e) => {
        if (e.target === elements.detailModal) {
            closeModal();
        }
    });

    // Escape key to close modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (elements.detailModal.classList.contains('active')) {
                closeModal();
            }
            if (elements.passwordModal.classList.contains('active')) {
                closePasswordModal();
            }
        }
    });

    // Password modal close handlers
    if (elements.passwordModalClose) {
        elements.passwordModalClose.addEventListener('click', closePasswordModal);
    }
    if (elements.passwordModal) {
        elements.passwordModal.addEventListener('click', (e) => {
            if (e.target === elements.passwordModal) {
                closePasswordModal();
            }
        });
    }

    // Change password form
    if (elements.changePasswordForm) {
        elements.changePasswordForm.addEventListener('submit', handleChangePassword);
    }
}

/**
 * Handle search/filter
 */
function handleSearch() {
    state.searchQuery = elements.searchInput.value.trim();
    state.dateFilter = elements.dateFilter.value;
    state.currentPage = 1;
    loadSubmissions();
}

/**
 * Load submissions from API
 */
async function loadSubmissions() {
    if (state.isLoading) return;

    state.isLoading = true;
    showLoading();

    try {
        const params = new URLSearchParams({
            page: state.currentPage.toString(),
            limit: state.itemsPerPage.toString()
        });

        if (state.searchQuery) {
            params.append('search', state.searchQuery);
        }

        if (state.dateFilter) {
            params.append('dateFilter', state.dateFilter);
        }

        const response = await fetch(`/admin/api/submissions?${params}`);

        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/admin/login';
                return;
            }
            throw new Error('Failed to load submissions');
        }

        const data = await response.json();

        state.submissions = data.submissions || [];
        state.totalItems = data.total || 0;
        state.totalPages = Math.ceil(state.totalItems / state.itemsPerPage);

        renderTable();
        renderPagination();
    } catch (error) {
        console.error('Error loading submissions:', error);
        showError('Errore durante il caricamento dei dati. Riprova.');
    } finally {
        state.isLoading = false;
    }
}

/**
 * Show loading state in table
 */
function showLoading() {
    elements.submissionsTable.innerHTML = `
        <tr>
            <td colspan="5" class="loading-row">
                Caricamento in corso...
            </td>
        </tr>
    `;
}

/**
 * Show error message in table
 */
function showError(message) {
    elements.submissionsTable.innerHTML = `
        <tr>
            <td colspan="5" class="empty-row">
                ${message}
            </td>
        </tr>
    `;
}

/**
 * Render submissions table
 */
function renderTable() {
    if (state.submissions.length === 0) {
        elements.submissionsTable.innerHTML = `
            <tr>
                <td colspan="5" class="empty-row">
                    Nessuna richiesta trovata
                </td>
            </tr>
        `;
        return;
    }

    elements.submissionsTable.innerHTML = state.submissions.map(submission => {
        const date = new Date(submission.createdAt).toLocaleDateString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const name = submission.companyName ||
            submission.name ||
            'N/D';

        return `
            <tr data-id="${submission.id}">
                <td>${date}</td>
                <td>${escapeHtml(name)}</td>
                <td>${escapeHtml(submission.email || 'N/D')}</td>
                <td>${escapeHtml(submission.phone || 'N/D')}</td>
                <td><span class="quote-code">${escapeHtml(submission.quoteCode || 'N/D')}</span></td>
            </tr>
        `;
    }).join('');

    // Add click handlers to rows
    elements.submissionsTable.querySelectorAll('tr').forEach(row => {
        row.addEventListener('click', () => {
            const id = row.getAttribute('data-id');
            const submission = state.submissions.find(s => s.id === id);
            if (submission) {
                showDetailModal(submission);
            }
        });
    });
}

/**
 * Render pagination controls
 */
function renderPagination() {
    if (state.totalPages <= 1) {
        elements.pagination.innerHTML = '';
        return;
    }

    let html = '';

    // Previous button
    html += `
        <button ${state.currentPage === 1 ? 'disabled' : ''} data-page="prev">
            &laquo;
        </button>
    `;

    // Page numbers
    const maxVisiblePages = 5;
    let startPage = Math.max(1, state.currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(state.totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    if (startPage > 1) {
        html += `<button data-page="1">1</button>`;
        if (startPage > 2) {
            html += `<button disabled>...</button>`;
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="${i === state.currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }

    if (endPage < state.totalPages) {
        if (endPage < state.totalPages - 1) {
            html += `<button disabled>...</button>`;
        }
        html += `<button data-page="${state.totalPages}">${state.totalPages}</button>`;
    }

    // Next button
    html += `
        <button ${state.currentPage === state.totalPages ? 'disabled' : ''} data-page="next">
            &raquo;
        </button>
    `;

    // Page info
    html += `
        <span class="page-info">
            ${state.totalItems} risultati totali
        </span>
    `;

    elements.pagination.innerHTML = html;

    // Add click handlers
    elements.pagination.querySelectorAll('button[data-page]').forEach(button => {
        button.addEventListener('click', () => {
            const page = button.getAttribute('data-page');

            if (page === 'prev') {
                if (state.currentPage > 1) {
                    state.currentPage--;
                    loadSubmissions();
                }
            } else if (page === 'next') {
                if (state.currentPage < state.totalPages) {
                    state.currentPage++;
                    loadSubmissions();
                }
            } else {
                state.currentPage = parseInt(page, 10);
                loadSubmissions();
            }
        });
    });
}

/**
 * Show submission details in modal
 */
function showDetailModal(submission) {
    const date = new Date(submission.createdAt).toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    const name = submission.companyName ||
        submission.name ||
        'N/D';

    let html = `
        <div class="modal-section">
            <h3>Informazioni Generali</h3>
            <div class="modal-row">
                <span class="modal-label">Data Richiesta</span>
                <span class="modal-value">${date}</span>
            </div>
            <div class="modal-row">
                <span class="modal-label">Codice Preventivo</span>
                <span class="modal-value">${escapeHtml(submission.quoteCode || 'N/D')}</span>
            </div>
        </div>

        <div class="modal-section">
            <h3>Dati Richiedente</h3>
            <div class="modal-row">
                <span class="modal-label">Nome / Ragione Sociale</span>
                <span class="modal-value">${escapeHtml(name)}</span>
            </div>
            <div class="modal-row">
                <span class="modal-label">Email</span>
                <span class="modal-value">${escapeHtml(submission.email || 'N/D')}</span>
            </div>
            <div class="modal-row">
                <span class="modal-label">Telefono</span>
                <span class="modal-value">${escapeHtml(submission.phone || 'N/D')}</span>
            </div>
    `;

    // Add company details if present
    if (submission.vatNumber || submission.fiscalCode) {
        html += `
            <div class="modal-row">
                <span class="modal-label">Partita IVA</span>
                <span class="modal-value">${escapeHtml(submission.vatNumber || 'N/D')}</span>
            </div>
            <div class="modal-row">
                <span class="modal-label">Codice Fiscale</span>
                <span class="modal-value">${escapeHtml(submission.fiscalCode || 'N/D')}</span>
            </div>
        `;
    }

    html += `</div>`;

    // Add event details if present
    if (submission.eventType || submission.eventDate || submission.eventLocation) {
        html += `
            <div class="modal-section">
                <h3>Dettagli Evento</h3>
        `;

        if (submission.eventType) {
            html += `
                <div class="modal-row">
                    <span class="modal-label">Tipo Evento</span>
                    <span class="modal-value">${escapeHtml(submission.eventType)}</span>
                </div>
            `;
        }

        if (submission.eventDate) {
            const eventDate = new Date(submission.eventDate).toLocaleDateString('it-IT');
            html += `
                <div class="modal-row">
                    <span class="modal-label">Data Evento</span>
                    <span class="modal-value">${eventDate}</span>
                </div>
            `;
        }

        if (submission.eventLocation) {
            html += `
                <div class="modal-row">
                    <span class="modal-label">Luogo</span>
                    <span class="modal-value">${escapeHtml(submission.eventLocation)}</span>
                </div>
            `;
        }

        if (submission.guestCount) {
            html += `
                <div class="modal-row">
                    <span class="modal-label">Numero Ospiti</span>
                    <span class="modal-value">${submission.guestCount}</span>
                </div>
            `;
        }

        html += `</div>`;
    }

    // Add coverage details if present
    if (submission.coverages && submission.coverages.length > 0) {
        html += `
            <div class="modal-section">
                <h3>Coperture Richieste</h3>
        `;

        submission.coverages.forEach(coverage => {
            html += `
                <div class="modal-row">
                    <span class="modal-label">${escapeHtml(coverage.name)}</span>
                    <span class="modal-value">${escapeHtml(coverage.details || 'Selezionata')}</span>
                </div>
            `;
        });

        html += `</div>`;
    }

    // Add raw data section for additional fields
    const excludedFields = ['id', 'createdAt', 'updatedAt', 'quoteCode', 'name',
        'companyName', 'email', 'phone', 'vatNumber', 'fiscalCode', 'eventType',
        'eventDate', 'eventLocation', 'guestCount', 'coverages', 'premiumAmount', 'currency'];

    const additionalFields = Object.keys(submission).filter(key =>
        !excludedFields.includes(key) && submission[key] !== null && submission[key] !== undefined
    );

    if (additionalFields.length > 0) {
        html += `
            <div class="modal-section">
                <h3>Altri Dati</h3>
        `;

        additionalFields.forEach(key => {
            const value = submission[key];
            if (typeof value !== 'object') {
                html += `
                    <div class="modal-row">
                        <span class="modal-label">${formatFieldName(key)}</span>
                        <span class="modal-value">${escapeHtml(String(value))}</span>
                    </div>
                `;
            }
        });

        html += `</div>`;
    }

    elements.modalBody.innerHTML = html;
    elements.detailModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

/**
 * Close the detail modal
 */
function closeModal() {
    elements.detailModal.classList.remove('active');
    document.body.style.overflow = '';
}

/**
 * Handle logout
 */
async function handleLogout() {
    try {
        const response = await fetch('/admin/api/logout', {
            method: 'POST'
        });

        if (response.ok) {
            window.location.href = '/admin/login';
        }
    } catch (error) {
        console.error('Logout error:', error);
    }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    if (text === null || text === undefined) {
        return 'N/D';
    }
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

/**
 * Format field name for display
 */
function formatFieldName(name) {
    return name
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .replace(/_/g, ' ');
}

/**
 * Handle CSV export
 */
async function handleExportCSV() {
    try {
        const params = new URLSearchParams();
        if (state.searchQuery) params.append('search', state.searchQuery);
        if (state.dateFilter) params.append('dateFilter', state.dateFilter);

        const response = await fetch(`/admin/api/submissions/export?${params}`);

        if (!response.ok) {
            if (response.status === 401) {
                window.location.href = '/admin/login';
                return;
            }
            throw new Error('Export failed');
        }

        // Download the CSV file
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `submissions_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

    } catch (error) {
        console.error('Error exporting CSV:', error);
        alert('Errore durante l\'esportazione. Riprova.');
    }
}

/**
 * Open password change modal
 */
function openPasswordModal() {
    elements.passwordModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    elements.changePasswordForm.reset();
    elements.passwordMessage.textContent = '';
    elements.passwordMessage.className = 'message';
}

/**
 * Close password change modal
 */
function closePasswordModal() {
    elements.passwordModal.classList.remove('active');
    document.body.style.overflow = '';
}

/**
 * Handle password change
 */
async function handleChangePassword(e) {
    e.preventDefault();

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (newPassword !== confirmPassword) {
        elements.passwordMessage.textContent = 'Le password non coincidono';
        elements.passwordMessage.className = 'message error';
        return;
    }

    if (newPassword.length < 8) {
        elements.passwordMessage.textContent = 'La password deve essere di almeno 8 caratteri';
        elements.passwordMessage.className = 'message error';
        return;
    }

    try {
        const response = await fetch('/admin/api/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentPassword, newPassword })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            elements.passwordMessage.textContent = 'Password cambiata con successo! Aggiorna la variabile ADMIN_PASSWORD_HASH nel tuo file .env';
            elements.passwordMessage.className = 'message success';
            setTimeout(() => {
                closePasswordModal();
            }, 3000);
        } else {
            elements.passwordMessage.textContent = data.error || 'Errore durante il cambio password';
            elements.passwordMessage.className = 'message error';
        }
    } catch (error) {
        console.error('Error changing password:', error);
        elements.passwordMessage.textContent = 'Errore di rete. Riprova.';
        elements.passwordMessage.className = 'message error';
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
