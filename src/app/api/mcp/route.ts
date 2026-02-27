import { NextResponse, type NextRequest } from "next/server";
import { StreamableHTTPServerTransport } from "@/libs/mcp-server/streamableHttp";
import { initMcpServer } from "./server";

export const runtime = "edge";
export const dynamic = "force-dynamic";
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

export async function POST(req: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[MCP][${requestId}] POST request received`);
  try {
    const server = initMcpServer();
    const transport: StreamableHTTPServerTransport =
      new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });

    transport.onclose = () => {
      console.log(`[MCP][${requestId}] Transport closed`);
      transport.close();
      server.close();
    };

    transport.onerror = (err) => {
      console.error(`[MCP][${requestId}] Transport error:`, err);
      return NextResponse.json(
        { code: 500, message: err.message },
        { status: 500 }
      );
    };

    await server.connect(transport);
    console.log(`[MCP][${requestId}] Server connected to transport`);
    const response = await transport.handleRequest(req);
    console.log(`[MCP][${requestId}] Request handled, status: ${response.status}`);
    return new NextResponse(response.body, response);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`[MCP][${requestId}] Caught error:`, error);
      return NextResponse.json(
        { code: 500, message: error.message },
        { status: 500 }
      );
    }
  }
}
