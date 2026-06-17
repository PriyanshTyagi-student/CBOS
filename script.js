// --- DATABASE SIMULATION (LocalStorage) ---

const DB_KEY = 'contact_book_os_db';

function initDB() {
    const data = localStorage.getItem(DB_KEY);
    if (!data) {
        localStorage.setItem(DB_KEY, JSON.stringify({
            contacts: [],
            categories: [],
            nextContactId: 1,
            nextCategoryId: 1
        }));
    }
}

function getDB() {
    return JSON.parse(localStorage.getItem(DB_KEY));
}

function saveDB(db) {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
}

// --- CRUD OPERATIONS ---

const DB = {
    getContacts: () => getDB().contacts,
    getCategories: () => getDB().categories,
    
    addContact: (name, mobile, email, address, categoryId) => {
        const db = getDB();
        // Check uniqueness for name + mobile
        if (db.contacts.some(c => c.name.toLowerCase() === name.toLowerCase() && c.mobile === mobile)) {
            throw new Error("Contact with this name and mobile already exists.");
        }
        
        const newContact = {
            id: db.nextContactId++,
            name, mobile, email, address, categoryId,
            createdAt: new Date().toISOString()
        };
        db.contacts.push(newContact);
        saveDB(db);
        return newContact;
    },

    updateContact: (id, updates) => {
        const db = getDB();
        const index = db.contacts.findIndex(c => c.id == id);
        if (index !== -1) {
            db.contacts[index] = { ...db.contacts[index], ...updates };
            saveDB(db);
            return db.contacts[index];
        }
        throw new Error("Contact not found.");
    },

    deleteContact: (id) => {
        const db = getDB();
        db.contacts = db.contacts.filter(c => c.id != id);
        saveDB(db);
    },

    addCategory: (name) => {
        const db = getDB();
        if (db.categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
            throw new Error("Category already exists.");
        }
        const newCategory = { id: db.nextCategoryId++, name };
        db.categories.push(newCategory);
        saveDB(db);
        return newCategory;
    },
    
    getCategoryName: (id) => {
        if (id === 'none') return 'UNCLASSIFIED';
        const cat = getDB().categories.find(c => c.id == id);
        return cat ? cat.name : 'UNCLASSIFIED';
    }
};

// --- BOOT SEQUENCE ---

document.addEventListener('DOMContentLoaded', () => {
    initDB();
    
    const bootFill = document.getElementById('boot-fill');
    const bootLogs = document.getElementById('boot-logs');
    const bootScreen = document.getElementById('boot-screen');
    const osWrapper = document.getElementById('os-wrapper');

    const logs = [
        "Verifying system integrity...",
        "Loading memory blocks...",
        "Establishing connection to LocalStorage...",
        "Mounting HUD interface...",
        "System Online."
    ];

    let logIndex = 0;
    const logInterval = setInterval(() => {
        if (logIndex < logs.length) {
            const p = document.createElement('div');
            p.textContent = `> ${logs[logIndex]}`;
            bootLogs.appendChild(p);
            bootFill.style.width = `${((logIndex + 1) / logs.length) * 100}%`;
            logIndex++;
        } else {
            clearInterval(logInterval);
            setTimeout(() => {
                bootScreen.classList.add('hidden');
                osWrapper.classList.remove('hidden');
                refreshAllViews();
            }, 500);
        }
    }, 300);

    setupEventListeners();
});

// --- NAVIGATION & EVENT LISTENERS ---

