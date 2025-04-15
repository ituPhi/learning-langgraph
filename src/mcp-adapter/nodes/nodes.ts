import { PromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { loadMcpTools } from "@langchain/mcp-adapters";
import path from "path";
import { fileURLToPath } from "url";
import {
  StateGraph,
  MessagesAnnotation,
  MemorySaver,
  Annotation,
} from "@langchain/langgraph";
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { ToolNode } from "@langchain/langgraph/prebuilt";

export const extractor = async (state: typeof MessagesAnnotation.State) => {
  const schema = z.object({
    intent: z.string().describe("This is what the user wants to do"),
    url: z.string().describe("The user url"),
  });

  const model = new ChatOpenAI({
    apiKey: process.env.OPENAI_KEY,
    model: "gpt-4o",
  }).withStructuredOutput(schema);
  const userMessage = state.messages[0].content;

  const result = await model.invoke([
    {
      role: "system",
      content: `You are an URL extraction specialist with perfect accuracy.
        Given the user message: "${userMessage}"
        Extract the URL and the user's intent.

        FORMATTING REQUIREMENTS:
        1. ALWAYS return URLs in proper format with the full protocol and domain.
        2. Add "https://" prefix if not explicitly specified.
        3. If a URL is provided without "www." and it's a common website, add it.
        4. Ensure there are no spaces or invalid characters in the URL.
        5. URLs must follow RFC standards and be directly usable in a browser.

        Examples of correct URL formatting:
        - "google.com" → "https://www.google.com"
        - "facebook.com/page" → "https://www.facebook.com/page"
        - "i2phi.com" → "https://www.i2phi.com"
        - "subdomain.example.com" → "https://subdomain.example.com"

        IMPORTANT: The formatted URL must be in the "url" field of your structured output.
        Return the intent as a brief description of what the user wants to do with the URL.`,
    },
  ]);

  return { messages: [new AIMessage(result)] };
};

//const r = extractor({
//  messages: [new HumanMessage("I need Seo help with i2phi.com")],
//});
//console.log(await r);

export const router = async (state: typeof MessagesAnnotation.State) => {};

export const playwirghtAgent = async (
  state: typeof MessagesAnnotation.State,
) => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));

  // Path to the Playwright MCP server
  const playwrightServerPath = path.join(
    __dirname,
    "../mcp-adapter/servers/mcp-playwright/dist/index.js",
  );

  const client = new Client({
    name: "playwright-client",
    version: "1.0.0",
  });

  const transport = new StdioClientTransport({
    command: "node",
    args: [playwrightServerPath],
  });

  let tools;

  // Connect to the transport
  await client.connect(transport);

  tools = await loadMcpTools("playwright", client, {
    throwOnLoadError: true,
    prefixToolNameWithServerName: false,
    additionalToolNamePrefix: "",
  });

  const toolNode = new ToolNode<typeof MessagesAnnotation.State>(tools);

  const model = new ChatOpenAI({
    modelName: "gpt-4o",
    apiKey: process.env.OPENAI_KEY,
  }).bindTools(tools);

  const systemMessage = new SystemMessage(
    `You are a web automation assistant that can control browsers using Playwright you will extract the url in the input and correct it!!.
    You can help users automate tasks on websites, fill forms, take screenshots, and extract information. For selectors, prefer simple, robust selectors like IDs (#login-button) or specific attributes ([data-test="submit"]).
         When users ask you to automate a web task, break it down into clear steps and use the appropriate tools for each step.`,
  );
  const messagesWithSystem = [systemMessage, ...state.messages];
  const message = await model.invoke(messagesWithSystem);
  return {
    messages: [message],
  };
  process.on("beforeExit", async () => {
    if (client) {
      await client.close();
    }
  });
};
