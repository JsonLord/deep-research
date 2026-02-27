import { NextResponse, type NextRequest } from "next/server";
import { SEARXNG_BASE_URL } from "@/constants/urls";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const API_PROXY_BASE_URL = process.env.SEARXNG_API_BASE_URL || SEARXNG_BASE_URL || "http://localhost:8080";

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
  const requestId = Math.random().toString(36).substring(7);
  try {
    const { slug: path } = await params;
    const body = await req.clone().json().catch(() => undefined);
    const searchParams = req.nextUrl.searchParams;
    const paramsStr = searchParams.toString();

    let url = `${API_PROXY_BASE_URL}/${decodeURIComponent(path.join("/"))}`;
    if (paramsStr) url += `?${paramsStr}`;

    console.log(`[${requestId}] [Proxy] [SearXNG] Upstream: ${url}`);

    const payload: RequestInit = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      cache: 'no-store',
    };
    if (body) payload.body = JSON.stringify(body);

    const response = await fetch(url, payload);

    console.log(`[${requestId}] [Proxy] [SearXNG] Response: ${response.status}`);

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
    console.error(`[${requestId}] [Proxy] [SearXNG] ERROR:`, error);
    return NextResponse.json(
      { code: 500, message: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
