import fs from "fs";
import path from "path";

// ডেটা ফাইলের লোকেশন
const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "alerts.json");

export type LoginAlert = {
  id: string;
  pcName: string;
  userName: string;
  failCount: number;
  timestamp: string;
  receivedAt: string;
};

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
  }
}

export function getAllAlerts(): LoginAlert[] {
  ensureDataFile();
  const raw = fs.readFileSync(DATA_FILE, "utf-8");
  try {
    const data = JSON.parse(raw) as LoginAlert[];
    // সর্বশেষ এলার্ট আগে দেখানোর জন্য
    return data.sort(
      (a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
    );
  } catch {
    return [];
  }
}

export function addAlert(alert: Omit<LoginAlert, "id" | "receivedAt">): LoginAlert {
  ensureDataFile();
  const alerts = getAllAlerts();

  const newAlert: LoginAlert = {
    ...alert,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    receivedAt: new Date().toISOString(),
  };

  alerts.unshift(newAlert);

  // সর্বোচ্চ ৫০০টা রেকর্ড রাখব, পুরনোগুলো বাদ
  const trimmed = alerts.slice(0, 500);

  fs.writeFileSync(DATA_FILE, JSON.stringify(trimmed, null, 2));
  return newAlert;
}

export function clearAlerts() {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
}
