import { NextResponse } from "next/server";

export async function GET() {
  const enabled = Boolean(process.env.AI_PRIMARY_API_KEY || process.env.AI_BACKUP_API_KEY);
  return NextResponse.json({ enabled });
}
