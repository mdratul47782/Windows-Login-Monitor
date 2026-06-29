# Factory PC Login Monitor

ফ্যাক্টরির পিসিগুলোতে কেউ পরপর ৩ বার ভুল পাসওয়ার্ড দিলে, সেটা একটা Next.js ড্যাশবোর্ডে দেখা যাবে।

## সিস্টেমের ৩টা অংশ

1. **login-monitor-agent.ps1** — প্রতিটা ফ্যাক্টরি PC-তে চলবে। Windows Event Log
   (Event ID 4625 = failed logon) মনিটর করে, একই ইউজার পরপর ৩ বার ভুল পাসওয়ার্ড
   দিলে সার্ভারে রিপোর্ট পাঠায়।
2. **login-monitor/** — Next.js অ্যাপ। এতে আছে:
   - `/api/login-alert` — এজেন্ট থেকে ডেটা রিসিভ করে (API key দিয়ে সুরক্ষিত)
   - `/api/alerts` — ড্যাশবোর্ডের জন্য এলার্ট লিস্ট দেয়
   - `/` — মূল ড্যাশবোর্ড পেজ, প্রতি ৫ সেকেন্ডে অটো-রিফ্রেশ হয়
3. **data/alerts.json** — এলার্ট ডেটা এখানে সেভ থাকে (ফাইল-বেসড, কোনো ডেটাবেজ
   সার্ভার সেটআপের প্রয়োজন নেই)

## সার্ভার সেটআপ (একবার, যেকোনো একটা সার্ভার/PC-তে)

```bash
cd login-monitor
npm install
```

`.env.local` ফাইলে একটা সিক্রেট কী বসান:

```
AGENT_API_KEY=আপনার-নিজের-একটা-র‍্যান্ডম-সিক্রেট-কী
```

চালু করার জন্য:

```bash
npm run build
npm run start
```

ডিফল্টে এটা পোর্ট 3000-এ চলবে: `http://SERVER_IP:3000`

> প্রোডাকশনে রাখার জন্য PM2 বা Windows Service হিসেবে চালানো ভালো, যাতে সার্ভার
> রিস্টার্ট হলেও এটা আবার চালু হয়ে যায়।

## প্রতিটা ফ্যাক্টরি PC-তে যা করতে হবে

1. `login-monitor-agent.ps1` ফাইলটা প্রতিটা PC-তে কপি করুন।
2. ফাইলের শুরুতে এই দুইটা ভ্যালু বদলে দিন:
   - `$ApiUrl` — সার্ভারের ঠিকানা, যেমন `http://192.168.1.50:3000/api/login-alert`
   - `$ApiKey` — সার্ভারের `.env.local`-এ যা দিয়েছেন, একই কী
3. Administrator PowerShell-এ চালান:
   ```powershell
   powershell -ExecutionPolicy Bypass -File "C:\Scripts\login-monitor-agent.ps1"
   ```
4. সব সময় ব্যাকগ্রাউন্ডে চালু রাখতে **Task Scheduler** দিয়ে একে স্টার্টআপে
   সেট করে দিন (Run with highest privileges, Run whether user is logged on or not)।

### আগে থেকে চেক করে নিন

Windows-এ ব্যর্থ লগইন ট্র্যাক করতে Audit policy অন থাকতে হবে:

```powershell
auditpol /set /subcategory:"Logon" /failure:enable
```

## নিরাপত্তা সংক্রান্ত পরামর্শ

- `AGENT_API_KEY` কখনো সহজবোধ্য রাখবেন না (যেমন `1234`), একটা লম্বা র‍্যান্ডম স্ট্রিং দিন।
- যদি সম্ভব হয়, সার্ভার আর PC-গুলো একই লোকাল নেটওয়ার্কে রাখুন (ইন্টারনেটে এক্সপোজ না করে)।
- দীর্ঘমেয়াদে চালালে JSON ফাইলের বদলে PostgreSQL বা MySQL-এ স্থানান্তর করার কথা
  ভাবতে পারেন, বিশেষ করে যদি PC সংখ্যা অনেক বেশি (৫০+) হয়।
