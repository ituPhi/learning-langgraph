import { ChatOpenAI } from "@langchain/openai";
import { MessagesAnnotation } from "@langchain/langgraph";
import { HumanMessage } from "@langchain/core/messages";
import { z } from "zod";
const llm = new ChatOpenAI({
  apiKey: process.env.OPENAI_KEY,
  model: "gpt-4o-mini",
  temperature: 0.7,
});

async function createAgent(state: typeof MessagesAnnotation.State) {
  const destinations = ["__end__", "draft"];
  const responseSchema = z.object({
    response: z
      .string()
      .min(1)
      .max(100)
      .describe("The response from the agent"),
    goto: z.string().min(1).max(100).describe("The next agent to call"),
  });

  const messages = [
    {
      role: "system",
      content:
        "You are a helpful assistant. Call 'draft' agent to draft a post ",
    },
    ...state.messages,
  ];

  const response = await llm
    .withStructuredOutput(responseSchema, { name: "agent" })
    .invoke(messages);

  return response;
}

const state: typeof MessagesAnnotation.State = {
  messages: [new HumanMessage("respond in spanish please")],
};

const test = await createAgent(state);
console.log(test);
