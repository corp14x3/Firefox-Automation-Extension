// Restored and cleaned popup.js
// Provides popup UI logic for the Firefox Automation extension.

const state = {
    currentAutomationIndex: -1,
    selectedAutomationIndex: -1,
    selectedItem: null,
    selectionInProgress: false
};

const elements = {
    anaMenu: null,
    detayMenu: null,
    otomasyonListesi: null,
    ekleBtn: null,
    silBtn: null,
    geriDonBtn: null,
    ogeEkleBtn: null,
    zamanEkleBtn: null,
    baslatBtn: null,
    jsKoduBtn: null,
    
    currentAutomationName: null,
    otomasyonAdimlari: null,
    init() {
        this.anaMenu = document.getElementById('anaMenu');
        this.detayMenu = document.getElementById('detayMenu');
        this.otomasyonListesi = document.getElementById('otomasyonListesi');
        this.ekleBtn = document.getElementById('ekleBtn');
        this.silBtn = document.getElementById('silBtn');
        this.geriDonBtn = document.getElementById('geriDonBtn');
        this.ogeEkleBtn = document.getElementById('ogeEkleBtn');
        this.zamanEkleBtn = document.getElementById('zamanEkleBtn');
        this.baslatBtn = document.getElementById('baslatBtn');
        this.jsKoduBtn = document.getElementById('jsKoduBtn');

        this.currentAutomationName = document.getElementById('currentAutomationName');
        this.otomasyonAdimlari = document.getElementById('otomasyonAdimlari');
    }
};

function showToast(message, duration = 1200) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.position = 'fixed';
    toast.style.bottom = '12px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.background = 'rgba(0,0,0,0.8)';
    toast.style.color = 'white';
    toast.style.padding = '8px 12px';
    toast.style.borderRadius = '6px';
    toast.style.zIndex = 9999;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), duration);
}

function showInputDialog(title, placeholder = '') {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = 0;
        overlay.style.left = 0;
        overlay.style.right = 0;
        overlay.style.bottom = 0;
        overlay.style.background = 'rgba(0,0,0,0.4)';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.zIndex = 10000;

        const box = document.createElement('div');
        box.style.background = '#fff';
        box.style.padding = '12px';
        box.style.borderRadius = '8px';
        box.style.minWidth = '220px';

        const h = document.createElement('div');
        h.textContent = title;
        h.style.marginBottom = '8px';

        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = placeholder;
        input.style.width = '100%';
        input.style.boxSizing = 'border-box';
        input.style.marginBottom = '8px';

        const btnRow = document.createElement('div');
        btnRow.style.display = 'flex';
        btnRow.style.justifyContent = 'flex-end';
        btnRow.style.gap = '8px';

        const cancel = document.createElement('button');
        cancel.textContent = 'İptal';
        const ok = document.createElement('button');
        ok.textContent = 'Tamam';
        btnRow.appendChild(cancel);
        btnRow.appendChild(ok);

        box.appendChild(h);
        box.appendChild(input);
        box.appendChild(btnRow);
        overlay.appendChild(box);
        document.body.appendChild(overlay);

        input.focus();

        function cleanup() { overlay.remove(); }

        cancel.addEventListener('click', () => { cleanup(); resolve(null); });
        ok.addEventListener('click', () => { const v = input.value && input.value.trim(); cleanup(); resolve(v || null); });
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') ok.click(); else if (e.key === 'Escape') cancel.click(); });
    });
}

function showConfirmDialog(message) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.top = 0;
        overlay.style.left = 0;
        overlay.style.right = 0;
        overlay.style.bottom = 0;
        overlay.style.background = 'rgba(0,0,0,0.35)';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.zIndex = 10000;

        const box = document.createElement('div');
        box.style.background = '#fff';
        box.style.padding = '12px';
        box.style.borderRadius = '8px';
        box.style.minWidth = '240px';

        const txt = document.createElement('div');
        txt.textContent = message;
        txt.style.marginBottom = '12px';

        const btnRow = document.createElement('div');
        btnRow.style.display = 'flex';
        btnRow.style.justifyContent = 'flex-end';
        btnRow.style.gap = '8px';

        const no = document.createElement('button'); no.textContent = 'Hayır';
        const yes = document.createElement('button'); yes.textContent = 'Evet';
        btnRow.appendChild(no); btnRow.appendChild(yes);

        box.appendChild(txt); box.appendChild(btnRow); overlay.appendChild(box); document.body.appendChild(overlay);

        function cleanup() { overlay.remove(); }
        no.addEventListener('click', () => { cleanup(); resolve(false); });
        yes.addEventListener('click', () => { cleanup(); resolve(true); });
    });
}

