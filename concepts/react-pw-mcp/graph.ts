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
  MemorySaver,
  messagesStateReducer,
} from "@langchain/langgraph";
import { config } from "process";

import { createAgent } from "../utils/createAgent";

async function connectToPlaywrightMcpServer({
  serverPathRelative = "./servers/mcp-playwright/dist/index.js",
  clientName = "playwright-client",
  clientVersion = "1.0.0",
  command = "node",
  throwOnLoadError = true,
  prefixToolNameWithServerName = false,
  additionalToolNamePrefix = "",
} = {}) {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));

  // Path to the Playwright MCP server
  const playwrightServerPath = path.join(__dirname, serverPathRelative);

  const client = new Client({
    name: clientName,
    version: clientVersion,
  });

  const transport = new StdioClientTransport({
    command: command,
    args: [playwrightServerPath],
  });

  await client.connect(transport);

  const tools = await loadMcpTools("playwright", client, {
    throwOnLoadError: true,
    prefixToolNameWithServerName,
    additionalToolNamePrefix,
  });

  return tools;
}
const tools = await connectToPlaywrightMcpServer();

export const StateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
});

const model = new ChatOpenAI({
  modelName: "gpt-3.5-turbo",
  apiKey: process.env.OPENAI_KEY,
}).bindTools(tools);

const toolNode = new ToolNode(tools);

export const playwirghtAgent = async (state: typeof StateAnnotation) => {
  console.log("pw agent running");

  const formattedTools = tools.map((tool) => `- ${tool.name}`).join("\n");

  const systemMessageString = `# Web Automation Agent Prompt

  You are a Web Automation Agent with the ability to control a browser using Playwright. You can navigate websites, interact with elements, take screenshots, perform API requests, and generate test scripts.

  ## Available Tools:

  ### Browser Navigation
  - **playwright_navigate**: Navigate to a URL
    - Input: {url, browserType?, width?, height?, timeout?, waitUntil?, headless?}
    - Example: {url: "https://example.com", browserType: "chromium", width: 1280, height: 720}

  ### Web Interactions
  - **playwright_click**: Click an element on the page
    - Input: {selector} (CSS selector)
  - **playwright_fill**: Fill out an input field
    - Input: {selector, value}
  - **playwright_select**: Select from a dropdown menu
    - Input: {selector, value}
  - **playwright_hover**: Hover over an element
    - Input: {selector}
  - **playwright_press_key**: Press a keyboard key
    - Input: {key, selector?}
  - **playwright_iframe_click**: Click an element inside an iframe
    - Input: {iframeSelector, selector}
  - **playwright_drag**: Drag and drop elements
    - Input: {sourceSelector, targetSelector}

  ### Page Information
  - **playwright_screenshot**: Take a screenshot
    - Input: {name, selector?, width?, height?, fullPage?, savePng?}
  - **playwright_get_visible_text**: Get all visible text on the page
  - **playwright_get_visible_html**: Get the HTML content of the page
  - **playwright_console_logs**: Retrieve browser console logs
    - Input: {type?, search?, limit?, clear?}
  - **playwright_save_as_pdf**: Save page as PDF
    - Input: {outputPath, filename?, format?, printBackground?, margin?}

  ### JavaScript Execution
  - **playwright_evaluate**: Run JavaScript in the browser
    - Input: {script}

  ### Browser Control
  - **playwright_close**: Close the browser
  - **playwright_go_back**: Go back in browser history
  - **playwright_go_forward**: Go forward in browser history
  - **playwright_custom_user_agent**: Set a custom user agent
    - Input: {userAgent}

  ### API Requests
  - **playwright_get**: Send GET request
    - Input: {url}
  - **playwright_post**: Send POST request
    - Input: {url, value, token?, headers?}
  - **playwright_put**: Send PUT request
    - Input: {url, value}
  - **playwright_patch**: Send PATCH request
    - Input: {url, value}
  - **playwright_delete**: Send DELETE request
    - Input: {url}
  - **playwright_expect_response**: Start waiting for a response
    - Input: {id, url}
  - **playwright_assert_response**: Wait for and validate response
    - Input: {id, value?}

  ### Code Generation
  - **start_codegen_session**: Begin recording actions for test generation
    - Input: {options: {outputPath, testNamePrefix?, includeComments?}}
  - **end_codegen_session**: End recording and generate test file
    - Input: {sessionId}s
  - **get_codegen_session**: Get info about recording session
    - Input: {sessionId}
  - **clear_codegen_session**: Clear recording without generating test
    - Input: {sessionId}

  I'll help you automate browser tasks efficiently. Please tell me what you'd like to accomplish.`;

  const systemMessage = new SystemMessage(systemMessageString);
  const messagesWithSystem = [systemMessage, ...state["messages"]];
  const message = await model.invoke(messagesWithSystem);
  console.log(messagesWithSystem);

  return {
    messages: [message],
  };
};

const shouldContinue = (state: typeof StateAnnotation.State) => {
  console.log("shouldContinue running");
  const lastMessage = state.messages[state.messages.length - 1] as AIMessage;

  // Check if the last message is an AI message with tool calls

  if (
    lastMessage &&
    // @ts-ignore Object is possibly 'undefined'
    lastMessage.getType() === "ai" &&
    // @ts-ignore Object is possibly 'undefined'
    (lastMessage as AIMessage).tool_calls &&
    // @ts-ignore Object is possibly 'undefined'
    (lastMessage as AIMessage).tool_calls.length > 0
  ) {
    return "tool"; // If there are tool calls, route to the tool node
  }

  return "__start__"; // Otherwise, start a new interaction
};

const workflow = new StateGraph(StateAnnotation)
  .addNode("agent", playwirghtAgent)
  .addNode("tool", toolNode)
  .addConditionalEdges("agent", shouldContinue)
  .addEdge("tool", "agent")
  .addEdge("__start__", "agent");

const checkpointer = new MemorySaver();
export const graph = workflow.compile();
const result = await graph.invoke({
  messages: [new HumanMessage("hello there ")],
});
console.log(result);
