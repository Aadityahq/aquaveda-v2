import { NextResponse } from "next/server";

import { getSystemSnapshot } from "@/lib/system";

export async function GET() {
  try {
    const data = getSystemSnapshot();
    return NextResponse.json({ success: true, data, message: "ok" });
  } catch {
    return NextResponse.json(
      {
        success: false,
        data: null,
        message: "System check failed",
        code: "SYSTEM_CHECK_FAILED",
      },
      { status: 500 },
    );
  }
}