function displayAutomationSteps(steps) {
    const container = elements.otomasyonAdimlari;
    if (!container) return;
    container.innerHTML = '';

    if (!steps || steps.length === 0) {
        container.innerHTML = '<div style="color: gray; text-align: center; padding: 20px;">Henüz bir adım eklenmemiş. "Öğe ekle" ile başla!</div>';
        return;
    }

    steps.forEach((step, index) => {
        const item = document.createElement('div');
        item.style.padding = '8px';
        item.style.borderBottom = '1px dashed #ccc';
        item.style.backgroundColor = '#f9f9f9';
        item.style.borderRadius = '3px';
        item.style.marginBottom = '5px';
        item.style.display = 'flex';
        item.style.justifyContent = 'space-between';
        item.style.alignItems = 'center';

        function getStepTypeText(type) {
            switch(type) {
                case 'click': return 'TIKLA';
                case 'input': return 'METİN GİR';
                case 'delay': return 'BEKLE';
                case 'navigate': return 'SAYFAYA GİT';
                default: return String(type).toUpperCase();
            }
        }

        function getElementTypeText(tag) {
            switch(tag?.toLowerCase()) {
                case 'button': return 'BUTON';
                case 'input': return 'METİN KUTUSU';
                case 'a': return 'LİNK';
                case 'select': return 'AÇILIR MENÜ';
                case 'textarea': return 'METİN ALANI';
                default: return tag ? String(tag).toUpperCase() : 'ELEMENT';
            }
        }

        const typeColor = (step.type === 'click') ? '#28a745' : '#ffc107';
        const leftContent = document.createElement('div');
        leftContent.style.flex = '1';
        leftContent.innerHTML = `
            <div>
                    <strong style="font-size: 0.9em;">Adım ${index + 1}:</strong>
                    <span style="color: #000; margin-left: 6px; font-weight: bold; font-size: 0.85em;">İşlem: ${getStepTypeText(step.type)}</span>
                    <span style="color: ${typeColor}; font-weight: bold; border: 1px solid ${typeColor}; padding: 1px 3px; border-radius: 3px; margin-left: 6px; font-size: 0.85em;">
                        ${getElementTypeText(step.tag)}
                    </span>
                    ${step.selector ? `<div style="font-size: 0.8em; margin-top: 3px; color: #666;">Seçici: ${step.selector}</div>` : ''}
            </div>
        `;

        if (step.type === 'input') {
            const inputArea = document.createElement('div');
            inputArea.style.marginTop = '5px';
            const inputField = document.createElement('input');
            inputField.type = 'text';
            inputField.placeholder = 'Girilecek değer';
            inputField.value = step.value || '';
            inputField.style.width = '95%';
            inputField.style.padding = '5px';
            inputField.style.border = '1px solid #ccc';
            inputField.style.borderRadius = '3px';
            inputField.addEventListener('change', async (e) => {
                try {
                    const res = await browser.storage.local.get('otomasyonlar');
                    const otomasyonlar = res.otomasyonlar || [];
                    if (state.currentAutomationIndex >= 0 && state.currentAutomationIndex < otomasyonlar.length) {
                        otomasyonlar[state.currentAutomationIndex].steps[index].value = e.target.value;
                        await browser.storage.local.set({ otomasyonlar });
                        showToast('Değer kaydedildi!');
                    }
                } catch (err) {
                    console.error('Değer kaydetme hatası:', err);
                    showToast('Kaydetme hatası!');
                }
            });
            inputArea.appendChild(inputField);
            leftContent.appendChild(inputArea);
        } else if (step.type === 'delay') {
            const inputArea = document.createElement('div');
            inputArea.style.marginTop = '5px';
            const inputField = document.createElement('input');
            inputField.type = 'number';
            inputField.placeholder = 'Bekleme süresi (ms)';
            inputField.value = step.value || '1000';
            inputField.style.width = '95%';
            inputField.style.padding = '5px';
            inputField.style.border = '1px solid #ccc';
            inputField.style.borderRadius = '3px';
            inputField.addEventListener('change', async (e) => {
                try {
                    const res = await browser.storage.local.get('otomasyonlar');
                    const otomasyonlar = res.otomasyonlar || [];
                    if (state.currentAutomationIndex >= 0 && state.currentAutomationIndex < otomasyonlar.length) {
                        otomasyonlar[state.currentAutomationIndex].steps[index].value = e.target.value;
                        await browser.storage.local.set({ otomasyonlar });
                        showToast('Süre kaydedildi!');
                    }
                } catch (err) {
                    console.error('Süre kaydetme hatası:', err);
                    showToast('Kaydetme hatası!');
                }
            });
            inputArea.appendChild(inputField);
            leftContent.appendChild(inputArea);
        }

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '✕';
        deleteBtn.title = 'Bu adımı sil';
        deleteBtn.style.padding = '4px 8px';
        deleteBtn.style.marginLeft = '8px';
        deleteBtn.style.backgroundColor = '#dc3545';
        deleteBtn.style.color = 'white';
        deleteBtn.style.border = 'none';
        deleteBtn.style.borderRadius = '4px';
        deleteBtn.style.cursor = 'pointer';
        deleteBtn.style.fontSize = '14px';
        deleteBtn.addEventListener('click', async () => {
            const ok = await showConfirmDialog('Bu adımı silmek istediğine emin misin?');
            if (!ok) return;
            try {
                const res = await browser.storage.local.get('otomasyonlar');
                const otomasyonlar = res.otomasyonlar || [];
                if (state.currentAutomationIndex >= 0 && state.currentAutomationIndex < otomasyonlar.length) {
                    otomasyonlar[state.currentAutomationIndex].steps.splice(index, 1);
                    await browser.storage.local.set({ otomasyonlar });
                    displayAutomationSteps(otomasyonlar[state.currentAutomationIndex].steps);
                    showToast('Adım silindi!');
                }
            } catch (err) {
                console.error('Adım silme hatası:', err);
                showToast('Silme hatası: ' + (err.message || ''), 2000);
            }
        });

        item.appendChild(leftContent);
        item.appendChild(deleteBtn);
        container.appendChild(item);
    });
}

