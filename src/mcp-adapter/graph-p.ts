import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { ChatOpenAI } from "@langchain/openai";
import { loadMcpTools } from "@langchain/mcp-adapters";
import path from "path";
import { fileURLToPath } from "url";
import {
  StateGraph,
  MessagesAnnotation,
  MemorySaver,
} from "@langchain/langgraph";
import { AIMessage, SystemMessage } from "@langchain/core/messages";
import { ToolNode } from "@langchain/langgraph/prebuilt";

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
  modelName: "gpt-3.5-turbo",
  apiKey: process.env.OPENAI_KEY,
}).bindTools(tools);

const callModel = async (state: typeof MessagesAnnotation.State) => {
  const systemMessage = new SystemMessage(
        `You are a web automation assistant that can control browsers using Playwright. You can help users automate tasks on websites, fill forms, take screenshots, and extract information.

         You have access to these Playwright automation tools:

         1. BROWSER CONTROL:
            - playwright_navigate({url: string}): Navigate to a URL. The url parameter MUST be a complete URL including the protocol (e.g., "https://example.com").
            - playwright_close(): Closes the current browser instance
            - playwright_get_visible_html(): Gets the HTML content of the current page
            - playwright_get_visible_text(): Gets the visible text content of the current page
            - playwright_custom_user_agent({userAgent: string}): Set a custom User Agent

         2. PAGE INTERACTION:
            - playwright_click({selector: string}): Clicks on an element identified by the selector
            - playwright_iframe_click({iframeSelector: string, selector: string}): Clicks on an element inside an iframe
            - playwright_fill({selector: string, value: string}): Fills a form field with text
            - playwright_select({selector: string, value: string}): Selects an option from a dropdown
            - playwright_hover({selector: string}): Hovers over an element
            - playwright_press_key({key: string, selector?: string}): Presses a keyboard key
            - playwright_drag({sourceSelector: string, targetSelector: string}): Drags an element to a target

         3. INFORMATION EXTRACTION:
            - playwright_screenshot({name: string, selector?: string, fullPage?: boolean, savePng?: boolean}): Takes a screenshot
            - playwright_evaluate({script: string}): Execute JavaScript in the browser console
            - playwright_console_logs({type?: string, search?: string, limit?: number}): Retrieve console logs
            - playwright_save_as_pdf({outputPath: string, filename?: string}): Save page as PDF

         4. NAVIGATION:
            - playwright_go_back(): Navigates back in browser history
            - playwright_go_forward(): Navigates forward in browser history

         5. HTTP REQUESTS:
            - playwright_get({url: string}): Perform HTTP GET request
            - playwright_post({url: string, value: string, token?: string, headers?: object}): Perform HTTP POST
            - playwright_put({url: string, value: string}): Perform HTTP PUT
            - playwright_patch({url: string, value: string}): Perform HTTP PATCH
            - playwright_delete({url: string}): Perform HTTP DELETE
            - playwright_expect_response({id: string, url: string}): Start waiting for an HTTP response
            - playwright_assert_response({id: string, value?: string}): Validate a response

         6. CODE GENERATION:
            - start_codegen_session({options: {outputPath: string, testNamePrefix?: string, includeComments?: boolean}}): Start code generation
            - end_codegen_session({sessionId: string}): End code generation session and generate test file
            - get_codegen_session({sessionId: string}): Get information about a code generation session
            - clear_codegen_session({sessionId: string}): Clear a code generation session

         IMPORTANT USAGE INSTRUCTIONS:

         1. For navigating to a website, you MUST use:
            playwright_navigate({url: "https://example.com"})

         2. The "url" property is REQUIRED and must be a STRING with the complete URL:
            CORRECT: playwright_navigate({url: "https://google.com"})
            INCORRECT: playwright_navigate()
            INCORRECT: playwright_navigate({})
            INCORRECT: playwright_navigate(url: "https://google.com")
            INCORRECT: playwright_navigate("https://google.com")

         3. Always follow this workflow:
            - First navigate to a website with playwright_navigate({url: "https://example.com"})
            - Perform actions on the page
            - Always close the browser when finished with playwright_close()

         4. When users specify a website:
            - Always add "https://" prefix if not provided
            - Example: If user says "go to google.com", use playwright_navigate({url: "https://google.com"})

         For selectors, prefer simple, robust selectors like IDs (#login-button) or specific attributes ([data-test="submit"]).

         When users ask you to automate a web task, break it down into clear steps and use the appropriate tools for each step.`,
      );
  const messagesWithSystem = [systemMessage, ...state.messages];
  const message = await model.invoke(messagesWithSystem);
  return {
    messages: [message],
  };
};

const shouldContinue = (state: typeof MessagesAnnotation.State) => {
  const lastMessage = state.messages[state.messages.length - 1];
  if (lastMessage && !(lastMessage as AIMessage).tool_calls?.length) {
    return "__start__";
  }
  return "toolNode";
};

const workflow = new StateGraph(MessagesAnnotation)
  .addNode("action", callModel)
  .addNode("toolNode", toolNode)
  .addConditionalEdges("action", shouldContinue)
  .addEdge("toolNode", "action")
  .addEdge("__start__", "action");

const checkpointer = new MemorySaver();

export const graph = workflow.compile({ checkpointer });

process.on("beforeExit", async () => {
  if (client) {
    await client.close();
  }
});
