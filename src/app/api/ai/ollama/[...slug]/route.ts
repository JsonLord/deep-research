import { NextResponse, type NextRequest } from "next/server";
import { OLLAMA_BASE_URL } from "@/constants/urls";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const API_PROXY_BASE_URL = process.env.OLLAMA_API_BASE_URL || OLLAMA_BASE_URL || "http://localhost:11434";

async function handler(req: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
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

    const requestHeaders = new Headers(req.headers);
    requestHeaders.delete("authorization");
    requestHeaders.delete("x-api-key");
    requestHeaders.delete("x-goog-api-key");
    requestHeaders.delete("api-key");
    requestHeaders.delete("host");
    requestHeaders.delete("origin");
    requestHeaders.delete("referer");

    const payload: RequestInit = {
      method: req.method,
      headers: requestHeaders,
      cache: 'no-store',
    };
    if (body) payload.body = JSON.stringify(body);

    const response = await fetch(url, payload);

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
    console.error("Proxy error (ollama):", error);
    return NextResponse.json(
      { code: 500, message: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

export { handler as GET, handler as POST, handler as PUT, handler as DELETE };