function loadAutomations() {
    browser.storage.local.get('otomasyonlar').then((result) => {
        if (elements.anaMenu) elements.anaMenu.style.display = 'block';
        if (!elements.otomasyonListesi) return;
        elements.otomasyonListesi.innerHTML = '';
        const otomasyonlar = result.otomasyonlar || [];
        state.selectedAutomationIndex = -1;
        state.selectedItem = null;

        otomasyonlar.forEach((auto, index) => {
            const item = document.createElement('div');
            item.className = 'otomasyon-item';
            item.textContent = auto.name;
            item.dataset.index = index;
            item.addEventListener('click', (e) => {
                if (state.selectedItem) state.selectedItem.style.border = '1px solid #ccc';
                state.selectedAutomationIndex = index;
                state.selectedItem = e.currentTarget;
                state.selectedItem.style.border = '2px solid #CC0000';
            });
            item.addEventListener('dblclick', () => openDetailMenu(index, auto.name));
            elements.otomasyonListesi.appendChild(item);
        });
    });
}

function openDetailMenu(index, name) {
    state.currentAutomationIndex = index;
    if (elements.currentAutomationName) elements.currentAutomationName.value = name;
    state.selectedAutomationIndex = -1;
    if (state.selectedItem) state.selectedItem.style.border = '1px solid #ccc';
    state.selectedItem = null;
    if (elements.anaMenu) elements.anaMenu.style.display = 'none';
    if (elements.detayMenu) elements.detayMenu.style.display = 'block';

    browser.runtime.sendMessage({ action: 'getAutomationSteps', index })
        .then(response => {
            if (response && response.status === 'success') displayAutomationSteps(response.steps);
            else if (elements.otomasyonAdimlari) elements.otomasyonAdimlari.innerHTML = `<div style="color: red; padding: 20px;">Hata: Adımlar yüklenemedi.</div>`;
        })
        .catch(() => {
            if (elements.otomasyonAdimlari) elements.otomasyonAdimlari.innerHTML = `<div style="color: red; padding: 20px;">Hata: background.js ile iletişim kurulamadı.</div>`;
        });
}

