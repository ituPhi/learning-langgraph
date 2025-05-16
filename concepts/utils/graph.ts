import { createAgent } from "./createAgent";
import { StateGraph } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { BaseMessage, HumanMessage } from "@langchain/core/messages";
import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { RunnableConfig } from "@langchain/core/runnables";
import { Annotation } from "@langchain/langgraph";
import { runAgentNode } from "./runAgentNode";

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
export const AgentAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (a, b) => a.concat(b),
    default: () => [],
  }),
  sender: Annotation<string>({
    reducer: (x, y) => y ?? x ?? "user",
    default: () => "user",
  }),
});

async function agentNode(state: typeof AgentAnnotation.State) {
  const llm = new ChatOpenAI({
    apiKey: process.env.OPENAI_KEY,
  });

  const agent = await createAgent({
    llm,
    tools: [multiply],
    systemMessage: "You are a helpful assistant. you can multiply",
  });

  return runAgentNode({
    state: state,
    agent: agent,
    name: "reseach",
  });
}

const testNode = await agentNode({
  messages: [new HumanMessage("what is 2*2")],
  sender: "User",
});
console.log(testNode);

export const workflow = new StateGraph(AgentAnnotation)
  .addNode("agent", agentNode)
  .addEdge("__start__", "agent")
  .addEdge("agent", "__end__")
  .compile();
