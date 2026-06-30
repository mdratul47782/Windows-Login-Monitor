# Factory PC Login Monitor

ফ্যাক্টরির পিসিগুলোতে কেউ পরপর ৩ বার ভুল পাসওয়ার্ড দিলে, সেটা একটা Next.js ড্যাশবোর্ডে দেখা যাবে।

## সিস্টেমের ৩টা অংশ

| অংশ | কী করে |
|---|---|
| **login-monitor-agent.ps1** (PowerShell agent) | প্রতিটা ফ্যাক্টরি PC-তে চলবে। Windows Event Log (Event ID 4625 = failed logon) মনিটর করে, একই ইউজার পরপর ৩ বার ভুল পাসওয়ার্ড দিলে সার্ভারে রিপোর্ট পাঠায় |
| **login-monitor/** (Next.js সার্ভার) | এজেন্ট থেকে ডেটা রিসিভ করে, স্টোর করে। এতে আছে:<br>• `/api/login-alert` — এজেন্ট থেকে ডেটা রিসিভ করে (API key দিয়ে সুরক্ষিত)<br>• `/api/alerts` — ড্যাশবোর্ডের জন্য এলার্ট লিস্ট দেয়<br>• `/` — মূল ড্যাশবোর্ড পেজ, প্রতি ৫ সেকেন্ডে অটো-রিফ্রেশ হয় |
| **data/alerts.json** | এলার্ট ডেটা এখানে সেভ থাকে (ফাইল-বেসড, কোনো ডেটাবেজ সার্ভার সেটআপের প্রয়োজন নেই) |

আপনি ব্রাউজারে গিয়ে দেখবেন কোন PC-তে কে কতবার ভুল পাসওয়ার্ড দিয়েছে।

---

## ধাপ ১: সার্ভার সেটআপ (একবার, যেকোনো একটা সার্ভার/PC-তে)

```bash
cd login-monitor
npm install
```

`.env.local` ফাইলে একটা সিক্রেট কী বসান (সহজ কিছু না দিয়ে লম্বা র‍্যান্ডম স্ট্রিং):

```
AGENT_API_KEY=আপনার-নিজের-একটা-লম্বা-র‍্যান্ডম-সিক্রেট-কী
```

বিল্ড করে চালু করুন:

```bash
npm run build
npm run start
```

এটা পোর্ট 3000-এ চলবে: `http://SERVER_IP:3000`

এই PC-র IP অ্যাড্রেস বের করে রাখুন (`ipconfig` দিয়ে), কারণ এটাই হবে `SERVER_IP`।

> **পরামর্শ:** প্রোডাকশনে রাখার জন্য, সার্ভার রিস্টার্ট হলেও যাতে এটা নিজে থেকে চালু হয়ে যায়, সার্ভার PC-তেও Task Scheduler দিয়ে `npm run start` কমান্ডটা স্টার্টআপে সেট করে রাখতে পারেন, অথবা PM2 / Windows Service হিসেবে চালাতে পারেন।

---

## ধাপ ২: এজেন্ট স্ক্রিপ্ট প্রস্তুত করুন

`login-monitor-agent.ps1` ফাইলটা ওপেন করুন (Notepad-এ) এবং শুরুর দিকের দুটো ভ্যালু বদলে দিন:

```powershell
$ApiUrl = "http://SERVER_IP:3000/api/login-alert"   # সার্ভারের আসল IP দিন
$ApiKey = "আপনার-নিজের-একটা-লম্বা-র‍্যান্ডম-সিক্রেট-কী"  # .env.local এর সাথে একই হতে হবে
```

---

## ধাপ ৩: প্রতিটা ফ্যাক্টরি PC-তে স্ক্রিপ্ট রাখুন

1. `C:\Scripts\` ফোল্ডার বানান (না থাকলে)
2. `login-monitor-agent.ps1` ফাইলটা সেখানে কপি করুন:
   ```
   C:\Scripts\login-monitor-agent.ps1
   ```

(চাইলে এখানেই একবার ম্যানুয়ালি টেস্ট রান করে দেখতে পারেন:)

```powershell
powershell -ExecutionPolicy Bypass -File "C:\Scripts\login-monitor-agent.ps1"
```

---

## ধাপ ৪: Audit Policy চালু করুন (একবার, প্রতিটা PC-তে)

Failed login ট্র্যাক করার জন্য Windows-এ এটা অন থাকতে হবে। Administrator PowerShell খুলে চালান:

```powershell
auditpol /set /subcategory:"Logon" /failure:enable
```

ভেরিফাই করতে:

```powershell
auditpol /get /subcategory:"Logon"
```

"Failure" কলামে "Success and Failure" বা "Failure" দেখালে ঠিক আছে।

---

## ধাপ ৫: Task Scheduler-এ এজেন্ট রেজিস্টার করুন

সব সময় ব্যাকগ্রাউন্ডে চালু রাখতে এজেন্টকে Task Scheduler দিয়ে স্টার্টআপে সেট করে দিতে হবে (Run with highest privileges, Run whether user is logged on or not)। Administrator PowerShell খুলে এই কমান্ডগুলো একসাথে চালান:

```powershell
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument '-ExecutionPolicy Bypass -WindowStyle Hidden -File "C:\Scripts\login-monitor-agent.ps1"'
$trigger = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
Register-ScheduledTask -TaskName "Login Monitor Agent" -Action $action -Trigger $trigger -Principal $principal
```

SYSTEM অ্যাকাউন্ট + At startup মানে PC অন হওয়ার সাথে সাথেই, কেউ লগইন করার আগেই এজেন্ট ব্যাকগ্রাউন্ডে চালু হয়ে যাবে।

যদি "task already exists" এরর আসে, আগে মুছে নিন তারপর আবার রেজিস্টার করুন:

```powershell
Unregister-ScheduledTask -TaskName "Login Monitor Agent" -Confirm:$false
```

---

## ধাপ ৬: ভেরিফাই করুন টাস্কটা ঠিকঠাক আছে কিনা

```powershell
Get-ScheduledTask -TaskName "Login Monitor Agent"
```

`State: Ready` দেখানো উচিত। এখন ম্যানুয়ালি একবার রান করিয়ে দেখুন:

```powershell
Start-ScheduledTask -TaskName "Login Monitor Agent"
Get-Process powershell -ErrorAction SilentlyContinue
```

একটা powershell প্রসেস PID সহ দেখালে মানে এজেন্ট ব্যাকগ্রাউন্ডে চলছে।

---

## ধাপ ৭: পুরো ফ্লো টেস্ট করুন

1. PC Restart দিন
2. লগইন স্ক্রিন এলে, ইচ্ছাকৃতভাবে ৩ বার ভুল পাসওয়ার্ড দিন
3. তারপর সঠিক পাসওয়ার্ড দিয়ে লগইন করুন
4. ব্রাউজারে গিয়ে দেখুন: `http://SERVER_IP:3000`
5. ড্যাশবোর্ডে নতুন এন্ট্রি আসা উচিত — PC নাম, ইউজারনেম, সময় সহ

যদি এন্ট্রি না আসে, এই ৩টা জিনিস চেক করুন:

- Audit policy অন আছে কিনা (ধাপ ৪)
- এই PC থেকে সার্ভারে নেটওয়ার্ক কানেকশন আছে কিনা:
  ```powershell
  Invoke-WebRequest -Uri "http://SERVER_IP:3000" -UseBasicParsing
  ```
- স্ক্রিপ্টের `$ApiKey` আর সার্ভারের `.env.local`-এর `AGENT_API_KEY` একই কিনা

---

## ধাপ ৮: বাকি সব PC-তে রিপিট করুন

প্রতিটা ফ্যাক্টরি PC-তে ধাপ ৩, ৪, ৫ রিপিট করুন (script কপি → audit policy অন → Task Scheduler রেজিস্টার)। সার্ভারের IP আর key সব PC-তে একই থাকবে।

---

## নিরাপত্তা সংক্রান্ত পরামর্শ

- `AGENT_API_KEY` কখনো সহজবোধ্য রাখবেন না (যেমন `1234`), একটা লম্বা র‍্যান্ডম স্ট্রিং দিন।
- যদি সম্ভব হয়, সার্ভার আর PC-গুলো একই লোকাল নেটওয়ার্কে রাখুন (ইন্টারনেটে এক্সপোজ না করে)।
- দীর্ঘমেয়াদে চালালে JSON ফাইলের বদলে PostgreSQL বা MySQL-এ স্থানান্তর করার কথা ভাবতে পারেন, বিশেষ করে যদি PC সংখ্যা অনেক বেশি (৫০+) হয়।

---

এই সবগুলো ধাপ ঠিকমতো করলে পুরো সিস্টেম কাজ করবে: যেকোনো PC-তে কেউ পরপর ৩ বার ভুল পাসওয়ার্ড দিলে, লগইন করার আগেই agent সেটা ধরে ফেলবে এবং কয়েক সেকেন্ডের মধ্যে আপনার Next.js ড্যাশবোর্ডে দেখা যাবে।