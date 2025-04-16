import {
  StateGraph,
  MessagesAnnotation,
  MemorySaver,
  Annotation,
  AnnotationRoot,
  messagesStateReducer,
} from "@langchain/langgraph";
import { BaseMessage, HumanMessage } from "@langchain/core/messages";
import { croAgent, userAgent, routerAgent, defaultAgent } from "./nodes/nodes";
import { playwirghtAgentSubG } from "./nodes/react-pw-agent";

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

import { extractor } from "./nodes/nodes";

const workflow = new StateGraph(StateAnnotation)
  .addNode("extract", extractor)
  .addNode("router", routerAgent, {
    input: SharedAnnotation,
    ends: ["SEO", "CRO", "UX"],
  })
  .addNode("SEO", playwirghtAgentSubG, { input: SharedAnnotation })
  .addNode("CRO", croAgent)
  .addNode("UX", userAgent)
  .addNode("default", defaultAgent)
  .addEdge("__start__", "extract")
  .addEdge("extract", "router")
  .addEdge("router", "default")
  .addEdge("default", "__end__")
  .addEdge("SEO", "__end__")
  .addEdge("CRO", "__end__")
  .addEdge("UX", "__end__");
const checkpointer = new MemorySaver();
export const graph = workflow.compile({ checkpointer });

//const result = await workflow.invoke({
//  messages: [new HumanMessage("I need some help with seo fenomenadigital.com")],
//});
//console.log(result);
