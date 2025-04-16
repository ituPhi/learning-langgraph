import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { loadMcpTools } from "@langchain/mcp-adapters";
import path from "path";
import { fileURLToPath } from "url";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import {
  AIMessage,
  SystemMessage,
  HumanMessage,
  BaseMessage,
} from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import {
  StateGraph,
  Annotation,
  messagesStateReducer,
} from "@langchain/langgraph";
import { config } from "process";

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

await client.connect(transport);
tools = await loadMcpTools("playwright", client, {
  throwOnLoadError: true,
  prefixToolNameWithServerName: false,
  additionalToolNamePrefix: "",
});

const toolNode = new ToolNode(tools);

export const extractorAnnotation = Annotation.Root({
  intent: Annotation<string>,
  url: Annotation<string>,
});
export const StateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
});
export const SharedAnnotation = Annotation.Root({
  ...StateAnnotation.spec,
  ...extractorAnnotation.spec,
});

export const playwirghtAgent = async (state: typeof SharedAnnotation) => {
  console.log("PW Agent Running");
  const intent = state["intent"];
  const url = state["url"];
  console.log(url);

  const getMessages = state["messages"];
  const lastAgentInstructions = getMessages[getMessages.length - 1].content;

  const model = new ChatOpenAI({
    modelName: "gpt-4o",
    apiKey: process.env.OPENAI_KEY,
  });

  const systemMessage = new SystemMessage(
    `You are a web automation assistant that can control browsers using Playwright. Introduce yourself and reply by saying ready to work on the url: ${url} DO NOT MODIFY THR URL KEEP AS IS  `,
  );
  const temp = `You can help users automate tasks on websites, fill forms, take screenshots, and extract information. For selectors, prefer simple, robust selectors like IDs (#login-button) or specific attributes ([data-test="submit"]).
When users ask you to automate a web task, break it down into clear steps and use the appropriate tools for each step.`;

  const userMessage = new HumanMessage(`${lastAgentInstructions}`);
  const messagesWithSystem = [systemMessage, userMessage];
  const message = await model.invoke(messagesWithSystem);
  console.log(message);
  process.on("beforeExit", async () => {
    if (client) {
      await client.close();
    }
  });

  return {
    messages: [message],
  };
};

export const playwirghtAgentSubG = new StateGraph(SharedAnnotation)
  .addNode("agent", playwirghtAgent)
  .addEdge("__start__", "agent")
  .compile();
