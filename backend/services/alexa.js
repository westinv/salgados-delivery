const axios = require("axios");
const { tokens } = require("../database");

const VOICE_MONKEY_URL = "https://api-v2.voicemonkey.io/announcement";

const queue = [];
let isProcessing = false;

async function processQueue() {
  if (isProcessing || queue.length === 0) return;
  isProcessing = true;

  while (queue.length > 0) {
    const task = queue.shift();
    try {
      await task.execute();
    } catch (err) {
      console.error("Erro no processamento do anúncio da Alexa:", err.message);
    }
    
    // Espera 15 segundos antes de mandar o próximo para evitar sobreposição ou rate limit da Alexa
    if (queue.length > 0) {
      await new Promise(resolve => setTimeout(resolve, 15000));
    }
  }

  isProcessing = false;
}

/**
 * Adiciona um anúncio à fila e inicia o processamento se necessário.
 * @param {string} texto O texto a ser falado pela Alexa
 * @param {number} repetir Quantas vezes repetir o texto no mesmo anúncio
 */
async function enviarAnuncio(texto, repetir = 3) {
  return new Promise((resolve) => {
    queue.push({
      execute: async () => {
        try {
          const tokenData = await tokens.obter();
          if (!tokenData || !tokenData.access_token) {
            console.warn("Voice Monkey não configurado, anúncio ignorado.");
            resolve({ sent: 0, total: 0 });
            return;
          }

          const colonIndex = tokenData.access_token.indexOf(":");
          const token = tokenData.access_token.substring(0, colonIndex);
          const devicesPart = tokenData.access_token.substring(colonIndex + 1);

          if (!token || !devicesPart) {
            console.error("Configuração inválida. Use o formato: TOKEN:DEVICE_ID");
            resolve({ sent: 0, total: 0 });
            return;
          }

          const devices = devicesPart
            .split(",")
            .map((d) => d.trim())
            .filter(Boolean);

          const textoRepetido = Array(repetir).fill(texto).join(". . . ");

          console.log(`Enviando anúncio para ${devices.length} Alexa(s):`, texto, `(${repetir}x)`);

          const resultados = await Promise.allSettled(
            devices.map((device) =>
              axios.post(VOICE_MONKEY_URL, { token, device, text: textoRepetido }),
            ),
          );

          const erros = resultados.filter((r) => r.status === "rejected");
          if (erros.length === devices.length) {
            const err = erros[0].reason;
            console.error("Erro ao enviar anúncio via Voice Monkey:", err.response?.data || err.message);
            resolve({ sent: 0, total: devices.length });
          } else {
            console.log(`Anúncio enviado com sucesso para ${resultados.length - erros.length}/${devices.length} dispositivo(s)`);
            resolve({ sent: devices.length - erros.length, total: devices.length });
          }
        } catch (error) {
          console.error("Erro inesperado na execução do anúncio:", error);
          resolve({ sent: 0, total: 0, error: error.message });
        }
      }
    });

    processQueue();
  });
}

module.exports = { enviarAnuncio };
