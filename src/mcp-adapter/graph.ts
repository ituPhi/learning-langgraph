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

const mathServerPath = path.join(
  __dirname,
  "../mcp-adapter/servers/math-mcp/build/index.js",
);

const client = new Client({
  name: "math-client",
  version: "1.0.0",
});

const transport = new StdioClientTransport({
  command: "node",
  args: [mathServerPath],
});

let tools;

// Connect to the transport
await client.connect(transport);

tools = await loadMcpTools("math", client, {
  throwOnLoadError: true,
  prefixToolNameWithServerName: false,
  additionalToolNamePrefix: "",
});

const toolNode = new ToolNode<typeof MessagesAnnotation.State>(tools);

const model = new ChatOpenAI({
  modelName: "gpt-4",
  apiKey: process.env.OPENAI_KEY,
}).bindTools(tools);

const callModel = async (state: typeof MessagesAnnotation.State) => {
  const systemMessage = new SystemMessage(
    `You are a helpful assistant that can solve mathematical problems using specialized tools. These tools allow you to perform various arithmetic and statistical operations with precision.

    AVAILABLE MATH TOOLS:

    1. ARITHMETIC OPERATIONS:
       - add({firstNumber: number, secondNumber: number}): Adds two numbers together
         Example: add({firstNumber: 5, secondNumber: 3}) → 8

       - subtract({minuend: number, subtrahend: number}): Subtracts the second number from the first
         Example: subtract({minuend: 10, subtrahend: 4}) → 6

       - multiply({firstNumber: number, secondNumber: number}): Multiplies two numbers together
         Example: multiply({firstNumber: 3, secondNumber: 4}) → 12

       - division({numerator: number, denominator: number}): Divides the first number by the second
         Example: division({numerator: 10, denominator: 2}) → 5

       - sum({numbers: [number, number, ...]}): Adds any number of numbers together
         Example: sum({numbers: [1, 2, 3, 4]}) → 10

    2. ROUNDING OPERATIONS:
       - floor({number: number}): Rounds a number down to the nearest integer
         Example: floor({number: 4.7}) → 4

       - ceiling({number: number}): Rounds a number up to the nearest integer
         Example: ceiling({number: 4.2}) → 5

       - round({number: number}): Rounds a number to the nearest integer
         Example: round({number: 4.5}) → 5

    3. STATISTICAL OPERATIONS:
       - mean({numbers: [number, number, ...]}): Calculates the arithmetic mean (average)
         Example: mean({numbers: [2, 4, 6, 8]}) → 5

       - median({numbers: [number, number, ...]}): Calculates the median value
         Example: median({numbers: [1, 3, 5, 7]}) → 4

       - mode({numbers: [number, number, ...]}): Finds the most frequently occurring number(s)
         Example: mode({numbers: [1, 2, 2, 3, 3, 3]}) → "Entries (3) appeared 3 times"

       - min({numbers: [number, number, ...]}): Finds the minimum value
         Example: min({numbers: [5, 3, 8, 2]}) → 2

       - max({numbers: [number, number, ...]}): Finds the maximum value
         Example: max({numbers: [5, 3, 8, 2]}) → 8

    USAGE GUIDELINES:
    1. ALWAYS use the exact parameter names specified for each tool
    2. For array inputs, provide the numbers in square brackets format
    3. Choose the most appropriate tool for each calculation
    4. If a complex calculation requires multiple steps, break it down and use multiple tools in sequence
    5. Show your work by explaining which tools you're using and why

    When users ask math questions, analyze what they're asking for and select the proper tool with the correct parameter names to solve their problem.`,
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
