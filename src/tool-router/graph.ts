import { tool } from "@langchain/core/tools";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { StateGraph, MessagesAnnotation } from "@langchain/langgraph";
import { AIMessage, SystemMessage } from "@langchain/core/messages";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { MemorySaver } from "@langchain/langgraph";

const multiply = tool(
  async ({ a, b }) => {
    return a * b;
  },
  {
    name: "multiply",
    description:
      "Only use when asked to Multiply two numbers, not any other operation",
    schema: z.object({
      a: z.number().min(0).max(100),
      b: z.number().min(0).max(100),
    }),
  },
);

const tools = [multiply];
const toolNode = new ToolNode<typeof MessagesAnnotation.State>(tools);

const model = new ChatOpenAI({
  apiKey: process.env.OPENAI_KEY,
  modelName: "gpt-3.5-turbo",
}).bindTools(tools);

const callModel = async (state: typeof MessagesAnnotation.State) => {
  const systemMessage = new SystemMessage(
    "DO NOT USE Tools That Do not match the operation. REFUSE TO PERFOM ANY OTHER OPERATION OTHER THAN MULTIPLICATION, if asked to PERFOM +,-,/ say you DO NO have the necesary tools and ask for a new question",
  );
  const messagesWithSystem = [systemMessage, ...state.messages];
  const message = model.invoke(messagesWithSystem);
  const res = await message;
  return {
    messages: [res],
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
