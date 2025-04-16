import {
  StateGraph,
  MessagesAnnotation,
  MemorySaver,
  Annotation,
  AnnotationRoot,
  messagesStateReducer,
} from "@langchain/langgraph";
import { BaseMessage, HumanMessage } from "@langchain/core/messages";
import {
  croAgent,
  playwirghtAgent,
  userAgent,
  routerAgent,
} from "./nodes/nodes";

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

export const SharedAnnotation = Annotation.Root({
  ...StateAnnotation.spec,
  ...extractorAnnotation.spec,
});

import { extractor, router } from "./nodes/nodes";

const workflow = new StateGraph(StateAnnotation)
  .addNode("extract", extractor)
  .addNode("router", routerAgent, {
    input: SharedAnnotation,
    ends: ["SEO", "CRO", "UX"],
  })
  //.addNode("routerAgent", routerAgent, {
  //  ends: ["SEO", "CRO", "UX"],
  //})
  .addNode("SEO", playwirghtAgent)
  .addNode("CRO", croAgent)
  .addNode("UX", userAgent)
  .addEdge("__start__", "extract")
  .addEdge("extract", "router")
  //.addEdge("extract", "router")
  //.addEdge("router", "routerAgent")
  .addEdge("SEO", "__end__")
  .addEdge("CRO", "__end__")
  .addEdge("UX", "__end__")
  .compile();

const checkpointer = new MemorySaver();
//export const graph = workflow.compile({ checkpointer });
const result = await workflow.invoke({
  messages: [
    new HumanMessage(
      "I need some help with conversion optimization fenomenadigital.com",
    ),
  ],
});
//console.log(result);
