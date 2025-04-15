import {
  StateGraph,
  MessagesAnnotation,
  MemorySaver,
  Annotation,
} from "@langchain/langgraph";

const extractorAnnotation = Annotation.Root({
  intent: Annotation<string>,
  url: Annotation<string>,
});

import { extractor, router } from "./nodes/nodes";

const workflow = new StateGraph(MessagesAnnotation)
  .addNode("extract", extractor)
  // .addNode("router", router, { input: extractorAnnotation })
  .addEdge("__start__", "extract")
  .addEdge("extract", "__end__");

const checkpointer = new MemorySaver();

export const graph = workflow.compile({ checkpointer });
