// content.js - Öğe Seçimi, Vurgulama, Tag Kaydetme ve Dinleyici Temizleme

let highlighter = null; // Vurgulama çerçevesini tutacak değişken

// ===============================================
// YARDIMCI FONKSİYONLAR
// ===============================================

/**
 * Tıklanan öğenin benzersiz CSS seçicisini bulur.
 */
function getCssSelector(element) {
    if (!element || element.nodeType !== 1) return null;
    if (element.id) return `#${element.id}`;

    let path = [];
    while (element.parentNode) {
        let sibling = element.parentNode.firstChild;
        let nth = 0;
        let tagName = element.tagName.toLowerCase();
        
        while (sibling) {
            if (sibling.nodeType === 1 && sibling.tagName.toLowerCase() === tagName) {
                nth++;
            }
            if (sibling === element) break;
            sibling = sibling.nextSibling;
        }

        let nthChild = nth > 1 ? `:nth-child(${nth})` : '';
        path.unshift(tagName + nthChild);
        
        if (element.parentNode.tagName.toLowerCase() === 'body') break;
        element = element.parentNode;
    }
    return path.join(' > ');
}


/**
 * Vurgulama çerçevesini oluşturur ve DOM'a ekler.
 */
function createHighlighter() {
    // Remove any previous highlighter element (robust across multiple injections)
    try {
        const prev = document.getElementById('kanzi-highlighter');
        if (prev && prev.parentNode) prev.parentNode.removeChild(prev);
    } catch (e) {}

    highlighter = document.createElement('div');
    highlighter.id = 'kanzi-highlighter';
    highlighter.style.position = 'absolute';
    highlighter.style.zIndex = '999999999'; 
    highlighter.style.border = '2px solid red'; 
    highlighter.style.pointerEvents = 'none'; // Tıklamaları engelleme
    highlighter.style.backgroundColor = 'rgba(255, 0, 0, 0.15)'; 
    highlighter.style.boxSizing = 'border-box'; 

    document.body.appendChild(highlighter);
}

/**
 * Fare hareket ettiğinde vurgulama çerçevesini günceller.
 * Not: Bu fonksiyonun dinleyiciden (listener) kaldırılması kritik.
 */
function updateHighlighter(e) {
    const targetElement = e.target;

    if (targetElement && highlighter) {
        const rect = targetElement.getBoundingClientRect();
        
        highlighter.style.left = `${rect.left + window.scrollX}px`;
        highlighter.style.top = `${rect.top + window.scrollY}px`;
        highlighter.style.width = `${rect.width}px`;
        highlighter.style.height = `${rect.height}px`;
        highlighter.style.display = 'block'; 
    }
}

/**
 * Vurgulama çerçevesini kaldırır ve dinleyicileri temizler.
 * Not: Bu fonksiyon, dinleyicilerin kaldırıldığına emin olmalı.
 */
function cleanupHighlighter() {
    // Mouse hareket dinleyicisini kaldır (ÇOK KRİTİK ADIM)
    document.removeEventListener('mousemove', updateHighlighter);
    try {
        const prev = document.getElementById('kanzi-highlighter');
        if (prev && prev.parentNode) prev.parentNode.removeChild(prev);
    } catch (e) {}
    highlighter = null;
    try { window.__kanziSelectionActive = false; } catch (e) {}
}


// ===============================================
// ÖĞE SEÇİMİ MANTIĞI
// ===============================================

