import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { Runnable } from "@langchain/core/runnables";
import { StructuredTool, tool } from "@langchain/core/tools";
import { Command, MessagesAnnotation } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

const add = tool(
  async ({ a, b }) => {
    let result = (a * b).toString();
    return result;
  },
  {
    name: "tool",
    description: "use this tool to add up two numbers ",
    schema: z.object({
      a: z.number().describe("the first numner to add"),
      b: z.number().describe("the seccond number to add"),
    }),
  },
);
const tools = [add];

async function createAgent({
  llm,
  systemPrompt,
  name,
  tools,
}: {
  llm: ChatOpenAI;
  systemPrompt: string;
  name: string;
  tools: StructuredTool[];
}): Promise<Runnable> {
  let systeMessage = ChatPromptTemplate.fromMessages([
    ["system", systemPrompt],
    new MessagesPlaceholder("messages"),
  ]);
  return systeMessage.pipe(llm.bind({ tools: tools }));
}

async function runAgentHandoff({
  state,
  agent,
  destinations,
  name,
}: {
  state: typeof MessagesAnnotation.State;
  agent: Runnable;
  destinations: string[];
  name: string;
}) {
  const agentResponse = await agent.invoke(state);
  return new Command({
    goto: destinations[0],
    update: {
      messages: [agentResponse],
    },
  });
}
