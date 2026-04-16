// ── background.js ──
// Este script corre en el contexto de Chrome (NO en WhatsApp Web)
// Por eso sí puede hacer fetch a Firebase sin restricciones de CSP.

const FIREBASE_DB_URL = "https://novia-540ac-default-rtdb.firebaseio.com/mensajes_amor.json";

let procesados = new Set();

console.log("🌸 Background worker iniciado. Vigilando Firebase...");

async function revisarMensajes() {
    try {
        const respuesta = await fetch(FIREBASE_DB_URL);
        if (!respuesta.ok) return;
        const data = await respuesta.json();

        if (!data) return;

        for (const [id, mensajeObj] of Object.entries(data)) {
            if (!procesados.has(id)) {
                procesados.add(id);

                if (mensajeObj.leido === false) {
                    console.log("💌 Mensaje nuevo en Firebase:", mensajeObj.texto);
                    await marcarComoEnviado(id);
                    enviarAlContentScript(mensajeObj.texto);
                }
            }
        }
    } catch (err) {
        console.error("Error revisando Firebase:", err);
    }
}

// Revisa Firebase cada 2 segundos
setInterval(revisarMensajes, 2000);

async function marcarComoEnviado(id) {
    const url = FIREBASE_DB_URL.replace('.json', `/${id}.json`);
    await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leido: true })
    });
}

function enviarAlContentScript(texto) {
    // Busca la pestaña de WhatsApp Web y le manda el mensaje al content.js
    chrome.tabs.query({ url: "*://web.whatsapp.com/*" }, function (tabs) {
        if (tabs.length === 0) {
            console.error("❌ No hay ninguna pestaña de WhatsApp Web abierta.");
            return;
        }
        tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, { action: "enviar_mensaje", texto: texto }, function (response) {
                if (chrome.runtime.lastError) {
                    console.error("Error enviando mensaje a content.js:", chrome.runtime.lastError.message);
                } else {
                    console.log("✅ Mensaje enviado a content.js:", response);
                }
            });
        });
    });
}
