import { NextRequest, NextResponse } from "next/server";
import { addAlert } from "@/lib/store";

// আপনার PowerShell এজেন্ট স্ক্রিপ্টের সাথে এই key মিলিয়ে রাখুন
const API_KEY = process.env.AGENT_API_KEY || "REPLACE_WITH_SECRET_KEY";

export async function POST(req: NextRequest) {
  // সিকিউরিটি চেক - শুধু আপনার এজেন্টরাই ডেটা পাঠাতে পারবে
  const incomingKey = req.headers.get("x-api-key");
  if (incomingKey !== API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { pcName, userName, failCount, timestamp } = body;

    if (!pcName || !userName || !failCount) {
      return NextResponse.json(
        { error: "pcName, userName, failCount প্রয়োজন" },
        { status: 400 }
      );
    }

    const alert = addAlert({
      pcName: String(pcName),
      userName: String(userName),
      failCount: Number(failCount),
      timestamp: timestamp || new Date().toISOString(),
    });

    return NextResponse.json({ success: true, alert });
  } catch (err) {
    return NextResponse.json(
      { error: "অবৈধ রিকোয়েস্ট", details: String(err) },
      { status: 400 }
    );
  }
}
