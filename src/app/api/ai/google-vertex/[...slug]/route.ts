import { NextResponse, type NextRequest } from "next/server";
import { generateAuthToken } from "@/utils/vertexAuth";

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

const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL || "";
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY || "";
const GOOGLE_PRIVATE_KEY_ID = process.env.GOOGLE_PRIVATE_KEY_ID || "";
const LOCATION = process.env.GOOGLE_VERTEX_LOCATION || "us-central1";
const PROJECT = process.env.GOOGLE_VERTEX_PROJECT || "";

async function handler(req: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
  try {
    const { slug: path } = await params;
    let body;
    if (req.method.toUpperCase() !== "GET" && req.method.toUpperCase() !== "HEAD") {
      body = await req.clone().json().catch(() => undefined);
    }
    const searchParams = req.nextUrl.searchParams;
    const paramsStr = searchParams.toString();

    const baseUrl = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT}/locations/${LOCATION}/publishers/google`;
    let url = `${baseUrl}/${decodeURIComponent(path.join("/"))}`;
    if (paramsStr) url += `?${paramsStr}`;

    const authToken = await generateAuthToken({
      clientEmail: GOOGLE_CLIENT_EMAIL,
      privateKey: GOOGLE_PRIVATE_KEY,
      privateKeyId: GOOGLE_PRIVATE_KEY_ID,
    });

    const payload: RequestInit = {
      method: req.method,
      headers: {
        "Content-Type": req.headers.get("Content-Type") || "application/json",
        Authorization: authToken ? `Bearer ${authToken}` : (req.headers.get("Authorization") || ""),
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
    console.error("Proxy error (vertex):", error);
    return NextResponse.json(
      { code: 500, message: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

export { handler as GET, handler as POST, handler as PUT, handler as DELETE };
