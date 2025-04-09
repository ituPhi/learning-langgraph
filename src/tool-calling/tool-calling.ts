import { tool } from "@langchain/core/tools";
import { ChatOpenAI } from "@langchain/openai";
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
const model = new ChatOpenAI({
  apiKey: process.env.OPENAI_KEY,
  modelName: "gpt-3.5-turbo",
}).bindTools(tools);

const message = model.invoke("what is 2*2");
const res = await message;
console.log(res.tool_calls);
