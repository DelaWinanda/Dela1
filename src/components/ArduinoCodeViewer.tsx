import { useState } from "react";
import { Check, Copy, Code, Cpu, Terminal, AlertCircle } from "lucide-react";

export default function ArduinoCodeViewer() {
  const [copied, setCopied] = useState(false);

  // Upgraded C++ Sketch incorporating a WebServer with CORS and Telegram Bot
  const arduinoCode = `/*
 * Kontrol 4 Relay + Sensor DHT11 via Web Server & Telegram Bot
 * Mendukung ESP32 dan ESP8266
 * 
 * UPGRADED VERSION:
 * - Menambahkan Web Server Lokal di Port 80 untuk Direct IP Control (Tanpa Delay)
 * - Mendukung CORS sehingga dapat dikontrol langsung dari Web Dashboard Client
 * - Mempertahankan integrasi Telegram Bot asli
 */

#ifdef ESP32
  #include <WiFi.h>
  #include <WebServer.h>
#else
  #include <ESP8266WiFi.h>
  #include <ESP8266WebServer.h>
#endif

#include <WiFiClientSecure.h>
#include <UniversalTelegramBot.h>
#include <ArduinoJson.h>
#include <DHT.h>

// ===================== KONFIGURASI — UBAH DI SINI =====================
const char* ssid     = "Kocakk";
const char* password = "11223344";

#define BOTtoken  "8611614379:AAESo7Y4Fh1_V27YYqh-yCfLT19sB8ztkkI"
#define CHAT_ID   "1300283513"
// ======================================================================

// ---------- Pin Relay (active-LOW: LOW = ON, HIGH = OFF) ----------
#ifdef ESP32
  const int relayPin[4] = {23, 19, 18, 5};
#else
  // Mapping pin yang aman untuk ESP8266 (D5, D6, D7, D1)
  const int relayPin[4] = {14, 12, 13, 5}; 
#endif

const String relayName[4] = {"Relay 1", "Relay 2", "Relay 3", "Relay 4"};
bool relayState[4] = {false, false, false, false};

// ---------- Mode Variasi ----------
int variMode = 0;           // 0 = tidak aktif, 1 = maju, 2 = mundur
#define VARI_DELAY 150       // jeda antar relay dalam ms (disesuaikan agar transisi terlihat manis)
unsigned long lastVariStep;
int variIndex = 0;

// ---------- Konfigurasi DHT11 ----------
#define DHTPIN  4
#define DHTTYPE DHT11
DHT dht(DHTPIN, DHTTYPE);

// ---------- Web Server (Lokal untuk Direct IP) ----------
#ifdef ESP32
  WebServer server(80);
#else
  ESP8266WebServer server(80);
#endif

// ---------- Telegram ----------
#ifdef ESP8266
  X509List cert(TELEGRAM_CERTIFICATE_ROOT);
#endif

WiFiClientSecure client;
UniversalTelegramBot bot(BOTtoken, client);

int botRequestDelay = 1000;
unsigned long lastTimeBotRan;

// =====================================================================
//  FUNGSI BANTU RELAY
// =====================================================================

void setRelay(int index, bool on) {
  relayState[index] = on;
  digitalWrite(relayPin[index], on ? LOW : HIGH);
}

void allRelayOff() {
  for (int i = 0; i < 4; i++) setRelay(i, false);
}

void runVariasiStep() {
  if (variMode == 0) return;
  if (millis() - lastVariStep < VARI_DELAY) return;
  lastVariStep = millis();

  // Matikan semua dulu
  for (int i = 0; i < 4; i++) {
    digitalWrite(relayPin[i], HIGH);
  }

  int activeRelay;
  if (variMode == 1) {
    activeRelay = variIndex % 4;          // 0→1→2→3→0→...
  } else {
    activeRelay = 3 - (variIndex % 4);    // 3→2→1→0→3→...
  }

  digitalWrite(relayPin[activeRelay], LOW); // Set active relay ON
  
  // Update state tracking
  for (int i = 0; i < 4; i++) {
    relayState[i] = (i == activeRelay);
  }
  
  variIndex++;
}

// =====================================================================
//  WEB SERVER HANDLERS (Untuk Akses Direct IP Bebas Delay + CORS)
// =====================================================================

void sendCORSHeaders() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "*");
}

void handleOptions() {
  sendCORSHeaders();
  server.send(204);
}

void handleGetStatus() {
  sendCORSHeaders();
  
  float h = dht.readHumidity();
  float t = dht.readTemperature();
  float dhtHeatIndex = 0.0;
  
  if (!isnan(h) && !isnan(t)) {
    dhtHeatIndex = dht.computeHeatIndex(t, h, false);
  }

  // Generate status JSON
  StaticJsonDocument<300> doc;
  doc["status"] = "success";
  doc["temperature"] = isnan(t) ? 0.0 : t;
  doc["humidity"] = isnan(h) ? 0.0 : h;
  doc["heatIndex"] = dhtHeatIndex;
  doc["variMode"] = variMode;
  
  JsonArray relays = doc.createNestedArray("relays");
  for (int i = 0; i < 4; i++) {
    relays.add(relayState[i]);
  }

  String jsonResponse;
  serializeJson(doc, jsonResponse);
  server.send(200, "application/json", jsonResponse);
}

void handleRelayToggle() {
  sendCORSHeaders();
  
  String relayId = server.arg("id");
  String state = server.arg("state");
  
  if (relayId != "") {
    int idx = relayId.toInt() - 1;
    if (idx >= 0 && idx < 4) {
      variMode = 0; // Hentikan variasi
      bool turnOn = (state == "on" || state == "1");
      setRelay(idx, turnOn);
    }
  }
  
  // Return updated status
  handleGetStatus();
}

void handleAllRelays() {
  sendCORSHeaders();
  String state = server.arg("state");
  variMode = 0; // Hentikan variasi
  
  if (state == "on") {
    for (int i = 0; i < 4; i++) setRelay(i, true);
  } else {
    for (int i = 0; i < 4; i++) setRelay(i, false);
  }
  
  handleGetStatus();
}

void handleVariasi() {
  sendCORSHeaders();
  String mode = server.arg("mode");
  
  if (mode == "1") {
    allRelayOff();
    variMode = 1;
    variIndex = 0;
    lastVariStep = millis();
  } else if (mode == "2") {
    allRelayOff();
    variMode = 2;
    variIndex = 0;
    lastVariStep = millis();
  } else {
    variMode = 0;
    allRelayOff();
  }
  
  handleGetStatus();
}

// =====================================================================
//  TELEGRAM API HANDLERS
// =====================================================================

void sendDHTData(String chat_id) {
  float humidity    = dht.readHumidity();
  float temperature = dht.readTemperature();

  if (isnan(humidity) || isnan(temperature)) {
    bot.sendMessage(chat_id, "⚠️ Gagal membaca sensor DHT11. Periksa koneksi sensor.", "");
    return;
  }

  float heatIndex = dht.computeHeatIndex(temperature, humidity, false);

  String msg = "🌡️ *Data Sensor DHT11*\\n";
  msg += "──────────────────\\n";
  msg += "🌡 Suhu      : *" + String(temperature, 1) + " °C*\\n";
  msg += "💧 Kelembapan: *" + String(humidity, 1) + " %*\\n";
  msg += "🔥 Heat Index: *" + String(heatIndex, 1) + " °C*\\n";

  bot.sendMessage(chat_id, msg, "Markdown");
}

void sendRelayStatus(String chat_id) {
  String msg = "🔌 *Status Relay*\\n";
  msg += "──────────────────\\n";
  for (int i = 0; i < 4; i++) {
    msg += (relayState[i] ? "🟢" : "🔴");
    msg += " " + relayName[i] + ": *" + (relayState[i] ? "ON" : "OFF") + "*\\n";
  }
  bot.sendMessage(chat_id, msg, "Markdown");
}

void sendWelcome(String chat_id, String from_name) {
  String msg = "👋 Halo, *" + from_name + "*!\\n\\n";
  msg += "📋 *Daftar Perintah:*\\n";
  msg += "──────────────────\\n";
  msg += "🔌 *Kontrol Relay:*\\n";
  msg += "/relay1\\\\_on  — Nyalakan Relay 1\\n";
  msg += "/relay1\\\\_off — Matikan Relay 1\\n";
  msg += "/relay2\\\\_on  — Nyalakan Relay 2\\n";
  msg += "/relay2\\\\_off — Matikan Relay 2\\n";
  msg += "/relay3\\\\_on  — Nyalakan Relay 3\\n";
  msg += "/relay3\\\\_off — Matikan Relay 3\\n";
  msg += "/relay4\\\\_on  — Nyalakan Relay 4\\n";
  msg += "/relay4\\\\_off — Matikan Relay 4\\n";
  msg += "/all\\\\_on     — Nyalakan semua relay\\n";
  msg += "/all\\\\_off    — Matikan semua relay\\n\\n";
  msg += "✨ *Mode Variasi:*\\n";
  msg += "/vari1      — Nyala bergantian 1→2→3→4\\n";
  msg += "/vari2      — Nyala bergantian 4→3→2→1\\n";
  msg += "/vari\\\\_stop — Hentikan mode variasi\\n\\n";
  msg += "📊 *Sensor & Status:*\\n";
  msg += "/dht        — Baca suhu & kelembapan\\n";
  msg += "/status     — Status semua relay\\n";
  bot.sendMessage(chat_id, msg, "Markdown");
}

void handleNewMessages(int numNewMessages) {
  for (int i = 0; i < numNewMessages; i++) {
    String chat_id   = String(bot.messages[i].chat_id);
    String from_name = bot.messages[i].from_name;
    String text      = bot.messages[i].text;

    if (chat_id != CHAT_ID) {
      bot.sendMessage(chat_id, "⛔ Unauthorized user.", "");
      continue;
    }

    Serial.println("Pesan Telegram: " + text);

    if (text == "/start") {
      sendWelcome(chat_id, from_name);
    }
    else if (text == "/relay1_on")  { variMode = 0; setRelay(0, true);  bot.sendMessage(chat_id, "✅ " + relayName[0] + " *ON*",  "Markdown"); }
    else if (text == "/relay1_off") { variMode = 0; setRelay(0, false); bot.sendMessage(chat_id, "❌ " + relayName[0] + " *OFF*", "Markdown"); }
    else if (text == "/relay2_on")  { variMode = 0; setRelay(1, true);  bot.sendMessage(chat_id, "✅ " + relayName[1] + " *ON*",  "Markdown"); }
    else if (text == "/relay2_off") { variMode = 0; setRelay(1, false); bot.sendMessage(chat_id, "❌ " + relayName[1] + " *OFF*", "Markdown"); }
    else if (text == "/relay3_on")  { variMode = 0; setRelay(2, true);  bot.sendMessage(chat_id, "✅ " + relayName[2] + " *ON*",  "Markdown"); }
    else if (text == "/relay3_off") { variMode = 0; setRelay(2, false); bot.sendMessage(chat_id, "❌ " + relayName[2] + " *OFF*", "Markdown"); }
    else if (text == "/relay4_on")  { variMode = 0; setRelay(3, true);  bot.sendMessage(chat_id, "✅ " + relayName[3] + " *ON*",  "Markdown"); }
    else if (text == "/relay4_off") { variMode = 0; setRelay(3, false); bot.sendMessage(chat_id, "❌ " + relayName[3] + " *OFF*", "Markdown"); }
    else if (text == "/all_on") {
      variMode = 0;
      for (int r = 0; r < 4; r++) setRelay(r, true);
      bot.sendMessage(chat_id, "✅ *Semua relay ON*", "Markdown");
    }
    else if (text == "/all_off") {
      variMode = 0;
      for (int r = 0; r < 4; r++) setRelay(r, false);
      bot.sendMessage(chat_id, "❌ *Semua relay OFF*", "Markdown");
    }
    else if (text == "/vari1") {
      allRelayOff();
      variMode  = 1;
      variIndex = 0;
      lastVariStep = millis();
      bot.sendMessage(chat_id, "✨ *Variasi 1 aktif:* 1 → 2 → 3 → 4\\nKetik /vari\\\\_stop untuk menghentikan.", "Markdown");
    }
    else if (text == "/vari2") {
      allRelayOff();
      variMode  = 2;
      variIndex = 0;
      lastVariStep = millis();
      bot.sendMessage(chat_id, "✨ *Variasi 2 aktif:* 4 → 3 → 2 → 1\\nKetik /vari\\\\_stop untuk menghentikan.", "Markdown");
    }
    else if (text == "/vari_stop") {
      variMode = 0;
      allRelayOff();
      bot.sendMessage(chat_id, "⏹ *Mode variasi dihentikan.* Semua relay OFF.", "Markdown");
    }
    else if (text == "/dht") {
      sendDHTData(chat_id);
    }
    else if (text == "/status") {
      sendRelayStatus(chat_id);
    }
    else {
      bot.sendMessage(chat_id, "❓ Perintah tidak dikenal. Ketik /start.", "");
    }
  }
}

// =====================================================================
//  SETUP
// =====================================================================
void setup() {
  Serial.begin(115200);

  for (int i = 0; i < 4; i++) {
    pinMode(relayPin[i], OUTPUT);
    digitalWrite(relayPin[i], HIGH);  // Semua relay OFF saat boot (active-LOW)
  }

  dht.begin();

#ifdef ESP8266
  configTime(0, 0, "pool.ntp.org");
  client.setTrustAnchors(&cert);
#else
  client.setCACert(TELEGRAM_CERTIFICATE_ROOT);
#endif

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  Serial.print("Menghubungkan ke WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("");
  Serial.print("✅ WiFi terhubung! IP ESP32: ");
  Serial.println(WiFi.localIP());

  // --- Setup Web Server Routes untuk Direct IP ---
  server.on("/status", HTTP_GET, handleGetStatus);
  server.on("/toggle", HTTP_GET, handleRelayToggle);
  server.on("/all", HTTP_GET, handleAllRelays);
  server.on("/vari", HTTP_GET, handleVariasi);
  
  // Handle CORS OPTIONS Preflight
  server.on("/status", HTTP_OPTIONS, handleOptions);
  server.on("/toggle", HTTP_OPTIONS, handleOptions);
  server.on("/all", HTTP_OPTIONS, handleOptions);
  server.on("/vari", HTTP_OPTIONS, handleOptions);
  
  server.begin();
  Serial.println("🌐 Web Server Lokal berjalan pada port 80!");
}

// =====================================================================
//  LOOP
// =====================================================================
void loop() {
  server.handleClient(); // Tangani request server HTTP lokal
  runVariasiStep();      // Jalankan step animasi relay jika aktif

  if (millis() > lastTimeBotRan + botRequestDelay) {
    int numNewMessages = bot.getUpdates(bot.last_message_received + 1);

    while (numNewMessages) {
      Serial.println("📨 Telegram baru: " + String(numNewMessages));
      handleNewMessages(numNewMessages);
      numNewMessages = bot.getUpdates(bot.last_message_received + 1);
    }

    lastTimeBotRan = millis();
  }
}
`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(arduinoCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#161920] border border-white/10 rounded-2xl overflow-hidden shadow-md transition-all duration-300 hover:shadow-lg">
      <div className="p-6 bg-black/20 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-sky-500/10 rounded-xl text-sky-400 border border-sky-500/20">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-white font-medium text-lg leading-tight flex items-center gap-2">
              Upgraded Arduino Sketch
              <span className="text-[10px] bg-sky-500/15 text-sky-400 px-2 py-0.5 rounded-full font-mono uppercase tracking-wider font-semibold border border-sky-500/20">
                Dual Mode
              </span>
            </h3>
            <p className="text-gray-500 text-xs mt-1.5 font-mono">
              Supports both local REST API (Web Server) and Telegram Bot with CORS enablement.
            </p>
          </div>
        </div>
        <button
          onClick={copyToClipboard}
          id="btn-copy-arduino-code"
          className="flex items-center gap-2 px-4 py-2 bg-[#1c212b] hover:bg-white/5 active:scale-95 text-gray-200 text-sm font-semibold rounded-xl transition-all border border-white/10 cursor-pointer text-xs"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 text-gray-400" />
              <span>Copy Code</span>
            </>
          )}
        </button>
      </div>

      <div className="p-6 bg-[#1a1412]/40 border-b border-amber-500/15">
        <div className="flex gap-3 text-xs leading-relaxed max-w-3xl">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" />
          <div>
            <p className="font-semibold text-amber-500 mb-1 font-mono">Penting untuk Direct IP Mode:</p>
            <p className="text-gray-400">
              Program ini menyalakan server lokal di port 80 pada board ESP32 / ESP8266 Anda. 
              Gunakan IP Address yang muncul pada <span className="text-amber-500 font-bold">Serial Monitor</span> (contoh: <code className="bg-black/40 border border-white/5 font-mono text-amber-300 px-1 py-0.5 rounded text-[11px]">192.168.1.50</code>) 
              kemudian pasangkan di kolom konfigurasi IP di dashboard untuk interaksi langsung secara instan bebas delay.
            </p>
          </div>
        </div>
      </div>

      <div className="relative">
        <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 bg-black/40 rounded-md backdrop-blur text-xs font-mono text-gray-400 border border-white/5">
          <Terminal className="w-3.5 h-3.5 text-sky-400" />
          ino
        </div>
        <pre className="p-6 max-h-[500px] overflow-y-auto text-xs font-mono text-gray-400 bg-[#0d0f14]/60 leading-relaxed">
          <code>{arduinoCode}</code>
        </pre>
      </div>
    </div>
  );
}