function closeDetailMenu() {
    state.currentAutomationIndex = -1;
    if (elements.detayMenu) elements.detayMenu.style.display = 'none';
    if (elements.anaMenu) elements.anaMenu.style.display = 'block';
    loadAutomations();
}

async function handleAdd() {
    state.selectedAutomationIndex = -1;
    if (state.selectedItem) { state.selectedItem.style.border = '1px solid #ccc'; }
    state.selectedItem = null;
    const newName = await showInputDialog('Yeni otomasyon adı', 'Otomasyon adı gir');
    if (!newName) return;
    try {
        const res = await browser.storage.local.get('otomasyonlar');
        const otomasyonlar = res.otomasyonlar || [];
        otomasyonlar.push({ name: newName, steps: [] });
        await browser.storage.local.set({ otomasyonlar });
        showToast('Otomasyon eklendi!');
        loadAutomations();
    } catch (err) {
        console.error('Ekleme hatası:', err);
        showToast('Ekleme hatası: ' + (err && err.message ? err.message : ''), 2000);
    }
}

async function handleDelete() {
    if (state.selectedAutomationIndex !== -1 && state.selectedItem) {
        const ok = await showConfirmDialog(`"${state.selectedItem.textContent}" otomasyonunu silmek istediğine emin misin?`);
        if (!ok) return;
        try {
            const res = await browser.storage.local.get('otomasyonlar');
            const otomasyonlar = res.otomasyonlar || [];
            if (state.selectedAutomationIndex >= 0 && state.selectedAutomationIndex < otomasyonlar.length) {
                otomasyonlar.splice(state.selectedAutomationIndex, 1);
                await browser.storage.local.set({ otomasyonlar });
                state.selectedAutomationIndex = -1;
                if (state.selectedItem) { state.selectedItem.style.border = '1px solid #ccc'; state.selectedItem = null; }
                showToast('Otomasyon silindi!');
                loadAutomations();
            } else showToast('Geçersiz otomasyon numarası.', 1800);
        } catch (err) {
            console.error('Silme hatası:', err);
            showToast('Silme hatası: ' + (err && err.message ? err.message : ''), 2000);
        }
    } else {
        showToast('Önce bir otomasyon seç; sonra sil butonuna bas.');
    }
}

let selectionInProgress = false;
async function handleStartSelectionMode() {
    if (selectionInProgress) { showToast('Seçim modu zaten aktif.'); return; }
    if (state.currentAutomationIndex === -1) { showToast('Önce bir otomasyonun detay menüsünü açıp, üzerinde çalıştığın otomasyonu seç.'); return; }
    selectionInProgress = true;
    try {
        const response = await browser.runtime.sendMessage({ action: 'startSelectionMode', automationIndex: state.currentAutomationIndex, mode: 'add' });
        if (response && response.status === 'selectionStarted') showToast('Seçim başladı — sayfaya geçip öğeye tıkla.');
        else { showToast('Seçim modu başlatılamadı. Konsolu kontrol et.'); selectionInProgress = false; }
    } catch (err) {
        console.error('startSelectionMode mesaj hatası:', err);
        showToast('Seçim başlatılamadı: ' + (err && err.message ? err.message : ''));
        selectionInProgress = false;
    }
}

