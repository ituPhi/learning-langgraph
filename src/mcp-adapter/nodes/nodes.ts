import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { loadMcpTools } from "@langchain/mcp-adapters";
import path from "path";
import { fileURLToPath } from "url";
import {
  AIMessage,
  SystemMessage,
  HumanMessage,
} from "@langchain/core/messages";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { Command } from "@langchain/langgraph";

import { SharedAnnotation, StateAnnotation } from "../graph";

export const extractor = async (state: typeof SharedAnnotation.State) => {
  console.log("extractor is running");
  const schema = z.object({
    intent: z
      .string()
      .describe(
        "This is what the user wants to do, try to sumarize in two word",
      ),
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
        Extract the URL and the user's INTENT.

        FORMATTING REQUIREMENTS:
        1. ALWAYS return URLs in proper format with the full protocol and domain.
        2. Add "https://" prefix if not explicitly specified.
        3. If a URL is provided without "www." and it's a common website, add it.
        4. Ensure there are no spaces or invalid characters in the URL.
        5. URLs must follow RFC standards and be directly usable in a browser.
        6. Try to categorize intent as "SEO", "CRO" or "UX".

        Examples of correct URL formatting:
        - "google.com" → "https://www.google.com"
        - "facebook.com/page" → "https://www.facebook.com/page"
        - "i2phi.com" → "https://www.i2phi.com"
        - "subdomain.example.com" → "https://subdomain.example.com"

        IMPORTANT: The formatted URL must be in the "url" field of your structured output.
        Return the intent as a brief description of what the user wants to do with the URL.`,
    },
  ]);
  //console.log(result);
  const newAIMessage = new AIMessage(
    `info: {url: ${result.url} , intent:${result.intent}}`,
  );
  return {
    url: result.url,
    intent: result.intent,
  };
};

export const router = async (state: typeof SharedAnnotation) => {
  const message = state["messages"];
  const info = message[message.length - 1].content;
  console.log(info);

  const routerSchema = z.object({
    step: z.enum(["SEO", "CRO", "UX"]).describe(" the next step to router to"),
    url: z.string(),
  });
  const modelRouter = new ChatOpenAI({
    apiKey: process.env.OPENAI_KEY,
    model: "gpt-3.5-turbo",
  }).withStructuredOutput(routerSchema);

  const routerDecision = await modelRouter.invoke([
    {
      role: "system",
      content: `you are a router model select between "SEO", "CRO" and "UX" acconding to this info : ${info}`,
    },
  ]);

  console.log(routerDecision);
  return {
    step: routerDecision.step,
    url: routerDecision.url,
  };
};

export const routerAgent = async (state: typeof SharedAnnotation) => {
  console.log("routerAgent running");
  const url = state["url"];
  const intent = state["intent"];
  console.log("intent:", intent);
  const goto = (intent: string) => {
    if (intent.includes("SEO")) {
      return "SEO";
    } else if (intent.includes("CRO")) {
      return "CRO";
    } else if (intent.includes("UX")) {
      return "UX";
    } else {
      return "SEO";
    }
  };
  let decision = goto(intent);
  console.log("router agent decision:", decision);

  return new Command({
    update: {},
    goto: decision,
  });
};

export const playwirghtAgent = async (state: typeof StateAnnotation) => {
  console.log("PW Agent Running");
  console.log(state);
  const __dirname = path.dirname(fileURLToPath(import.meta.url));

  // Path to the Playwright MCP server
  const playwrightServerPath = path.join(
    __dirname,
    "../../mcp-adapter/servers/mcp-playwright/dist/index.js",
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

  const toolNode = new ToolNode(tools);

  const model = new ChatOpenAI({
    modelName: "gpt-4o",
    apiKey: process.env.OPENAI_KEY,
  }).bindTools(tools);

  const systemMessage = new SystemMessage(
    `You are a web automation assistant that can control browsers using Playwright. You will extract the URL in the input and correct it.
    You can help users automate tasks on websites, fill forms, take screenshots, and extract information. For selectors, prefer simple, robust selectors like IDs (#login-button) or specific attributes ([data-test="submit"]).
    When users ask you to automate a web task, break it down into clear steps and use the appropriate tools for each step.`,
  );

  const userMessage = new HumanMessage(`The URL to process is: ${state.url}`);
  const messagesWithSystem = [systemMessage, userMessage, ...state.messages];
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

export const croAgent = async (state) => {
  const model = new ChatOpenAI({
    modelName: "gpt-4o",
    apiKey: process.env.OPENAI_KEY,
  });

  const systemMessage = new SystemMessage(
    `You are a web automation assistant CRO EXPERT respond short`,
  );

  const messagesWithSystem = [systemMessage, ...state.messages];
  const message = await model.invoke(messagesWithSystem);
  return {
    messages: [message],
  };
};

export const userAgent = async (state: typeof MessagesAnnotation.State) => {
  const model = new ChatOpenAI({
    modelName: "gpt-4o",
    apiKey: process.env.OPENAI_KEY,
  });

  const prompt = new SystemMessage(
    "Yuu are a user experience expert, repond very shortly saying hi",
  );

  const messages = [...state.messages, prompt];
  const response = model.invoke(messages);
  return response;
};
