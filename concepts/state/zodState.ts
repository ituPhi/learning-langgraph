import { z } from "zod";
import "@langchain/langgraph/zod";
import { StateGraph } from "@langchain/langgraph";

const AgentState = z.object({
  messages: z
    .array(z.string())
    .default(() => [])
    .langgraph.reducer(
      (a, b) => a.concat(Array.isArray(b) ? b : [b]),
      z.union([z.string(), z.array(z.string())]),
    ),
  question: z.string(),
  answer: z.string(),
});

const workflow = new StateGraph(AgentState);
