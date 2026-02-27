import { NextResponse, type NextRequest } from "next/server";
import { multiApiKeyPolling } from "@/utils/model";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const API_PROXY_BASE_URL = process.env.TAVILY_API_BASE_URL || "https://api.tavily.com";
const TAVILY_API_KEY = process.env.TAVILY_API_KEY || "";

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
  const requestId = Math.random().toString(36).substring(7);
  try {
    const { slug: path } = await params;
    const body = await req.clone().json().catch(() => ({}));
    const searchParams = req.nextUrl.searchParams;
    const paramsStr = searchParams.toString();

    let url = `${API_PROXY_BASE_URL}/${decodeURIComponent(path.join("/"))}`;
    if (paramsStr) url += `?${paramsStr}`;

    console.log(`[${requestId}] [Proxy] [Tavily] Upstream: ${url}`);

    const apiKey = multiApiKeyPolling(TAVILY_API_KEY);

    // Tavily often expects api_key in the body if it's a POST
    if (apiKey && !body.api_key) {
      body.api_key = apiKey;
    }

    const payload: RequestInit = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey ? `Bearer ${apiKey}` : (req.headers.get("Authorization") || ""),
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    };

    const response = await fetch(url, payload);

    console.log(`[${requestId}] [Proxy] [Tavily] Response: ${response.status}`);

    const responseHeaders = new Headers();
    response.headers.forEach((value, key) => {
      if (!["content-encoding", "transfer-encoding", "content-length"].includes(key.toLowerCase())) {
        responseHeaders.set(key, value);
      }
    });

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error(`[${requestId}] [Proxy] [Tavily] ERROR:`, error);
    return NextResponse.json(
      { code: 500, message: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
