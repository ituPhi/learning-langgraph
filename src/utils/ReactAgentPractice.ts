import { Annotation, END, StateGraph } from "@langchain/langgraph";
import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";

function search() {
  return "Searching";
}

const searchTool = tool(search, {
  name: "Search",
  description: "Searches the web for information",
  schema: z.object({
    query: z.string(),
  }),
});

const tools = [searchTool];
const toolNode = new ToolNode(tools);

const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (a, b) => a.concat(b),
    default: () => [],
  }),
});

const model = new ChatOpenAI({
  apiKey: process.env.OPENAI_KEY,
  model: "gpt-4o-mini",
}).bindTools(tools);

async function callModel(state: typeof AgentState.State) {
  const response = await model.invoke(state.messages);
  return {
    messages: [response],
  };
}

function shouldContinue(state: typeof AgentState.State): "action" | typeof END {
  const lastMessage = state.messages[state.messages.length - 1];
  if (lastMessage && !(lastMessage as AIMessage).tool_calls?.length) {
    return END;
  }
  return "action";
}

const worlflow = new StateGraph(AgentState)
  .addNode("agent", callModel)
  .addNode("action", toolNode)
  .addConditionalEdges("agent", shouldContinue)
  .addEdge("action", "agent")
  .addEdge("__start__", "agent")
  .compile();

const input = new HumanMessage("Hello Agent, search for i2phi.com online");

const res = await worlflow.invoke({ messages: [input] });
console.log(res);