function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            const target = e.currentTarget;
            target.classList.add('active');
            
            const viewName = target.getAttribute('data-view');
            document.querySelectorAll('.view').forEach(view => view.classList.add('hidden'));
            document.getElementById(`view-${viewName}`).classList.remove('hidden');
            
            refreshAllViews();
        });
    });

    // Forms
    document.getElementById('btn-add-category').addEventListener('click', () => {
        const input = document.getElementById('new-category-name');
        if (input.value.trim()) {
            try {
                DB.addCategory(input.value.trim());
                input.value = '';
                refreshAllViews();
            } catch (err) {
                alert(err.message);
            }
        }
    });

    document.getElementById('create-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('form-contact-id').value;
        const name = document.getElementById('form-name').value;
        const mobile = document.getElementById('form-mobile').value;
        const email = document.getElementById('form-email').value;
        const address = document.getElementById('form-address').value;
        const categoryId = document.getElementById('form-category').value;

        try {
            if (id) {
                DB.updateContact(id, { name, mobile, email, address, categoryId });
            } else {
                DB.addContact(name, mobile, email, address, categoryId);
            }
            e.target.reset();
            document.getElementById('form-contact-id').value = '';
            // Switch back to directory
            document.querySelector('[data-view="directory"]').click();
        } catch (err) {
            alert(err.message);
        }
    });

    // Viewer
    document.getElementById('close-viewer').addEventListener('click', () => {
        document.getElementById('contact-viewer').classList.add('hidden');
    });

    document.getElementById('btn-delete-contact').addEventListener('click', () => {
        const id = document.getElementById('viewer-id').getAttribute('data-id');
        if (confirm("Are you sure you want to delete this entity?")) {
            DB.deleteContact(id);
            document.getElementById('contact-viewer').classList.add('hidden');
            refreshAllViews();
        }
    });

    document.getElementById('btn-edit-contact').addEventListener('click', () => {
        const id = document.getElementById('viewer-id').getAttribute('data-id');
        const contact = DB.getContacts().find(c => c.id == id);
        if (contact) {
            document.getElementById('form-contact-id').value = contact.id;
            document.getElementById('form-name').value = contact.name;
            document.getElementById('form-mobile').value = contact.mobile;
            document.getElementById('form-email').value = contact.email;
            document.getElementById('form-address').value = contact.address;
            document.getElementById('form-category').value = contact.categoryId || 'none';
            document.getElementById('contact-viewer').classList.add('hidden');
            document.querySelector('[data-view="create"]').click();
        }
    });

    // Global Search
    document.getElementById('global-search-input').addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        document.querySelector('[data-view="directory"]').click(); // Auto-switch to directory
        renderDirectory(query);
    });

    // Category Filter
    document.getElementById('category-filter').addEventListener('change', () => {
        renderDirectory();
    });

    // Terminal
    document.getElementById('legacy-mode-btn').addEventListener('click', () => {
        document.getElementById('legacy-terminal').classList.remove('hidden');
        terminalInit();
    });
    
    document.getElementById('close-terminal').addEventListener('click', () => {
        document.getElementById('legacy-terminal').classList.add('hidden');
    });
}

// --- VIEW RENDERING ---

function refreshAllViews() {
    renderDashboard();
    renderCategories();
    renderDirectory();
    renderVisualizer();
}

function renderDashboard() {
    const contacts = DB.getContacts();
    const categories = DB.getCategories();
    
    document.getElementById('metric-total').textContent = contacts.length;
    document.getElementById('metric-categories').textContent = categories.length;
    
    // Sort by recent
    const sorted = [...contacts].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Recent metric (last 7 days - simulated simply by last 5 items)
    document.getElementById('metric-recent').textContent = Math.min(contacts.length, 5);

    const recentList = document.getElementById('recent-list');
    recentList.innerHTML = '';
    
    sorted.slice(0, 5).forEach(c => {
        const el = document.createElement('div');
        el.className = 'contact-item-row';
        el.innerHTML = `
            <div class="contact-item-info">
                <strong>${c.name}</strong>
                <span>ID: ${c.id} | ${c.mobile}</span>
            </div>
            <span class="tag">${DB.getCategoryName(c.categoryId)}</span>
        `;
        el.addEventListener('click', () => openViewer(c));
        recentList.appendChild(el);
    });
}

function renderCategories() {
    const categories = DB.getCategories();
    
    // Forms dropdown
    const formSelect = document.getElementById('form-category');
    const filterSelect = document.getElementById('category-filter');
    
    const optionsHtml = categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    
    formSelect.innerHTML = `<option value="none">UNCLASSIFIED</option>` + optionsHtml;
    filterSelect.innerHTML = `<option value="all">ALL CATEGORIES</option><option value="none">UNCLASSIFIED</option>` + optionsHtml;

    // List view
    const list = document.getElementById('active-categories-list');
    list.innerHTML = '';
    categories.forEach(c => {
        const count = DB.getContacts().filter(contact => contact.categoryId == c.id).length;
        list.innerHTML += `
            <li>
                <span class="mono-text text-accent">${c.name}</span>
                <span class="tag">${count} Entities</span>
            </li>
        `;
    });
}

