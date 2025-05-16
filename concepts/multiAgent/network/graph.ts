import { Command, MessagesAnnotation, StateGraph } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

const model = new ChatOpenAI({
  model: "gpt-4o-mini",
});

const outputSchema = z.object({
  next_agent: z.string().describe("the next agent we should send to"),
  content: z.string(),
});

const agent = async (state: typeof MessagesAnnotation) => {
  const response = await model.withStructuredOutput(outputSchema).invoke([
    {
      role: "system",
      content: "You are a helpful assistant.",
    },
  ]);

  return new Command({
    goto: response.next_agent,
    update: {
      messages: [response.content],
    },
  });
};

const agent2 = async (state: typeof MessagesAnnotation) => {
  const response = await model.withStructuredOutput(outputSchema).invoke([
    {
      role: "system",
      content: "You are a helpful assistant.",
    },
  ]);

  return new Command({
    goto: response.next_agent,
    update: {
      messages: [response.content],
    },
  });
};

const graph = new StateGraph(MessagesAnnotation)
  .addNode("agent", agent, { ends: ["agent2", "__end__"] })
  .addNode("agent2", agent2, { ends: ["agent", "__end__"] })
  .addEdge("__start__", "agent")
  .compile();
