// background.js (Son ve En Kapsamlı Hali - Tüm Fonksiyonlar Dahil)

// Otomasyonun o anki index'ini tutacak global değişken (Seçim sonrası adımı doğru yere kaydetmek için)
let currentAutomationIndexToEdit = -1; 
let lastInjectedTabId = -1;

// ===============================================
// VERİ YÖNETİMİ FONKSİYONLARI (STORAGE)
// ===============================================

// Yeni Otomasyon Ekleme (popup.js'teki yeni mantıkla uyumlu olması için burada tutulmaya devam edebilir)
async function addAutomationToStorage(name) {
    let storedData = await browser.storage.local.get("otomasyonlar");
    let otomasyonlar = storedData.otomasyonlar || []; 
    const newAutomation = { name: name, steps: [] };
    otomasyonlar.push(newAutomation);
    await browser.storage.local.set({ otomasyonlar });
    return { status: "success" };
}

// Otomasyon Silme (popup.js'teki yeni mantıkla uyumlu olması için burada tutulmaya devam edebilir)
async function deleteAutomationFromStorage(index) {
    let storedData = await browser.storage.local.get("otomasyonlar");
    let otomasyonlar = storedData.otomasyonlar || [];

    if (index >= 0 && index < otomasyonlar.length) {
        otomasyonlar.splice(index, 1); 
        await browser.storage.local.set({ otomasyonlar }); 
        return { status: "success" };
    } else {
        return { status: "error", message: "Geçersiz otomasyon numarası." };
    }
}

// Otomasyona adım ekler (content.js'ten gelen veriyi kaydeder)
async function addStepToAutomation(index, step) {
    try {
        let storedData = await browser.storage.local.get("otomasyonlar");
        let otomasyonlar = storedData.otomasyonlar || []; 

        if (index >= 0 && index < otomasyonlar.length) {
            otomasyonlar[index].steps.push(step);
            await browser.storage.local.set({ otomasyonlar });
            return { status: "success" };
        } else {
            return { status: "error", message: "Geçersiz otomasyon indeksi." };
        }
    } catch (error) {
        console.error("[Background] Adım eklenirken hata:", error);
        return { status: "error", message: "Adım kaydetme başarısız." };
    }
}

// Adımları depolamadan çeker (popup.js'ten gelen isteğe yanıt verir)
async function getSteps(index) {
    try {
        let storedData = await browser.storage.local.get("otomasyonlar");
        let otomasyonlar = storedData.otomasyonlar || []; 

        if (index >= 0 && index < otomasyonlar.length) {
            return { status: "success", steps: otomasyonlar[index].steps };
        } else {
            return { status: "error", message: "Geçersiz otomasyon indeksi." };
        }
    } catch (error) {
        console.error("[Background] Adım çekilirken hata:", error);
        return { status: "error", message: "Veri çekme başarısız." };
    }
}

// ===============================================
// ÖĞE SEÇİMİ VE ENJEKSİYON FONKSİYONU (ERROR FIXED)
// ===============================================

/**
 * Seçim modunu başlatmak için content.js'i aktif sekmeye enjekte eder.
 */
async function startElementSelection(automationIndex, mode = 'add') {
    currentAutomationIndexToEdit = automationIndex; // Hangi otomasyonu düzenlediğimizi kaydet
    
    // Aktif sekmenin ID'sini al
    let [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    
    if (tab && tab.id) {
        try {
            // If we previously injected into another tab, ask it to cancel first (cleanup)
            try {
                if (lastInjectedTabId && lastInjectedTabId !== -1 && lastInjectedTabId !== tab.id) {
                    browser.tabs.sendMessage(lastInjectedTabId, { action: 'cancelSelection' })
                        .catch(() => {});
                }
            } catch (e) {}

            // First try to message the tab (in case content.js is already injected and listening)
            try {
                await browser.tabs.sendMessage(tab.id, { action: 'startSelection', mode });
                lastInjectedTabId = tab.id;
                console.log('[Background] startSelection message sent to existing content script.');
                return { status: 'selectionStarted' };
            } catch (msgErr) {
                // No listener present; inject the script then send the start message
                try {
                    await browser.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
                    lastInjectedTabId = tab.id;
                    // give the script a tick to initialize, then ask it to start
                    try { await browser.tabs.sendMessage(tab.id, { action: 'startSelection', mode }); } catch (e) {}
                    console.log('[Background] content.js injected and startSelection requested.');
                    return { status: 'selectionStarted' };
                } catch (injErr) {
                    console.error('Script injection error:', injErr);
                    return { status: 'error', message: 'Script enjeksiyon hatası.' };
                }
            }
        } catch (error) {
            console.error("Script enjekte edilirken hata (İzin kontrolü yapın!):", error);
            // Kanka, bu hata genellikle manifest.json'daki 'scripting' izni eksikliğinden gelir!
            return { status: "error", message: "Script enjeksiyon hatası." };
        }
    }
    return { status: "error", message: "Aktif sekme bulunamadı." };
}

// Cancel selection request coming from controller window
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'cancelSelection') {
        if (lastInjectedTabId && lastInjectedTabId !== -1) {
            // send cancel to content script in that tab
            browser.tabs.sendMessage(lastInjectedTabId, { action: 'cancelSelection' })
                .catch(err => console.error('cancelSelection sendMessage error', err));
        }
        // broadcast selection finished to UIs
        try { browser.runtime.sendMessage({ action: 'selectionModeFinished' }); } catch (e) {}
        lastInjectedTabId = -1;
        sendResponse({ status: 'ok' });
        return true;
    }
});

