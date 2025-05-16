import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { Runnable } from "@langchain/core/runnables";
import { StructuredTool, tool } from "@langchain/core/tools";
import { convertToOpenAITool } from "@langchain/core/utils/function_calling";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
const url: string = "https://api.example.com";

const fetchfromApi = tool(
  async ({ url }) => {
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch data");
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.log(error);
    }
  },
  {
    name: "Fetch data from api",
    description: "use to fetch a cat fact",
    schema: z.object({
      url: z.string().describe("the api url"),
    }),
  },
);

const tools = [fetchfromApi];
const toolNode = new ToolNode(tools);
const llm = new ChatOpenAI({
  apiKey: process.env.OPENAI_KEY,
});

async function createAgent({
  llm,
  prompt,
  tools,
}: {
  llm: ChatOpenAI;
  prompt: string;
  tools: StructuredTool[];
}): Promise<Runnable> {
  const toolNames = tools.map((t) => t.name).join(", ");
  const formatedTools = tools.map((t) => convertToOpenAITool(t));
  const pt = ChatPromptTemplate.fromMessages([
    ["system", `you have ${toolNames} please follow ${prompt}`],
    new MessagesPlaceholder("messages"),
  ]);

  return pt.pipe(llm.bind({ tools: formatedTools }));
}
