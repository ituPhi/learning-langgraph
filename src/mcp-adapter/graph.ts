import {
  StateGraph,
  MessagesAnnotation,
  MemorySaver,
  Annotation,
  AnnotationRoot,
  messagesStateReducer,
} from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";
import { croAgent, playwirghtAgent, userAgent } from "./nodes/nodes";
import { routerAgent } from "./edges/edges";

export const extractorAnnotation = Annotation.Root({
  intent: Annotation<string>,
  url: Annotation<string>,
});

export const routerAnnotation = Annotation.Root({
  step: Annotation<string>,
  url: Annotation<string>,
});

export const StateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
});
import { extractor, router } from "./nodes/nodes";

const workflow = new StateGraph(StateAnnotation)
  .addNode("extract", extractor)
  //.addNode("router", router, { input: routerAnnotation })
  //.addNode("routerAgent", routerAgent, {
  //  ends: ["SEO", "CRO", "UX"],
  //})
  //.addNode("SEO", playwirghtAgent)
  //.addNode("CRO", croAgent)
  //.addNode("UX", userAgent)
  .addEdge("__start__", "extract")
  .addEdge("extract", "__end__");
//.addEdge("extract", "router")
//.addEdge("router", "routerAgent")
//.addEdge("SEO", "__end__")
//.addEdge("CRO", "__end__")
//.addEdge("UX", "__end__");

const checkpointer = new MemorySaver();

export const graph = workflow.compile({ checkpointer });
