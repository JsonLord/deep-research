import { NextResponse, type NextRequest } from "next/server";
import DeepResearch from "@/utils/deep-research";
import { multiApiKeyPolling } from "@/utils/model";
import { parseDeepResearchPromptOverrides } from "@/constants/prompts";
import {
  getAIProviderBaseURL,
  getAIProviderApiKey,
  getSearchProviderBaseURL,
  getSearchProviderApiKey,
} from "../../utils";

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

export async function GET(req: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[SSE-LIVE][${requestId}] Start GET request`);

  function getValueFromSearchParams(key: string) {
    return req.nextUrl.searchParams.get(key);
  }
  const query = getValueFromSearchParams("query") || "";
  const provider = getValueFromSearchParams("provider") || "";
  const thinkingModel = getValueFromSearchParams("thinkingModel") || "";
  const taskModel = getValueFromSearchParams("taskModel") || "";
  const searchProvider = getValueFromSearchParams("searchProvider") || "";
  const language = getValueFromSearchParams("language") || "";
  const maxResult = Number(getValueFromSearchParams("maxResult")) || 5;
  const enableCitationImage =
    getValueFromSearchParams("enableCitationImage") !== "false";
  const enableReferences =
    getValueFromSearchParams("enableReferences") !== "false";
  const enableFileFormatResource =
    getValueFromSearchParams("enableFileFormatResource") === "true";
  let promptOverrides = {};
  try {
    promptOverrides = parseDeepResearchPromptOverrides(
      getValueFromSearchParams("promptOverrides") || ""
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid prompt overrides";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  console.log(`[SSE-LIVE][${requestId}] Query: ${query}, Provider: ${provider}, TaskModel: ${taskModel}, Search: ${searchProvider}`);

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

  const encoder = new TextEncoder();
  const readableStream = new ReadableStream({
    start: async (controller) => {
      console.log(`[SSE-LIVE][${requestId}] Stream started`);
      controller.enqueue(
        encoder.encode(
          `event: infor\ndata: ${JSON.stringify({
            name: "deep-research",
            version: "0.1.0",
          })}\n\n`
        )
      );

      req.signal.addEventListener("abort", () => {
        console.log(`[SSE-LIVE][${requestId}] Stream aborted by client`);
      });

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
        promptOverrides,
        onMessage: (event, data) => {
          if (event === "progress") {
            console.log(
              `[SSE-LIVE][${requestId}][${data.step}]: ${data.name ? `"${data.name}" ` : ""}${
                data.status
              }`
            );
            if (data.step === "final-report" && data.status === "end") {
              console.log(`[SSE-LIVE][${requestId}] Research completed successfully`);
              controller.close();
            }
          } else if (event === "error") {
            console.error(`[SSE-LIVE][${requestId}] Error:`, data);
            controller.close();
          }
          controller.enqueue(
            encoder.encode(
              `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
            )
          );
        },
      });

      req.signal.addEventListener("abort", () => {
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
        console.error(`[SSE-LIVE][${requestId}] Research error:`, err);
        throw new Error(err instanceof Error ? err.message : "Unknown error");
      }
      console.log(`[SSE-LIVE][${requestId}] Stream closing normally`);
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
}
