const tauri = window.__TAURI__ || {};
const { invoke } = tauri.core || {};
const { ask, message, open, save: saveDialog } = tauri.dialog || {};
const { readTextFile, writeTextFile } = tauri.fs || {}; // We'll use backend commands instead

console.log('Tauri APIs initialized:', {
    hasInvoke: !!invoke,
    hasDialog: !!ask,
    hasFs: !!readTextFile
});

// State
let profileMetadata = [];
let currentProfileId = null;
let commonConfig = '';
let systemHosts = '';
let multiSelect = false;

// DOM Elements
const profileList = document.getElementById('profile-list');
const editor = document.getElementById('editor');
const currentNameDisplay = document.getElementById('current-profile-name');
const multiToggle = document.getElementById('multi-select-toggle');
const saveBtn = document.getElementById('save-btn');
const renameBtn = document.getElementById('rename-btn');
const addBtn = document.getElementById('add-profile-btn');
const importBtn = document.getElementById('import-btn');
const exportBtn = document.getElementById('export-btn');
const refreshBtn = document.getElementById('refresh-btn');
const systemEditBtn = document.getElementById('system-edit-btn');

// Modal Logic
const modalOverlay = document.getElementById('modal-overlay');
const modalTitle = document.getElementById('modal-title');
const modalInput = document.getElementById('modal-input');
const modalConfirm = document.getElementById('modal-confirm');
const modalCancel = document.getElementById('modal-cancel');
let modalCallback = null;

function showPrompt(title, defaultValue, callback) {
    modalTitle.innerText = title;
    modalInput.value = defaultValue || '';
    modalOverlay.classList.remove('hidden');
    modalInput.focus();
    modalCallback = callback;
}

modalInput.onkeydown = (e) => {
    if (e.key === 'Enter') {
        modalConfirm.click();
    } else if (e.key === 'Escape') {
        modalCancel.click();
    }
};

modalConfirm.onclick = () => {
    console.log('Modal Confirm Clicked, value:', modalInput.value);
    if (modalCallback) modalCallback(modalInput.value);
    modalOverlay.classList.add('hidden');
};

modalCancel.onclick = () => {
    modalOverlay.classList.add('hidden');
};

// Toast Logic
const toastContainer = document.getElementById('toast-container');

