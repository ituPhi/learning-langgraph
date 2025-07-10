import { tool } from "@langchain/core/tools";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

// create react agent prebuilt testing

const llm = new ChatOpenAI({
  apiKey: process.env.OPENAI_KEY,
  modelName: "gpt-3.5-turbo",
});

const r = await llm.invoke([
  {
    role: "system",
    content:
      "your are responsible for adding https:// to the given website : {website} ",
  },
]);
//console.log(r);

const add = tool(
  async ({ a, b }) => {
    return String(a + b);
  },
  {
    name: "add",
    description: "add two numbers",
    schema: z.object({
      a: z.number(),
      b: z.number(),
    }),
  },
);

const tools = [add];
const r2 = createReactAgent({
  llm: llm,
  tools: tools,
});

const r2Response = await r2.invoke({
  messages: [
    {
      role: "user",
      content: "add 3+4",
    },
  ],
});
console.log(r2Response);
