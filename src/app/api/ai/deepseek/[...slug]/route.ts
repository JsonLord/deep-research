import { NextResponse, type NextRequest } from "next/server";
import { DEEPSEEK_BASE_URL } from "@/constants/urls";
import { multiApiKeyPolling } from "@/utils/model";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const API_PROXY_BASE_URL = process.env.DEEPSEEK_API_BASE_URL || DEEPSEEK_BASE_URL || "https://api.deepseek.com";
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "";

async function handler(req: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
  const requestId = Math.random().toString(36).substring(7);
  try {
    const { slug: path } = await params;
    let body;
    if (req.method.toUpperCase() !== "GET" && req.method.toUpperCase() !== "HEAD") {
      body = await req.clone().json().catch(() => undefined);
    }
    const searchParams = new URLSearchParams(req.nextUrl.searchParams);
    searchParams.delete("slug");
    const paramsStr = searchParams.toString();

    const baseUrl = API_PROXY_BASE_URL.replace(/\/+$/, "");
    let joinedPath = decodeURIComponent(path.join("/"));
    const firstSegment = decodeURIComponent(path[0]);
    if (baseUrl.endsWith(`/${firstSegment}`)) {
      joinedPath = decodeURIComponent(path.slice(1).join("/"));
    }
    let url = `${baseUrl}/${joinedPath}`;
    if (paramsStr) url += `?${paramsStr}`;

    console.log(`[${requestId}] [Proxy] [DeepSeek] Upstream: ${url}`);

    const apiKey = multiApiKeyPolling(DEEPSEEK_API_KEY);

    const requestHeaders = new Headers(req.headers);
    requestHeaders.delete("authorization");
    requestHeaders.delete("x-api-key");
    requestHeaders.delete("x-goog-api-key");
    requestHeaders.delete("api-key");
    requestHeaders.delete("host");
    requestHeaders.delete("origin");
    requestHeaders.delete("referer");

    if (apiKey) {
      requestHeaders.set("Authorization", `Bearer ${apiKey}`);
    }

    const payload: RequestInit = {
      method: req.method,
      headers: requestHeaders,
      cache: 'no-store',
    };
    if (body) payload.body = JSON.stringify(body);

    const response = await fetch(url, payload);

    console.log(`[${requestId}] [Proxy] [DeepSeek] Response: ${response.status}`);

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
    console.error(`[${requestId}] [Proxy] [DeepSeek] ERROR:`, error);
    return NextResponse.json(
      { code: 500, message: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

export { handler as GET, handler as POST, handler as PUT, handler as DELETE };