// ===============================================
// MESAJ DİNLEYİCİ
// ===============================================

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    
    // 1. Yeni Otomasyon Ekleme İsteği (Gerekirse bu fonksiyonu çağırır)
    if (request.action === "addAutomation") {
        addAutomationToStorage(request.name).then(sendResponse);
        return true; 
    }

    // 2. Otomasyon Silme İsteği (Gerekirse bu fonksiyonu çağırır)
    if (request.action === "deleteAutomation") {
        deleteAutomationFromStorage(request.indexToDelete).then(sendResponse);
        return true; 
    }
    
    // 3. Otomasyon Adımlarının Çekilmesi İsteği (popup.js'ten gelir)
    if (request.action === "getAutomationSteps") {
        getSteps(request.index).then(sendResponse);
        return true; 
    }

    // 4. Öğe Seçme Modunu Başlatma İsteği (popup.js'ten gelir)
    if (request.action === "startSelectionMode") {
        // forward mode if provided (add/remove)
        startElementSelection(request.automationIndex, request.mode).then(sendResponse);
        return true; 
    }
    
    // 5. Otomasyon Adımı Ekleme İsteği (content.js'ten gelir)
    // 5. Otomasyon Adımı Ekleme İsteği (content.js'ten gelir)
    if (request.action === "addAutomationStep") {
        const step = {
            selector: request.selector,
            type: request.type, // 'click' veya 'input'
            tag: request.tag,   // YENİ: Etiket adını kaydet
            value: (request.type === 'input' ? '' : undefined) 
        };
        // Capture index for message broadcast before we reset it
        const targetIndex = currentAutomationIndexToEdit;
        addStepToAutomation(currentAutomationIndexToEdit, step).then((resp) => {
            // Notify popup/UI that a step was added (so it can refresh)
            try {
                if (resp && resp.status === 'success') {
                    browser.runtime.sendMessage({ action: 'automationStepAdded', index: targetIndex, step });
                    // clear tracked injected tab since selection finished
                    lastInjectedTabId = -1;
                }
            } catch (e) {
                console.error('broadcast error:', e);
            }
            sendResponse(resp);
        });

        // İşlem bittiği için index'i sıfırla
        currentAutomationIndexToEdit = -1;
        return true; 
    }

    // 5.b Otomasyon Adımı Silme İsteği (content.js'ten gelir)
    if (request.action === "removeAutomationStep") {
        const selector = request.selector;
        const targetIndex = currentAutomationIndexToEdit;
        (async () => {
            try {
                let storedData = await browser.storage.local.get("otomasyonlar");
                let otomasyonlar = storedData.otomasyonlar || [];

                if (targetIndex >= 0 && targetIndex < otomasyonlar.length) {
                    const steps = otomasyonlar[targetIndex].steps || [];
                    const removeIdx = steps.findIndex(s => s.selector === selector);
                    if (removeIdx !== -1) {
                        const removed = steps.splice(removeIdx, 1)[0];
                        otomasyonlar[targetIndex].steps = steps;
                        await browser.storage.local.set({ otomasyonlar });
                        // Broadcast removal
                        try { browser.runtime.sendMessage({ action: 'automationStepRemoved', index: targetIndex, selector, removed }); } catch (e) {}
                        lastInjectedTabId = -1;
                        sendResponse({ status: 'success' });
                    } else {
                        sendResponse({ status: 'error', message: 'Adım bulunamadı.' });
                    }
                } else {
                    sendResponse({ status: 'error', message: 'Geçersiz otomasyon indeksi.' });
                }
            } catch (err) {
                console.error('Adım silme hatası:', err);
                sendResponse({ status: 'error', message: String(err) });
            }
        })();
        currentAutomationIndexToEdit = -1;
        return true;
    }
    
    // 6. Seçim Modu Bitti (content.js'ten gelir)
    if (request.action === "selectionModeFinished") {
        currentAutomationIndexToEdit = -1; // Güvenlik için sıfırlama
        // Notify UIs that selection mode finished so popup can re-enable UI
        try {
            browser.runtime.sendMessage({ action: 'selectionModeFinished' });
        } catch (e) { /* ignore */ }
        lastInjectedTabId = -1;
        return false;
    }

    // 7. Otomasyonu Başlat
    if (request.action === "startAutomation") {
        (async () => {
            try {
                // Otomasyonu al
                let storedData = await browser.storage.local.get("otomasyonlar");
                let otomasyonlar = storedData.otomasyonlar || [];
                
                if (request.automationIndex >= 0 && request.automationIndex < otomasyonlar.length) {
                    const steps = otomasyonlar[request.automationIndex].steps;
                    
                    // Aktif sekmeyi bul
                    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
                    
                    if (!tab) {
                        sendResponse({ status: 'error', message: 'Aktif sekme bulunamadı!' });
                        return;
                    }

                    // Content script'i enjekte et veya mevcut olanla iletişim kur
                    try {
                        // Önce mevcut content script ile iletişim kurmayı dene
                        await browser.tabs.sendMessage(tab.id, { action: 'ping' });
                    } catch (e) {
                        // Content script yoksa, enjekte et
                        await browser.scripting.executeScript({
                            target: { tabId: tab.id },
                            files: ['content.js']
                        });
                    }

                    // Adımları çalıştır
                    sendResponse({ status: 'started' });

                    // Her adımı sırayla çalıştır
                    console.log('Starting automation with steps:', steps); // Debug log
                    
                    const executeSteps = async () => {
                        for (const step of steps) {
                            console.log('Executing step:', step); // Debug log
                            
                            if (step.type === 'delay') {
                                // Bekleme adımı
                                console.log('Waiting for', step.value, 'ms'); // Debug log
                                await new Promise(resolve => setTimeout(resolve, parseInt(step.value) || 1000));
                            } else if (step.type === 'navigate') {
                                // Sayfa yönlendirme adımı
                                console.log('Navigating to:', step.value);
                                
                                // Create a promise that resolves when navigation is complete
                                const navigationComplete = new Promise((resolve) => {
                                    const tabUpdateListener = async (tabId, changeInfo, updatedTab) => {
                                        if (tabId === tab.id && changeInfo.status === 'complete') {
                                            browser.tabs.onUpdated.removeListener(tabUpdateListener);
                                            
                                            // Give the page a moment to fully load
                                            await new Promise(r => setTimeout(r, 1000));
                                            
                                            // Inject content script into the new page
                                            try {
                                                await browser.scripting.executeScript({
                                                    target: { tabId: tab.id },
                                                    files: ['content.js']
                                                });
                                            } catch (e) {
                                                console.warn('Content script injection error (might already be present):', e);
                                            }
                                            
                                            resolve();
                                        }
                                    };
                                    browser.tabs.onUpdated.addListener(tabUpdateListener);
                                });

                                // Update the tab URL
                                await browser.tabs.update(tab.id, { url: step.value });
                                
                                // Wait for navigation to complete and content script to be injected
                                await navigationComplete;
                            } else {
                                // Tıklama veya input adımı
                                console.log('Sending step to content script:', step); // Debug log
                                const response = await browser.tabs.sendMessage(tab.id, {
                                    action: 'executeStep',
                                    step: step
                                });

                                if (response.status === 'error') {
                                    console.error('Adım çalıştırma hatası:', response.message);
                                    return false;
                                } else {
                                    console.log('Step executed successfully'); // Debug log
                                }

                                // Adımlar arası kısa bekleme
                                await new Promise(resolve => setTimeout(resolve, 500));
                            }
                        }
                        return true;
                    };

                    // Döngü kontrolü
                    if (request.loop) {
                        while (true) {
                            const success = await executeSteps();
                            if (!success) break;
                        }
                    } else {
                        await executeSteps();
                    }

                } else {
                    sendResponse({ status: 'error', message: 'Geçersiz otomasyon indeksi!' });
                }
            } catch (err) {
                console.error('Otomasyon çalıştırma hatası:', err);
                sendResponse({ status: 'error', message: String(err) });
            }
        })();
        return true;
    }
});