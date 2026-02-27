import { NextResponse, type NextRequest } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  try {
    const { url } = await req.json();
    console.log(`[${requestId}] [Crawler] Target: ${url}`);

    // Using a public Jina reader as a fallback if no other crawler is configured
    const crawlerUrl = `https://r.jina.ai/${url}`;
    const response = await fetch(crawlerUrl, {
       headers: {
         "X-Return-Format": "markdown"
       },
       cache: 'no-store'
    });

    console.log(`[${requestId}] [Crawler] Response: ${response.status}`);

    const text = await response.text();
    return NextResponse.json({ content: text });
  } catch (error) {
    console.error(`[${requestId}] [Crawler] ERROR:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
