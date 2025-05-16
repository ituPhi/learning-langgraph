import { tool } from "@langchain/core/tools";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { z } from "zod";

const multiply = tool(
  async ({ a, b }) => {
    return a * b;
  },
  {
    name: "multiply",
    description: "Multiply two numbers",
    schema: z.object({
      a: z.number().min(0).max(100),
      b: z.number().min(0).max(100),
    }),
  },
);
const tools = [multiply];
const toolNode = new ToolNode(tools);
