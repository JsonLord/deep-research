import { NextResponse, type NextRequest } from "next/server";
import DeepResearch from "@/utils/deep-research";
import { multiApiKeyPolling } from "@/utils/model";
import { parseDeepResearchPromptOverrides } from "@/constants/prompts";
import {
  getAIProviderBaseURL,
  getAIProviderApiKey,
  getSearchProviderBaseURL,
  getSearchProviderApiKey,
} from "../utils";

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
  console.log(`[${requestId}] [SSE] POST request started`);

  try {
    const {
      query,
      provider,
      thinkingModel,
      taskModel,
      searchProvider,
      language,
      maxResult,
      enableCitationImage = true,
      enableReferences = true,
      enableFileFormatResource = false,
      promptOverrides,
    } = await req.json();

    console.log(`[${requestId}] [SSE] Query: "${query}", Provider: ${provider}, Model: ${thinkingModel}`);

    if (!query || !provider || !thinkingModel || !taskModel || !searchProvider) {
      const missing = [];
      if (!query) missing.push("query");
      if (!provider) missing.push("provider");
      if (!thinkingModel) missing.push("thinkingModel");
      if (!taskModel) missing.push("taskModel");
      if (!searchProvider) missing.push("searchProvider");

      return NextResponse.json(
        { error: `Missing required parameters: ${missing.join(", ")}` },
        { status: 400 }
      );
    }

    let parsedPromptOverrides = {};
    try {
      parsedPromptOverrides = parseDeepResearchPromptOverrides(promptOverrides);
    } catch (error) {
      console.warn(`[${requestId}] [SSE] Invalid prompt overrides:`, error);
      const message = error instanceof Error ? error.message : "Invalid prompt overrides";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      start: async (controller) => {
        console.log(`[${requestId}] [SSE] Stream start`);
        controller.enqueue(
          encoder.encode(
            `event: infor\ndata: ${JSON.stringify({
              name: "deep-research",
              version: "0.1.0",
              requestId,
            })}\n\n`
          )
        );

        const deepResearch = new DeepResearch({
          language,
          AIProvider: {
            baseURL: getAIProviderBaseURL(provider),
            apiKey: multiApiKeyPolling(getAIProviderApiKey(provider)),
            provider,
            thinkingModel,
            taskModel,
          },
          searchProvider: {
            baseURL: getSearchProviderBaseURL(searchProvider),
            apiKey: multiApiKeyPolling(getSearchProviderApiKey(searchProvider)),
            provider: searchProvider,
            maxResult,
          },
          promptOverrides: parsedPromptOverrides,
          onMessage: (event, data) => {
            if (event === "progress") {
              console.log(
                `[${requestId}] [SSE] [Progress] [${data.step}]: ${data.name ? `"${data.name}" ` : ""}${data.status}`
              );
              if (data.step === "final-report" && data.status === "end") {
                console.log(`[${requestId}] [SSE] Research completed`);
                controller.close();
              }
            } else if (event === "error") {
              console.error(`[${requestId}] [SSE] [Error]:`, data);
              controller.close();
            }
            controller.enqueue(
              encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
            );
          },
        });

        req.signal.addEventListener("abort", () => {
          console.log(`[${requestId}] [SSE] Request aborted by client`);
          controller.close();
        });

        try {
          await deepResearch.start(
            query,
            enableCitationImage,
            enableReferences,
            enableFileFormatResource
          );
        } catch (err) {
          console.error(`[${requestId}] [SSE] DeepResearch start failed:`, err);
          throw new Error(err instanceof Error ? err.message : "Unknown error");
        }
        controller.close();
      },
    });

    return new NextResponse(readableStream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error(`[${requestId}] [SSE] Unexpected error:`, error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
