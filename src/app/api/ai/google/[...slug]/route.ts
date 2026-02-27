import { NextResponse, type NextRequest } from "next/server";
import { GEMINI_BASE_URL } from "@/constants/urls";
import { multiApiKeyPolling } from "@/utils/model";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const API_PROXY_BASE_URL =
  process.env.API_PROXY_BASE_URL ||
  process.env.GOOGLE_GENERATIVE_AI_API_BASE_URL ||
  GEMINI_BASE_URL ||
  "https://generativelanguage.googleapis.com";
const GOOGLE_GENERATIVE_AI_API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY || "";

async function handler(req: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
  const requestId = Math.random().toString(36).substring(7);
  try {
    const { slug: path } = await params;
    let body;
    if (req.method.toUpperCase() !== "GET" && req.method.toUpperCase() !== "HEAD") {
      body = await req.clone().json().catch(() => undefined);
    }
    const searchParams = req.nextUrl.searchParams;
    const paramsStr = searchParams.toString();

    let url = `${API_PROXY_BASE_URL}/${decodeURIComponent(path.join("/"))}`;
    if (paramsStr) url += `?${paramsStr}`;

    console.log(`[${requestId}] [Proxy] [Google] Upstream: ${url}`);

    const apiKey = multiApiKeyPolling(GOOGLE_GENERATIVE_AI_API_KEY);

    const requestHeaders = new Headers(req.headers);
    requestHeaders.delete("authorization");
    requestHeaders.delete("x-api-key");
    requestHeaders.delete("x-goog-api-key");
    requestHeaders.delete("api-key");

    if (apiKey) {
      requestHeaders.set("x-goog-api-key", apiKey);
    }

    const payload: RequestInit = {
      method: req.method,
      headers: requestHeaders,
      cache: 'no-store',
    };
    if (body) payload.body = JSON.stringify(body);

    const response = await fetch(url, payload);

    console.log(`[${requestId}] [Proxy] [Google] Response: ${response.status}`);

    const responseHeaders = new Headers();
    response.headers.forEach((value, key) => {
      if (!["content-encoding", "transfer-encoding", "content-length", "connection", "keep-alive"].includes(key.toLowerCase())) {
        responseHeaders.set(key, value);
      }
    });

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error(`[${requestId}] [Proxy] [Google] ERROR:`, error);
    return NextResponse.json(
      { code: 500, message: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

export { handler as GET, handler as POST, handler as PUT, handler as DELETE };
