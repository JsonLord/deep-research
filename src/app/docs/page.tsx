import fs from "fs";
import path from "path";
import Header from "@/components/Internal/Header";
import ReactMarkdown from "react-markdown";

export default async function DocsPage() {
  // Read the markdown file at build time / server-side
  const filePath = path.join(process.cwd(), "docs", "deep-research-api-doc.md");
  let content = "";
  try {
    content = fs.readFileSync(filePath, "utf8");

    // Let's also append the GET /api/sse/live documentation from README if we can,
    // or just hardcode it here since it's short and crucial for the user.
    const additionalDocs = `
## Live Viewing via GET Request

You can watch the whole process of deep research directly through the URL just like watching a video.

Endpoint: \`/api/sse/live\`

Method: \`GET\`

You can access the deep research report via the following link:

\`\`\`text
https://harvesthealth-deep-research.hf.space/api/sse/live?query=AI+trends+for+this+year&provider=pollinations&thinkingModel=openai&taskModel=openai-fast&searchProvider=searxng
\`\`\`

**Query Params:**

- \`query\`: Research topic (required)
- \`provider\`: AI provider (e.g., \`openaicompatible\`, \`pollinations\`, \`openai\`)
- \`thinkingModel\`: Model ID for planning
- \`taskModel\`: Model ID for search and writing
- \`searchProvider\`: Search engine (e.g., \`searxng\`, \`tavily\`)
- \`language\`: Response language (optional)
- \`maxResult\`: Number of search results (optional)
- \`password\`: Required if \`ACCESS_PASSWORD\` is set on the server
`;
    content += "\n\n" + additionalDocs;
  } catch {
    content = "# Error\nCould not load documentation.";
  }

  return (
    <div className="max-lg:max-w-screen-md max-w-screen-lg mx-auto px-4">
      <Header />
      <main className="p-4 border rounded-md mt-4 print:border-none prose prose-slate dark:prose-invert max-w-none">
        <ReactMarkdown>{content}</ReactMarkdown>
      </main>
      <footer className="my-4 text-center text-sm text-gray-600 print:hidden">
        <a href="https://github.com/u14app/" target="_blank">
          &copy; {new Date().getFullYear()} U14App
        </a>
      </footer>
    </div>
  );
}