async function handleAddDelay() {
    if (state.currentAutomationIndex === -1) { showToast('Önce bir otomasyon seç!'); return; }
    try {
        const res = await browser.storage.local.get('otomasyonlar');
        const otomasyonlar = res.otomasyonlar || [];
        if (state.currentAutomationIndex >= 0 && state.currentAutomationIndex < otomasyonlar.length) {
            otomasyonlar[state.currentAutomationIndex].steps.push({ type: 'delay', value: '1000' });
            await browser.storage.local.set({ otomasyonlar });
            displayAutomationSteps(otomasyonlar[state.currentAutomationIndex].steps);
            showToast('Bekleme süresi eklendi!');
        }
    } catch (err) { console.error('Zaman ekleme hatası:', err); showToast('Zaman ekleme hatası!'); }
}

async function handleStartAutomation() {
    if (state.currentAutomationIndex === -1) { showToast('Önce bir otomasyon seç!'); return; }
    try {
        const res = await browser.storage.local.get('otomasyonlar');
        const otomasyonlar = res.otomasyonlar || [];
        if (state.currentAutomationIndex >= 0 && state.currentAutomationIndex < otomasyonlar.length) {
            const steps = otomasyonlar[state.currentAutomationIndex].steps;
            if (!steps || steps.length === 0) { showToast('Henüz hiç adım eklenmemiş!'); return; }
            const isLoop = document.getElementById('donguCheckbox') ? document.getElementById('donguCheckbox').checked : false;
            const response = await browser.runtime.sendMessage({ action: 'startAutomation', automationIndex: state.currentAutomationIndex, loop: isLoop });
            if (response && response.status === 'started') showToast('Otomasyon başlatıldı!'); else showToast('Otomasyon başlatılamadı!');
        }
    } catch (err) { console.error('Otomasyon başlatma hatası:', err); showToast('Başlatma hatası!'); }
}

async function handleShowJSCode() {
    try {
        const res = await browser.storage.local.get('otomasyonlar');
        const otomasyonlar = res.otomasyonlar || [];
        if (state.currentAutomationIndex >= 0 && state.currentAutomationIndex < otomasyonlar.length) {
            const steps = otomasyonlar[state.currentAutomationIndex].steps;
            let code = '';
            code += `// Yardımcı fonksiyonlar\n`;
            code += `async function clickElement(selector) { const element = document.querySelector(selector); if (element) element.click(); }\n\n`;
            code += `async function setInputValue(selector, value) { const element = document.querySelector(selector); if (element) { element.value = value; element.dispatchEvent(new Event('input', { bubbles: true })); element.dispatchEvent(new Event('change', { bubbles: true })); } }\n\n`;
            code += `async function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }\n\n`;
            code += `async function runAutomation() {\n`;
            for (const step of steps) {
                if (step.type === 'navigate') {
                    code += `    window.location.href = '${step.value}';\n`;
                    code += `    await new Promise(resolve => { window.addEventListener('load', resolve, { once: true }); setTimeout(resolve, 5000); });\n`;
                } else if (step.type === 'click') {
                    code += `    await clickElement('${step.selector}');\n`;
                } else if (step.type === 'input') {
                    code += `    await setInputValue('${step.selector}', '${(step.value || '').replace(/'/g, "\\'")}');\n`;
                } else if (step.type === 'delay') {
                    code += `    await wait(${step.value || 1000});\n`;
                }
            }
            code += `}\n\n`;
            // Include the current loop checkbox state in the generated code so the user can see
            // whether the automation will run in a loop or just once.
            const isLoopChecked = document.getElementById('donguCheckbox') ? document.getElementById('donguCheckbox').checked : false;
            code += `const loop = ${isLoopChecked ? 'true' : 'false'};\n\n`;
            // If loop is true, run automation repeatedly with a short pause between iterations.
            code += `(async () => {\n`;
            code += `    try {\n`;
            code += `        if (loop) {\n`;
            code += `            while (true) {\n`;
            code += `                await runAutomation();\n`;
            code += `                await wait(1000); // pause between loop iterations (ms)\n`;
            code += `            }\n`;
            code += `        } else {\n`;
            code += `            await runAutomation();\n`;
            code += `        }\n`;
            code += `    } catch (err) { console.error('Otomasyon hatası:', err); }\n`;
            code += `})();\n`;

            const overlay = document.createElement('div');
            overlay.style.position = 'fixed'; overlay.style.top = 0; overlay.style.left = 0; overlay.style.right = 0; overlay.style.bottom = 0; overlay.style.backgroundColor = 'rgba(0,0,0,0.7)'; overlay.style.display = 'flex'; overlay.style.justifyContent = 'center'; overlay.style.alignItems = 'center'; overlay.style.zIndex = 10000;
            const dialog = document.createElement('div'); dialog.style.backgroundColor = 'white'; dialog.style.padding = '20px'; dialog.style.borderRadius = '8px'; dialog.style.maxWidth = '80%'; dialog.style.maxHeight = '80%'; dialog.style.overflow = 'auto'; dialog.style.position = 'relative';
            const pre = document.createElement('pre'); pre.style.whiteSpace = 'pre-wrap'; pre.style.margin = '0'; pre.style.padding = '10px'; pre.style.backgroundColor = '#f5f5f5'; pre.style.borderRadius = '4px'; pre.textContent = code;
            const copyBtn = document.createElement('button'); copyBtn.textContent = 'Kopyala'; copyBtn.style.position = 'absolute'; copyBtn.style.top = '10px'; copyBtn.style.right = '10px'; copyBtn.addEventListener('click', async () => { await navigator.clipboard.writeText(code); showToast('Kod kopyalandı!'); });
            const closeBtn = document.createElement('button'); closeBtn.textContent = 'Kapat'; closeBtn.style.position = 'absolute'; closeBtn.style.top = '10px'; closeBtn.style.right = '90px'; closeBtn.addEventListener('click', () => overlay.remove());
            dialog.appendChild(copyBtn); dialog.appendChild(closeBtn); dialog.appendChild(pre); overlay.appendChild(dialog); document.body.appendChild(overlay);
        }
    } catch (err) { console.error('JS kodu oluşturma hatası:', err); showToast('Kod oluşturma hatası!'); }
}

