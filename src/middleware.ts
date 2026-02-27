import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { verifySignature } from "@/utils/signature";

const accessPassword = process.env.ACCESS_PASSWORD || "";
const DISABLED_AI_PROVIDER = process.env.NEXT_PUBLIC_DISABLED_AI_PROVIDER || "";
const DISABLED_SEARCH_PROVIDER = process.env.NEXT_PUBLIC_DISABLED_SEARCH_PROVIDER || "";

// Limit the middleware to paths starting with `/api/`
export const config = {
  matcher: "/api/:path*",
};

const ERRORS = {
  NO_PERMISSIONS: {
    code: 403,
    message: "No permissions",
    status: "FORBIDDEN",
  },
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestId = Math.random().toString(36).substring(7);

  try {
    // Skip authorization for non-sensitive API routes
    if (!pathname.startsWith("/api/ai") && !pathname.startsWith("/api/search") && !pathname.startsWith("/api/sse") && !pathname.startsWith("/api/mcp") && !pathname.startsWith("/api/crawler")) {
      return NextResponse.next();
    }

    console.log(`[${requestId}] [Middleware] Incoming: ${request.method} ${pathname}`);

    const isAuthorized = (authStr: string) => {
      if (!accessPassword) return { ok: true, msg: "No password set" };
      if (!authStr) {
        return { ok: false, msg: "Missing authorization header" };
      }
      const token = authStr.startsWith("Bearer ") ? authStr.substring(7) : authStr;
      const verified = verifySignature(token, accessPassword, Date.now());
      return { ok: verified, msg: verified ? "Verified" : "Invalid signature" };
    };

    // 1. Check AI Provider restrictions
    if (pathname.startsWith("/api/ai")) {
      const provider = pathname.split("/")[3];
      const disabledAIProviders = DISABLED_AI_PROVIDER ? DISABLED_AI_PROVIDER.split(",") : [];
      const authHeader = request.headers.get("Authorization") ||
                         request.headers.get("authorization") ||
                         request.headers.get("x-goog-api-key") ||
                         request.headers.get("x-api-key") ||
                         request.headers.get("api-key") || "";

      console.log(`[${requestId}] [Middleware] [AI] Auth header present: ${!!authHeader}, length: ${authHeader?.length || 0}, start: ${authHeader ? authHeader.substring(0, 10) + "..." : "none"}`);

      const auth = isAuthorized(authHeader);
      if (!auth.ok || disabledAIProviders.includes(provider)) {
        console.warn(`[${requestId}] [Middleware] [AI] BLOCKED: provider=${provider}, auth=${auth.msg}`);
        return NextResponse.json({ error: ERRORS.NO_PERMISSIONS }, { status: 403 });
      }
    }

    // 2. Check Search Provider restrictions
    if (pathname.startsWith("/api/search")) {
      const provider = pathname.split("/")[3];
      const disabledSearchProviders = DISABLED_SEARCH_PROVIDER ? DISABLED_SEARCH_PROVIDER.split(",") : [];
      const authHeader = request.headers.get("Authorization") || request.headers.get("authorization") || "";
      const auth = isAuthorized(authHeader);
      if (!auth.ok || disabledSearchProviders.includes(provider)) {
        console.warn(`[${requestId}] [Middleware] [Search] BLOCKED: provider=${provider}, auth=${auth.msg}`);
        return NextResponse.json({ error: ERRORS.NO_PERMISSIONS }, { status: 403 });
      }
    }

    // 3. Check SSE/MCP/Crawler restrictions
    if (pathname.startsWith("/api/sse") || pathname.startsWith("/api/mcp") || pathname.startsWith("/api/crawler")) {
      let authHeader = request.headers.get("Authorization") || request.headers.get("authorization") || "";
      if (authHeader.startsWith("Bearer ")) authHeader = authHeader.substring(7);
      else if (request.method === "GET") authHeader = request.nextUrl.searchParams.get("password") || "";

      if (accessPassword && authHeader !== accessPassword) {
        console.warn(`[${requestId}] [Middleware] [Special] BLOCKED: path=${pathname}, auth=Password mismatch`);
        return NextResponse.json({ error: ERRORS.NO_PERMISSIONS }, { status: 403 });
      }
    }

    console.log(`[${requestId}] [Middleware] PASS: ${pathname}`);
    return NextResponse.next();
  } catch (err) {
    console.error(`[${requestId}] [Middleware] CRASH:`, err);
    return NextResponse.next();
  }
}
