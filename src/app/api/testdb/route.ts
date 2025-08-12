import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";

export async function GET() {
  try {
    await dbConnect();
    return NextResponse.json({ ok: true, message: "✅ Kết nối MongoDB thành công!" });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message });
  }
}
