import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dns from "dns";

// Support standard DNS lookup
dns.setDefaultResultOrder("ipv4first");

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for parsing JSON requests
  app.use(express.json());

  // Safe Lazy Initializer for Gemini Client
  let aiClient: GoogleGenAI | null = null;
  function getGeminiClient() {
    if (!aiClient) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY environment variable is not configured. Please add it to your secrets.");
      }
      aiClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
    return aiClient;
  }

  // ----------------------------------------------------
  //  API ENDPOINTS
  // ----------------------------------------------------

  // 1. Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // 2. Gemini Natural Language Commander (translates voice transcripts to relay actions)
  app.post("/api/gemini/command", async (req, res) => {
    const { transcript, currentRelays, currentVariMode } = req.body;

    if (!transcript) {
      return res.status(400).json({ error: "Transcript is required" });
    }

    try {
      const ai = getGeminiClient();
      const relayListStr = (currentRelays || [false, false, false, false])
        .map((state: boolean, idx: number) => `Relay ${idx + 1}: ${state ? "ON" : "OFF"}`)
        .join(", ");

      const systemInstruction = `
        You are an intelligent voice control system for a 4-channel Relay and DHT11 sensory control unit connected to an ESP32.
        Your job is to translate human commands (primarily in Indonesian or English) into structured actions for the relays.

        The system has:
        - 4 Relays: Relay 1, Relay 2, Relay 3, Relay 4.
        - 3 Variation Modes represented by 'variMode':
          * 0 = No active variation (static state)
          * 1 = Forward running light (1 -> 2 -> 3 -> 4)
          * 2 = Reverse running light (4 -> 3 -> 2 -> 1)
          Keep variMode = 0 unless a running/transition lighting pattern is explicitly requested.
        
        The current states are:
        - Relay states (before command): [${relayListStr}]
        - Current Variation Mode: ${currentVariMode || 0}
        
        Interpret the voice transcript: "${transcript}".
        
        Provide the targeted outcome:
        1. relayStates: An array of 4 booleans [relay1, relay2, relay3, relay4] representing whether they should be ON (true) or OFF (false).
        2. variMode: Keep, turn off, or activate mode 1 or 2 based on the input. (e.g. "/vari1", "variasi satu", "running forward", "jalan terus" -> 1. "stop", "berhenti", "mati variasi" -> 0)
        3. explanation: A polite, brief confirmation message in the language spoken by the user (Indonesian/English) confirming the exact action taken (e.g., "Menyalakan Relay 1 dan mematikan yang lain.", "Semua relay telah dinonaktifkan.").
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Translate this human command: "${transcript}"`,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              relayStates: {
                type: Type.ARRAY,
                items: { type: Type.BOOLEAN },
                description: "The targeted state of the 4 relays as true (ON) or false (OFF)."
              },
              variMode: {
                type: Type.INTEGER,
                description: "The target variation light mode: 0 (disabled), 1 (forward), 2 (backward)."
              },
              explanation: {
                type: Type.STRING,
                description: "A short human-friendly confirmation message explaining what was done."
              }
            },
            required: ["relayStates", "variMode", "explanation"]
          }
        }
      });

      const responseText = response.text || "{}";
      const cleanedText = responseText.trim();
      const result = JSON.parse(cleanedText);

      res.json({ success: true, ...result });
    } catch (error: any) {
      console.error("Gemini commander error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to process voice command via Gemini Engine"
      });
    }
  });

  // 3. Telegram API Gateway Proxy
  // Bypasses browser CORS policy and protects secrets of Telegram integration by proxying calls
  app.post("/api/telegram/send", async (req, res) => {
    const { token, chatId, text, isMarkdown } = req.body;

    if (!token || !chatId || !text) {
      return res.status(400).json({ error: "token, chatId, and text are required" });
    }

    try {
      const url = `https://api.telegram.org/bot${token}/sendMessage`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: isMarkdown ? "Markdown" : undefined,
        }),
      });

      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.post("/api/telegram/updates", async (req, res) => {
    const { token, offset } = req.body;

    if (!token) {
      return res.status(400).json({ error: "token is required" });
    }

    try {
      const url = `https://api.telegram.org/bot${token}/getUpdates?timeout=2${offset ? `&offset=${offset}` : ""}`;
      const response = await fetch(url, { method: "GET" });
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });


  // ----------------------------------------------------
  //  VITE / RUNTIME SERVER BUILD SETUP
  // ----------------------------------------------------

  if (process.env.NODE_ENV !== "production") {
    // Development mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production mode
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Listen on PORT 3000
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Running and accessible at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("[Server] Critical startup error:", err);
});
