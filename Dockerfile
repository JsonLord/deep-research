FROM node:20-slim

ARG ACCESS_PASSWORD
ARG SEARXNG_API_BASE_URL
ARG MCP_SEARCH_PROVIDER
ARG MCP_AI_PROVIDER
ARG TAVILY_API_KEY
ARG OPENAI_COMPATIBLE_API_BASE_URL
ARG OPENAI_COMPATIBLE_API_KEY

RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm

WORKDIR /app
COPY . .

RUN pnpm install
RUN bash setenv.sh

RUN pnpm build

EXPOSE 3000

CMD ["pnpm", "start"]
