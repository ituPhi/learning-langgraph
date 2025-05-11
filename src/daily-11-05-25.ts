import { PromptTemplate } from "@langchain/core/prompts";
import { Runnable } from "@langchain/core/runnables";
import { StructuredTool, tool } from "@langchain/core/tools";
import { Command } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

const add = tool(
  ({ a, b }) => {
    return a + b;
  },
  {
    name: "add",
    description: "use to add two numbers",
    schema: z.object({
      a: z.number().describe("first number to add"),
      b: z.number().describe("seccond number to add"),
    }),
  },
);

const tools = [add];

async function createAgent({
  llm,
  name,
  systemPrompt,
  tools,
}: {
  llm: ChatOpenAI;
  systemPrompt: string;
  tools: StructuredTool[];
  name: string;
}): Promise<Runnable> {
  const prompt = PromptTemplate.fromTemplate(systemPrompt);
  return prompt.pipe(llm.bind({ tools }));
}

async function runAgent(props: {
  state: any;
  agent: Runnable;
  destinations: string[];
  name: string;
}) {
  const { agent, state, destinations, name } = props;
  const agentResponse = await agent.invoke(state);
  return new Command({
    goto: destinations[0],
    update: {
      messages: [agentResponse],
    },
  });
}

async function AgentNode(state: any) {
  const agent = await createAgent({
    name: "analizer",
    llm: new ChatOpenAI({ apiKey: process.env.OPENAI_KEY }),
    systemPrompt: " Respond Always in Spanish",
    tools: tools,
  });

  return runAgent({
    agent: agent,
    state: state,
    destinations: ["editor"],
    name: agent.name as string,
  });
}

const response = await AgentNode({});
console.log(response);
