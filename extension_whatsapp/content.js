// ── content.js ──
// Este script corre DENTRO de WhatsApp Web.
// NO hace fetch a Firebase (está bloqueado por CSP de WhatsApp).
// Solo ESCUCHA los mensajes que le manda background.js

console.log("🌸 Content script inyectado en WhatsApp Web. Esperando órdenes del background...");

// ═══ ESCUCHAR MENSAJES DEL BACKGROUND ═══
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action === "enviar_mensaje") {
        console.log("📩 Orden recibida del background:", request.texto);
        enviarMensajeWhatsApp(request.texto);
        sendResponse({ status: "recibido" });
    }
    return true; // Mantener canal abierto
});

function enviarMensajeWhatsApp(texto) {
    // 1. Buscar el panel principal (el chat abierto)
    const mainBox = document.querySelector('#main');
    if (!mainBox) {
        console.error("❌ No tienes ningún chat abierto en WhatsApp Web.");
        return;
    }

    // 2. Buscar la caja de texto donde se escribe
    const chatBox = mainBox.querySelector('div[contenteditable="true"][data-tab="10"]')
        || mainBox.querySelector('div[contenteditable="true"][data-lexical-editor="true"]')
        || mainBox.querySelector('div[contenteditable="true"]');

    if (!chatBox) {
        console.error("❌ No se detectó la caja de texto del chat.");
        return;
    }

    // 3. Enfocar la caja
    chatBox.focus();

    // 4. Limpiar cualquier texto previo
    document.execCommand('selectAll', false, null);
    document.execCommand('delete', false, null);

    // 5. Insertar el texto (execCommand es el método que WhatsApp Web acepta)
    document.execCommand('insertText', false, texto);

    // 6. Disparar evento input para que WhatsApp reaccione
    chatBox.dispatchEvent(new Event('input', { bubbles: true }));

    // 7. Bucle agresivo: buscar el botón de enviar y presionarlo
    let intentos = 0;
    const intervalEnviador = setInterval(() => {
        // Buscar el ícono del avioncito de enviar
        const sendIcon = document.querySelector('span[data-icon="send"]');

        if (sendIcon) {
            const btn = sendIcon.closest('button');
            if (btn) {
                btn.click();
                console.log("✅ MENSAJE ENVIADO: " + texto);
            }
            clearInterval(intervalEnviador);
        } else {
            // Plan B: simular tecla Enter
            chatBox.dispatchEvent(new KeyboardEvent('keydown', {
                bubbles: true, cancelable: true,
                key: 'Enter', code: 'Enter', keyCode: 13, which: 13
            }));
        }

        intentos++;
        if (intentos >= 15) {
            clearInterval(intervalEnviador);
            console.log("⚠️ Se agotaron los intentos de envío.");
        }
    }, 100);
}
