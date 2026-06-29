import { NextResponse } from "next/server";
import { getAllAlerts, clearAlerts } from "@/lib/store";

export async function GET() {
  const alerts = getAllAlerts();
  return NextResponse.json({ alerts });
}

export async function DELETE() {
  clearAlerts();
  return NextResponse.json({ success: true });
}
