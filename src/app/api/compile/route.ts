import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { language, version, files } = await req.json();

    if (!files || !files.length || !files[0].content) {
      return NextResponse.json({ error: "No code provided" }, { status: 400 });
    }

    const response = await fetch("https://emkc.org/api/v2/piston/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language: language || "c",
        version: version || "10.2.0",
        files: files,
      }),
    });

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error("Compilation error:", error);
    return NextResponse.json({ error: "Failed to compile code" }, { status: 500 });
  }
}
