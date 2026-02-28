import { NextResponse, type NextRequest } from "next/server";
import { XAI_BASE_URL } from "@/constants/urls";
import { multiApiKeyPolling } from "@/utils/model";

export const runtime = "edge";
export const preferredRegion = [
  "cle1",
  "iad1",
  "pdx1",
  "sfo1",
  "sin1",
  "syd1",
  "hnd1",
  "kix1",
];

const API_PROXY_BASE_URL = process.env.XAI_API_BASE_URL || XAI_BASE_URL || "https://api.x.ai";
const XAI_API_KEY = process.env.XAI_API_KEY || "";

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

    const apiKey = multiApiKeyPolling(XAI_API_KEY);

    const payload: RequestInit = {
      method: req.method,
      headers: {
        "Content-Type": req.headers.get("Content-Type") || "application/json",
        Authorization: apiKey ? `Bearer ${apiKey}` : (req.headers.get("Authorization") || ""),
      },
      cache: 'no-store',
    };
    if (body) payload.body = JSON.stringify(body);

    const response = await fetch(url, payload);

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
    console.error("Proxy error (xai):", error);
    return NextResponse.json(
      { code: 500, message: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

export { handler as GET, handler as POST, handler as PUT, handler as DELETE };