browser.runtime.onMessage.addListener((msg) => {
    if (!msg) return;
    if (msg.action === 'automationStepAdded') {
        if (typeof msg.index !== 'undefined' && msg.index === state.currentAutomationIndex) {
            browser.runtime.sendMessage({ action: 'getAutomationSteps', index: state.currentAutomationIndex }).then(response => { if (response && response.status === 'success') displayAutomationSteps(response.steps); });
        }
        selectionInProgress = false;
        showToast('Sayfadan öğe alındı.');
    }
    if (msg.action === 'automationStepRemoved') {
        if (typeof msg.index !== 'undefined' && msg.index === state.currentAutomationIndex) {
            browser.runtime.sendMessage({ action: 'getAutomationSteps', index: state.currentAutomationIndex }).then(response => { if (response && response.status === 'success') displayAutomationSteps(response.steps); });
        }
        selectionInProgress = false;
        showToast('Seçilen öğe silindi.');
    }
    if (msg.action === 'selectionModeFinished') {
        selectionInProgress = false; showToast('Seçim modu bitti.');
    }
});

async function initializeApp() {
    elements.init();
    if (elements.anaMenu) elements.anaMenu.style.display = 'block';
    if (elements.detayMenu) elements.detayMenu.style.display = 'none';
    await loadAutomations();
    if (elements.ekleBtn) elements.ekleBtn.addEventListener('click', handleAdd);
    if (elements.silBtn) elements.silBtn.addEventListener('click', handleDelete);
    if (elements.geriDonBtn) elements.geriDonBtn.addEventListener('click', closeDetailMenu);
    if (elements.ogeEkleBtn) elements.ogeEkleBtn.addEventListener('click', handleStartSelectionMode);
    if (elements.zamanEkleBtn) elements.zamanEkleBtn.addEventListener('click', handleAddDelay);

    if (elements.baslatBtn) elements.baslatBtn.addEventListener('click', handleStartAutomation);
    if (elements.jsKoduBtn) elements.jsKoduBtn.addEventListener('click', handleShowJSCode);
}

document.addEventListener('DOMContentLoaded', initializeApp);