// Tıklamayı dinleyecek ana fonksiyon
function handleElementSelection(e) {
    e.preventDefault(); 
    e.stopPropagation(); 

    // 1. TEMİZLEME İŞLEMİ: Tıklama dinleyicisini kaldır (ÇOK KRİTİK ADIM)
    document.removeEventListener('click', handleElementSelection, true);
    
    // 2. Vurgulamayı temizle (Mousemove dinleyicisini ve DOM öğesini kaldırır)
    cleanupHighlighter(); 

    // 3. Verileri topla ve kaydet
    const elementType = (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') ? 'input' : 'click';
    const selector = getCssSelector(e.target);
    const elementTag = e.target.tagName;
    
    if (selector) {
        if (selectionModeType === 'remove') {
            browser.runtime.sendMessage({
                action: 'removeAutomationStep',
                selector: selector,
                type: elementType,
                tag: elementTag
            });
        } else {
            browser.runtime.sendMessage({ 
                action: "addAutomationStep", 
                selector: selector, 
                type: elementType,
                tag: elementTag
            });
        }
        // Do not use blocking alert here; just log. Popup will show updates when opened.
        console.log('Otomasyon öğesi kaydedildi:', elementTag, selector);
    } else {
        console.warn('Seçici oluşturulamadı');
    }
    
    // 4. Seçim modu bitti mesajını background'a gönder
    browser.runtime.sendMessage({ action: "selectionModeFinished" });
}


/**
 * Seçim modunu başlatır.
 */
function startSelectionMode() {
    // Prevent double-start if already active
    try {
        if (window.__kanziSelectionActive) {
            console.log('Kanzi: selection already active, skipping start.');
            return;
        }
        window.__kanziSelectionActive = true;
    } catch (e) {}
    // 1. Vurgulama çerçevesini oluştur
    createHighlighter();
    
    // 2. Fare hareketlerini dinle ve çerçeveyi güncelle
    document.addEventListener('mousemove', updateHighlighter);

    // 3. Tıklama olayını yakala (seçim için)
    // "true" sayesinde, sayfanın kendi olaylarından önce yakalarız (capture phase).
    document.addEventListener('click', handleElementSelection, true);
    
    console.log("Otomasyon Öğesi Seçim Modu Başlatıldı.");
}

// Do NOT auto-start on load. Start when background asks via message.
// selectionModeType: 'add' or 'remove'
let selectionModeType = 'add';
browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg || !msg.action) return;

    if (msg.action === 'startSelection') {
        try {
            selectionModeType = msg.mode || 'add';
            startSelectionMode();
            sendResponse({ status: 'started' });
        } catch (e) {
            console.error('startSelection error', e);
            sendResponse({ status: 'error', message: String(e) });
        }
        return true; // indicate async response
    }

    if (msg.action === 'cancelSelection') {
        try {
            document.removeEventListener('click', handleElementSelection, true);
            cleanupHighlighter();
            browser.runtime.sendMessage({ action: 'selectionModeFinished' });
            try { window.__kanziSelectionActive = false; } catch (e) {}
            sendResponse({ status: 'cancelled' });
        } catch (e) {
            console.error('cancelSelection error', e);
            sendResponse({ status: 'error', message: String(e) });
        }
        return true;
    }

    if (msg.action === 'ping') {
        sendResponse({ status: 'ok' });
        return true;
    }

    if (msg.action === 'executeStep') {
        (async () => {
            try {
                const step = msg.step;
                console.log('Executing step:', step); // Debug log

                const element = document.querySelector(step.selector);
                console.log('Found element:', element); // Debug log
                
                if (!element) {
                    console.warn('Element not found:', step.selector); // Debug log
                    sendResponse({ status: 'error', message: 'Öğe bulunamadı: ' + step.selector });
                    return;
                }

                if (step.type === 'click') {
                    console.log('Clicking element'); // Debug log
                    element.click();
                } else if (step.type === 'input') {
                    console.log('Setting input value:', step.value); // Debug log
                    element.value = step.value || '';
                    // Input event'ini tetikle
                    element.dispatchEvent(new Event('input', { bubbles: true }));
                    element.dispatchEvent(new Event('change', { bubbles: true }));
                }

                sendResponse({ status: 'success' });
            } catch (err) {
                console.error('Step execution error:', err);
                sendResponse({ status: 'error', message: String(err) });
            }
        })();
        return true;
    }
});