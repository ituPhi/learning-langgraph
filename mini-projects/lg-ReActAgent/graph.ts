import { MessagesAnnotation, StateGraph } from "@langchain/langgraph";
import { RunnableConfig } from "@langchain/core/runnables";
import { ensureConfiguration, ConfigurationSchema } from "./configuration";

import { TOOLS } from "./tools";
import { AIMessage } from "@langchain/core/messages";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";

async function callModel(
  state: typeof MessagesAnnotation.State,
  config: RunnableConfig,
): Promise<typeof MessagesAnnotation.Update> {
  const configuration = ensureConfiguration(config);

  const model = new ChatOpenAI({
    apiKey: process.env.OPENAI_KEY,
  }).bindTools(TOOLS);

  const response = await model.invoke([
    {
      role: "system",
      content: configuration.systemPromptTemplate.replace(
        "{system_time}",
        new Date().toISOString(),
      ),
    },
    ...state.messages,
  ]);
  return { messages: [response] };
}

function routeModelOuteput(state: typeof MessagesAnnotation.State): string {
  const messages = state.messages;
  const lastMessage = messages[messages.length - 1];

  if ((lastMessage as AIMessage)?.tool_calls?.length || 0 > 0) {
    return "tools";
  } else {
    return "__end__";
  }
}

const workflow = new StateGraph(MessagesAnnotation, ConfigurationSchema)
  .addNode("callModel", callModel)
  .addNode("tools", new ToolNode(TOOLS))
  .addEdge("__start__", "callModel")
  .addConditionalEdges("callModel", routeModelOuteput)
  .addEdge("tools", "callModel");

export const graph = workflow.compile({
  interruptAfter: [],
  interruptBefore: [],
});

//const res = await graph.invoke({ messages: "What is the weater" });
//console.log(res);