function showToast(text, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';
    
    toast.innerHTML = `<span>${icon}</span><span>${text}</span>`;
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// Functions
async function loadData() {
    console.log('loadData starting...');
    try {
        if (!invoke) {
            console.error('Invoke not available!');
            return;
        }
        const config = await invoke('load_config');
        console.log('Config loaded:', config);
        
        profileMetadata = config.profiles || [];
        multiSelect = config.multi_select || false;
        multiToggle.checked = multiSelect;
        
        commonConfig = await invoke('load_common_config');
        console.log('Common config loaded');
        
        renderList();
        
        // Refresh editor if common is active
        if (currentProfileId === 'common') {
            editor.value = commonConfig;
        } else if (currentProfileId && currentProfileId !== 'system') {
            const p = profileMetadata.find(x => x.id === currentProfileId);
            if (p) {
                const content = await invoke('list_profiles'); 
                const match = content.find(x => x.id === currentProfileId);
                if (match) editor.value = match.content;
            }
        }
    } catch (e) {
        console.error('loadData error:', e);
        showToast(`加载失败: ${e}`, 'error');
    }
}

function renderList() {
    profileList.innerHTML = '';
    profileMetadata.forEach(p => {
        const li = document.createElement('li');
        li.className = `profile-item ${p.id === currentProfileId ? 'active' : ''} ${p.active ? 'is-enabled' : ''}`;
        li.dataset.id = p.id;
        li.innerHTML = `
            <span class="status-dot"></span>
            <span class="name">${p.name}</span>
            <span class="delete-row-btn" title="删除">🗑️</span>
        `;
        
        li.onclick = (e) => {
            if (e.target.classList.contains('delete-row-btn')) {
                deleteProfile(p.id, p.name);
            } else {
                selectProfile(p.id);
            }
        };
        
        li.ondblclick = () => toggleProfile(p.id);
        
        profileList.appendChild(li);
    });
}

async function selectProfile(id) {
    currentProfileId = id;
    renameBtn.classList.add('hidden');
    systemEditBtn.classList.add('hidden');
    systemEditBtn.innerText = '编辑';
    
    if (id === 'system') {
        currentNameDisplay.innerText = '系统 Hosts (只读)';
        editor.readOnly = true;
        saveBtn.classList.add('hidden');
        systemEditBtn.classList.remove('hidden');
        try {
            systemHosts = await invoke('get_system_hosts');
            editor.value = systemHosts;
        } catch (e) { console.error(e); }
    } else if (id === 'common') {
        currentNameDisplay.innerText = '公共配置 (Common)';
        editor.readOnly = false;
        saveBtn.classList.remove('hidden');
        editor.value = commonConfig;
    } else {
        const p = profileMetadata.find(x => x.id === id);
        if (p) {
            currentNameDisplay.innerText = p.name;
            editor.readOnly = false;
            saveBtn.classList.remove('hidden');
            renameBtn.classList.remove('hidden');
            try {
                // We use list_profiles to get content since get_profile_content doesn't exist
                const all = await invoke('list_profiles');
                const match = all.find(x => x.id === id);
                if (match) editor.value = match.content;
            } catch (e) { console.error(e); }
        }
    }
    
    renderList(); // Update active class
}

async function saveCurrent() {
    if (!currentProfileId) return;
    const content = editor.value;
    
    try {
        if (currentProfileId === 'common') {
            await invoke('save_common_config', { content });
            commonConfig = content;
        } else if (currentProfileId === 'system') {
            await invoke('save_system_hosts', { content });
            systemEditBtn.innerText = '编辑';
            editor.readOnly = true;
            saveBtn.classList.add('hidden');
            systemEditBtn.classList.remove('hidden');
            showToast('已更新系统文件', 'success');
            return;
        } else {
            await invoke('save_profile_content', { id: currentProfileId, content });
        }
        showToast('保存成功', 'success');
    } catch (e) {
        showToast(`保存失败: ${e}`, 'error');
    }
}

async function toggleSystemEdit() {
    if (editor.readOnly) {
        editor.readOnly = false;
        editor.focus();
        systemEditBtn.classList.add('hidden');
        saveBtn.classList.remove('hidden');
        showToast('进入编辑模式', 'info');
    }
}

async function toggleProfile(id) {
    if (id === 'system' || id === 'common') return;
    try {
        await invoke('toggle_profile_active', { id });
        await loadData();
    } catch (e) {
        showToast(`切换失败: ${e}`, 'error');
    }
}

async function createProfile(name) {
    console.log('Creating profile:', name);
    if (!name) return;
    try {
        const id = await invoke('create_profile', { name });
        console.log('Profile created, ID:', id);
        await loadData();
        selectProfile(id);
        showToast('创建成功', 'success');
    } catch (e) {
        console.error('Create profile error:', e);
        showToast(`创建失败: ${e}`, 'error');
    }
}

async function deleteProfile(id, name) {
    const confirmed = await ask(`确定要删除配置 "${name}" 吗？`, {
        title: '删除确认',
        kind: 'warning',
    });
    if (confirmed) {
        try {
            await invoke('delete_profile', { id });
            if (currentProfileId === id) {
                currentProfileId = null;
                editor.value = '';
                currentNameDisplay.innerText = '请选择配置';
            }
            await loadData();
            showToast('已删除', 'info');
        } catch (e) {
            showToast(`删除失败: ${e}`, 'error');
        }
    }
}

async function renameProfile() {
    if (!currentProfileId || currentProfileId === 'system' || currentProfileId === 'common') return;
    const p = profileMetadata.find(x => x.id === currentProfileId);
    if (!p) return;
    
    showPrompt('重命名配置', p.name, async (newName) => {
        if (!newName || newName === p.name) return;
        try {
           await invoke('rename_profile', { id: p.id, newName });
           await loadData();
           currentNameDisplay.innerText = newName;
           showToast('重命名成功', 'success');
        } catch (e) {
           showToast(`重命名失败: ${e}`, 'error');
        }
    });
}

async function toggleMultiSelect() {
    try {
        await invoke('set_multi_select', { enable: multiToggle.checked });
        multiSelect = multiToggle.checked;
        await loadData();
        showToast(multiSelect ? '多选模式已开启' : '多选模式已关闭');
    } catch (e) {
        console.error(e);
    }
}

async function importData() {
    const selected = await open({
        multiple: false,
        filters: [{ name: 'Data', extensions: ['json', 'txt', 'hosts'] }]
    });
    if (selected) {
        try {
            // Use backend command to bypass frontend FS permissions
            const content = await invoke('import_file', { path: selected });
            if (selected.endsWith('.json')) {
                await invoke('import_data', { jsonContent: content });
            } else {
                const name = selected.split(/[\/\\]/).pop().split('.')[0];
                await invoke('create_profile', { name, content });
            }
            await loadData();
            showToast('导入成功', 'success');
        } catch (e) {
            showToast(`导入失败: ${e}`, 'error');
        }
    }
}

async function exportAll() {
    const path = await saveDialog({
        defaultPath: 'hosts-backup.json',
        filters: [{ name: 'JSON', extensions: ['json'] }]
    });
    if (path) {
        try {
            const data = await invoke('export_data');
            // Use backend command to bypass frontend FS permissions
            await invoke('export_file', { path, content: data });
            showToast('导出成功', 'success');
        } catch (e) {
            showToast(`导出失败: ${e}`, 'error');
        }
    }
}

// Fixed list clicks
document.querySelectorAll('#fixed-list .profile-item').forEach(li => {
    li.onclick = () => selectProfile(li.dataset.id);
});

async function refreshData() {
    refreshBtn.classList.add('spinning');
    await loadData();
    setTimeout(() => {
        refreshBtn.classList.remove('spinning');
        showToast('数据已刷新', 'info');
    }, 500);
}

// Event Listeners
saveBtn.onclick = saveCurrent;
renameBtn.onclick = renameProfile;
systemEditBtn.onclick = toggleSystemEdit;
addBtn.onclick = () => showPrompt('新建配置', '', createProfile);
multiToggle.onchange = toggleMultiSelect;
refreshBtn.onclick = refreshData;
importBtn.onclick = importData;
exportBtn.onclick = exportAll;

// Init
window.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    selectProfile('system');
});
