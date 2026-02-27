import { useEffect, useState } from "react";
import { useSettingStore } from "@/store/setting";
import {
  GEMINI_BASE_URL,
  OPENROUTER_BASE_URL,
  OPENAI_BASE_URL,
  ANTHROPIC_BASE_URL,
  DEEPSEEK_BASE_URL,
  XAI_BASE_URL,
  MISTRAL_BASE_URL,
  POLLINATIONS_BASE_URL,
  OLLAMA_BASE_URL,
} from "@/constants/urls";
import { multiApiKeyPolling } from "@/utils/model";
import { generateSignature } from "@/utils/signature";
import { completePath } from "@/utils/url";

interface GeminiModel {
  name: string;
  description: string;
  displayName: string;
  inputTokenLimit: number;
  maxTemperature?: number;
  outputTokenLimit: number;
  temperature?: number;
  topK?: number;
  topP?: number;
  supportedGenerationMethods: string[];
  version: string;
}

interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    format?: string;
    family?: string;
    families?: string | null;
    parameter_size?: string;
    quantization_level?: string;
  };
}

interface OpenAIModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

interface MistralModel {
  id: string;
  capabilities: {
    completion_chat: boolean;
  };
}

function useModelList() {
  const [modelList, setModelList] = useState<string[]>([]);
  const provider = useSettingStore((state) => state.provider);

  useEffect(() => {
    setModelList([]);
  }, [provider]);

  async function fetchWithRetry(url: string, options: RequestInit, retries = 2): Promise<Response> {
    try {
      const response = await fetch(url, options);
      if (!response.ok && retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return fetchWithRetry(url, options, retries - 1);
      }
      return response;
    } catch (err) {
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return fetchWithRetry(url, options, retries - 1);
      }
      throw err;
    }
  }

  async function refresh(provider: string): Promise<string[]> {
    try {
      const state = useSettingStore.getState();
      const { accessPassword, mode } = state;
      const password = accessPassword || process.env.NEXT_PUBLIC_ACCESS_PASSWORD || "";
      const accessKey = password ? generateSignature(password, Date.now()) : "";

      let url = "";
      let headers: Record<string, string> = {};

      if (provider === "google") {
        const { apiKey = "", apiProxy } = state;
        if (mode === "local" && !apiKey) return [];
        const key = multiApiKeyPolling(apiKey);
        url = mode === "local"
            ? completePath(apiProxy || GEMINI_BASE_URL, "/v1beta") + "/models"
            : "/api/ai/google/v1beta/models";
        headers = {
          "x-goog-api-key": mode === "local" ? key : accessKey,
        };
      } else if (provider === "openrouter") {
        const { openRouterApiKey = "", openRouterApiProxy } = state;
        if (mode === "local" && !openRouterApiKey) return [];
        const apiKey = multiApiKeyPolling(openRouterApiKey);
        url = mode === "local"
            ? completePath(openRouterApiProxy || OPENROUTER_BASE_URL, "/api/v1") + "/models"
            : "/api/ai/openrouter/v1/models";
        headers = {
          Authorization: `Bearer ${mode === "local" ? apiKey : accessKey}`,
        };
      } else if (provider === "openai") {
        const { openAIApiKey = "", openAIApiProxy } = state;
        if (mode === "local" && !openAIApiKey) return [];
        const apiKey = multiApiKeyPolling(openAIApiKey);
        url = mode === "local"
            ? completePath(openAIApiProxy || OPENAI_BASE_URL, "/v1") + "/models"
            : "/api/ai/openai/v1/models";
        headers = {
          Authorization: `Bearer ${mode === "local" ? apiKey : accessKey}`,
        };
      } else if (provider === "anthropic") {
        const { anthropicApiKey = "", anthropicApiProxy } = state;
        if (mode === "local" && !anthropicApiKey) return [];
        const apiKey = multiApiKeyPolling(anthropicApiKey);
        url = mode === "local"
            ? completePath(anthropicApiProxy || ANTHROPIC_BASE_URL, "/v1") + "/models"
            : "/api/ai/anthropic/v1/models";
        headers = {
          "x-api-key": mode === "local" ? apiKey : accessKey,
          "Anthropic-Version": "2023-06-01",
        };
      } else if (provider === "deepseek") {
        const { deepseekApiKey = "", deepseekApiProxy } = state;
        if (mode === "local" && !deepseekApiKey) return [];
        const apiKey = multiApiKeyPolling(deepseekApiKey);
        url = mode === "local"
            ? completePath(deepseekApiProxy || DEEPSEEK_BASE_URL, "/v1") + "/models"
            : "/api/ai/deepseek/v1/models";
        headers = {
          Authorization: `Bearer ${mode === "local" ? apiKey : accessKey}`,
        };
      } else if (provider === "xai") {
        const { xAIApiKey = "", xAIApiProxy } = state;
        if (mode === "local" && !xAIApiKey) return [];
        const apiKey = multiApiKeyPolling(xAIApiKey);
        url = mode === "local"
            ? completePath(xAIApiProxy || XAI_BASE_URL, "/v1") + "/models"
            : "/api/ai/xai/v1/models";
        headers = {
          Authorization: `Bearer ${mode === "local" ? apiKey : accessKey}`,
        };
      } else if (provider === "mistral") {
        const { mistralApiKey = "", mistralApiProxy } = state;
        if (mode === "local" && !mistralApiKey) return [];
        const apiKey = multiApiKeyPolling(mistralApiKey);
        url = mode === "local"
            ? completePath(mistralApiProxy || MISTRAL_BASE_URL, "/v1") + "/models"
            : "/api/ai/mistral/v1/models";
        headers = {
          Authorization: `Bearer ${mode === "local" ? apiKey : accessKey}`,
        };
      } else if (provider === "openaicompatible") {
        const { openAICompatibleApiKey = "", openAICompatibleApiProxy } = state;
        if (mode === "local" && !openAICompatibleApiKey) return [];
        url = mode === "local"
            ? (openAICompatibleApiProxy ? completePath(openAICompatibleApiProxy, "/v1") + "/models" : "")
            : "/api/ai/openaicompatible/v1/models";
        if (!url) return [];
        const apiKey = multiApiKeyPolling(openAICompatibleApiKey);
        headers = {
          authorization: `Bearer ${mode === "local" ? apiKey : accessKey}`,
        };
      } else if (provider === "pollinations") {
        const { pollinationsApiProxy } = state;
        url = mode === "proxy"
            ? "/api/ai/pollinations/v1/models"
            : completePath(pollinationsApiProxy || POLLINATIONS_BASE_URL, "/v1") + "/models";
        if (mode === "proxy") headers.Authorization = `Bearer ${accessKey}`;
      } else if (provider === "ollama") {
        const { ollamaApiProxy } = state;
        url = mode === "proxy"
            ? "/api/ai/ollama/api/tags"
            : completePath(ollamaApiProxy || OLLAMA_BASE_URL, "/api") + "/tags";
        if (mode === "proxy") headers.Authorization = `Bearer ${accessKey}`;
      }

      if (!url) return [];

      const response = await fetchWithRetry(url, { headers }).catch((err) => {
        console.error(`Fetch error for ${provider} at ${url}:`, err);
        throw err;
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "No error body");
        console.warn(`Fetch failed for ${provider} at ${url} with status ${response.status}: ${text}`);
        return [];
      }

      const rawData = await response.json().catch((err) => {
        console.error(`JSON parse error for ${provider} at ${url}:`, err);
        return null;
      });

      if (!rawData) return [];

      let newModelList: string[] = [];

      if (provider === "google") {
        const models = Array.isArray(rawData.models) ? rawData.models : [];
        newModelList = (models as GeminiModel[])
          .filter(
            (item) =>
              item.name &&
              item.name.startsWith("models/gemini") &&
              Array.isArray(item.supportedGenerationMethods) &&
              item.supportedGenerationMethods.includes("generateContent")
          )
          .map((item) => item.name.replace("models/", ""));
      } else if (provider === "ollama") {
        const models = Array.isArray(rawData.models) ? rawData.models : [];
        newModelList = (models as OllamaModel[]).map((item) => item.name);
      } else if (["openrouter", "openai", "anthropic", "deepseek", "xai", "mistral", "openaicompatible", "pollinations"].includes(provider)) {
        const data = Array.isArray(rawData.data) ? rawData.data : [];
        if (provider === "openai") {
           newModelList = (data as OpenAIModel[])
            .map((item) => item.id)
            .filter((id) => !(id.startsWith("text") || id.startsWith("tts") || id.startsWith("whisper") || id.startsWith("dall-e")));
        } else if (provider === "mistral") {
           newModelList = (data as MistralModel[])
            .filter((item) => item.capabilities?.completion_chat)
            .map((item) => item.id);
        } else if (provider === "pollinations") {
           newModelList = (data as OpenAIModel[])
            .map((item) => item.id)
            .filter((name) => !name.includes("audio"));
        } else if (provider === "xai") {
           newModelList = (data as OpenAIModel[])
            .map((item) => item.id)
            .filter((id) => !id.includes("image"));
        } else {
           newModelList = (data as { id: string }[]).map((item) => item.id);
        }
      }

      setModelList(newModelList);
      return newModelList;
    } catch (e) {
      console.error(`Failed to refresh model list for ${provider}:`, e);
      return [];
    }
  }

  return {
    modelList,
    refresh,
  };
}

export default useModelList;
