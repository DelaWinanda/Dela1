export interface ConnectionInfo {
  mode: "simulator" | "telegram" | "direct_ip";
  espIp: string;
  telegramToken: string;
  telegramChatId: string;
  isCustomizing: boolean;
}

export interface RelayChan {
  id: number;
  name: string;
  pin: number;
  state: boolean;
}

export interface DHTDataPoint {
  time: string; // HH:MM:SS
  timestamp: number;
  temperature: number;
  humidity: number;
  heatIndex: number;
}

export interface VoiceCommandDef {
  phrase: string;
  action: string;
  category: "relay" | "all" | "vari" | "sensor";
}
