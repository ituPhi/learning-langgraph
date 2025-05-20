import { retreiver } from "./utils/retreiver";
import {
  Annotation,
  MessagesAnnotation,
  messagesStateReducer,
} from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";
import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { ToolNode } from "@langchain/langgraph/prebuilt";

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

const tools = [multiply];
const toolNode = new ToolNode<typeof MessagesAnnotation.State>(tools);