function renderDirectory(searchQuery = '') {
    const contacts = DB.getContacts();
    const filter = document.getElementById('category-filter').value;
    const tbody = document.getElementById('directory-body');
    tbody.innerHTML = '';

    const filtered = contacts.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(searchQuery) || c.mobile.includes(searchQuery);
        const matchesCategory = filter === 'all' || String(c.categoryId) === filter || (filter === 'none' && !c.categoryId);
        return matchesSearch && matchesCategory;
    });

    filtered.forEach(c => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="mono-text">#${c.id}</td>
            <td><strong>${c.name}</strong></td>
            <td class="mono-text">${c.mobile}</td>
            <td><span class="tag">${DB.getCategoryName(c.categoryId)}</span></td>
            <td><button class="cyber-btn" onclick="event.stopPropagation(); openViewerFromId(${c.id})">VIEW</button></td>
        `;
        tr.addEventListener('click', () => openViewer(c));
        tbody.appendChild(tr);
    });
}

window.openViewerFromId = (id) => {
    const contact = DB.getContacts().find(c => c.id == id);
    if(contact) openViewer(contact);
};

function openViewer(contact) {
    document.getElementById('viewer-id').textContent = `ID: ${contact.id}`;
    document.getElementById('viewer-id').setAttribute('data-id', contact.id);
    document.getElementById('viewer-name').textContent = contact.name;
    document.getElementById('viewer-mobile').textContent = contact.mobile;
    document.getElementById('viewer-email').textContent = contact.email || '--';
    document.getElementById('viewer-address').textContent = contact.address || '--';
    document.getElementById('viewer-category').textContent = DB.getCategoryName(contact.categoryId);
    
    document.getElementById('contact-viewer').classList.remove('hidden');
}

function renderVisualizer() {
    const container = document.getElementById('visualizer-canvas');
    container.innerHTML = '<div class="vis-tree" id="vis-tree"></div>';
    const tree = document.getElementById('vis-tree');

    const categories = DB.getCategories();
    const contacts = DB.getContacts();

    // Render categorized
    categories.forEach(cat => {
        const catsContacts = contacts.filter(c => c.categoryId == cat.id);
        if(catsContacts.length > 0) {
            const catEl = document.createElement('div');
            catEl.className = 'vis-category';
            let contactHtml = catsContacts.map(c => `<div class="vis-contact-node">${c.name}</div>`).join('');
            catEl.innerHTML = `
                <div class="vis-cat-name">├── ${cat.name}</div>
                <div class="vis-contacts">${contactHtml}</div>
            `;
            tree.appendChild(catEl);
        }
    });

    // Render unclassified
    const unclassified = contacts.filter(c => !c.categoryId || c.categoryId === 'none');
    if (unclassified.length > 0) {
        const catEl = document.createElement('div');
        catEl.className = 'vis-category';
        let contactHtml = unclassified.map(c => `<div class="vis-contact-node">${c.name}</div>`).join('');
        catEl.innerHTML = `
            <div class="vis-cat-name" style="color:var(--text-muted)">├── Unclassified</div>
            <div class="vis-contacts">${contactHtml}</div>
        `;
        tree.appendChild(catEl);
    }
}

// --- LEGACY TERMINAL SIMULATION ---

const termOut = document.getElementById('terminal-output');
const termIn = document.getElementById('terminal-input');
let termState = 'menu';
let termTempData = {};

function termPrint(text, delay = 0) {
    const div = document.createElement('div');
    div.textContent = text;
    termOut.appendChild(div);
    termOut.scrollTop = termOut.scrollHeight;
}

function termClear() {
    termOut.innerHTML = '';
}

function terminalInit() {
    termClear();
    termState = 'menu';
    termPrint("********************************************************************************");
    termPrint("                              CONTACT BOOK PROJECT                              ");
    termPrint("                    MADE BY: Niyati Singhal & Priyansh Tyagi                    ");
    termPrint("********************************************************************************\n");
    termMenu();
}

function termMenu() {
    termPrint("\nOptions:");
    termPrint("1. Add a new contact");
    termPrint("2. Update a contact");
    termPrint("3. Search for a contact");
    termPrint("4. Display all contacts");
    termPrint("5. Delete a contact");
    termPrint("6. Manage categories");
    termPrint("7. Exit");
    termPrint("Select an option (1-7): ");
    termState = 'menu_wait';
}

termIn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const val = termIn.value;
        termPrint(document.getElementById('terminal-prompt').textContent + val);
        termIn.value = '';
        processTerminalInput(val);
    }
});

function processTerminalInput(input) {
    switch (termState) {
        case 'menu_wait':
            if (input === '1') {
                termPrint("Enter name: ");
                termState = 'add_name';
                termTempData = {};
            } else if (input === '2') {
                termPrint("Enter contact ID to update: ");
                termState = 'update_id';
            } else if (input === '3') {
                termPrint("Enter name or contact ID to search: ");
                termState = 'search';
            } else if (input === '4') {
                displayAllTerminal();
                termMenu();
            } else if (input === '5') {
                termPrint("Enter contact ID to delete: ");
                termState = 'delete';
            } else if (input === '6') {
                termPrint("Terminal category management limited in simulation. Use Web UI.");
                termMenu();
            } else if (input === '7') {
                termPrint("Exiting The Contact Book. GOODBYE...");
                setTimeout(() => {
                    document.getElementById('legacy-terminal').classList.add('hidden');
                }, 1000);
            } else {
                termPrint("Invalid choice.");
                termMenu();
            }
            break;
            
        case 'add_name':
            termTempData.name = input;
            termPrint("Enter address: ");
            termState = 'add_address';
            break;
        case 'add_address':
            termTempData.address = input;
            termPrint("Enter mobile (10 digits): ");
            termState = 'add_mobile';
            break;
        case 'add_mobile':
            if (/^\d{10}$/.test(input)) {
                termTempData.mobile = input;
                termPrint("Enter email (optional): ");
                termState = 'add_email';
            } else {
                termPrint("Invalid mobile number. Enter mobile (10 digits): ");
            }
            break;
        case 'add_email':
            termTempData.email = input;
            try {
                const c = DB.addContact(termTempData.name, termTempData.mobile, termTempData.email, termTempData.address, 'none');
                termPrint(`Record Entered Successfully with contact ID ${c.id}\n`);
                refreshAllViews();
            } catch (e) {
                termPrint(`Error: ${e.message}\n`);
            }
            termMenu();
            break;
            
        case 'search':
            const c = DB.getContacts().find(c => c.id == input || c.name.toLowerCase() === input.toLowerCase());
            if (c) {
                termPrint(`Contact ID: ${c.id}`);
                termPrint(`Name: ${c.name}`);
                termPrint(`Address: ${c.address}`);
                termPrint(`Mobile: ${c.mobile}`);
                termPrint(`Email: ${c.email}`);
            } else {
                termPrint("No such record exists");
            }
            termMenu();
            break;

        case 'delete':
            const delTarget = DB.getContacts().find(c => c.id == input);
            if (delTarget) {
                DB.deleteContact(input);
                termPrint("Record deleted successfully");
                refreshAllViews();
            } else {
                termPrint("Record not found");
            }
            termMenu();
            break;
            
        case 'update_id':
            const upTarget = DB.getContacts().find(c => c.id == input);
            if (upTarget) {
                termTempData.updateId = input;
                termPrint(`Updating contact ID: ${input}`);
                termPrint("1. Name\n2. Address\n3. Mobile\n4. Email\n5. Done\nSelect option:");
                termState = 'update_menu';
            } else {
                termPrint("Contact not found.");
                termMenu();
            }
            break;
            
        case 'update_menu':
            if (input === '1') { termPrint("Enter new name:"); termState = 'update_name'; }
            else if (input === '2') { termPrint("Enter new address:"); termState = 'update_address'; }
            else if (input === '3') { termPrint("Enter new mobile:"); termState = 'update_mobile'; }
            else if (input === '4') { termPrint("Enter new email:"); termState = 'update_email'; }
            else if (input === '5') { termPrint("Done updating."); termMenu(); }
            else { termPrint("Invalid. Select 1-5:"); }
            break;
            
        case 'update_name':
            DB.updateContact(termTempData.updateId, {name: input}); termPrint("Updated."); refreshAllViews(); termState='update_menu'; termPrint("1. Name\n2. Address\n3. Mobile\n4. Email\n5. Done\nSelect option:"); break;
        case 'update_address':
            DB.updateContact(termTempData.updateId, {address: input}); termPrint("Updated."); refreshAllViews(); termState='update_menu'; termPrint("1. Name\n2. Address\n3. Mobile\n4. Email\n5. Done\nSelect option:"); break;
        case 'update_mobile':
            if (/^\d{10}$/.test(input)) { DB.updateContact(termTempData.updateId, {mobile: input}); termPrint("Updated."); refreshAllViews(); termState='update_menu'; termPrint("1. Name\n2. Address\n3. Mobile\n4. Email\n5. Done\nSelect option:"); }
            else { termPrint("Invalid mobile."); termState='update_menu'; } break;
        case 'update_email':
            DB.updateContact(termTempData.updateId, {email: input}); termPrint("Updated."); refreshAllViews(); termState='update_menu'; termPrint("1. Name\n2. Address\n3. Mobile\n4. Email\n5. Done\nSelect option:"); break;
    }
}

function displayAllTerminal() {
    termPrint(padRight('CONTACT ID', 15) + padRight('NAME', 20) + padRight('ADDRESS', 30) + padRight('MOBILE NO', 15) + padRight('EMAIL', 30));
    DB.getContacts().forEach(c => {
        termPrint(padRight(String(c.id), 15) + padRight(c.name, 20) + padRight(c.address||'', 30) + padRight(c.mobile, 15) + padRight(c.email||'', 30));
    });
}

function padRight(str, length) {
    return (str + " ".repeat(length)).substring(0, length);
}
