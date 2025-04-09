// this is a starting point for agentic rag

import {
  Annotation,
  MessagesAnnotation,
  StateGraph,
} from "@langchain/langgraph";
import { routerAgent, seoAgent, croAgent } from "./nodes/nodes";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { getWebsiteContext } from "./tools/tools";

export const StateAnnotation = Annotation.Root({
  url: Annotation<string>,
  input: Annotation<string>,
  decision: Annotation<string>,
  output: Annotation<string>,
  welcomeMessage: Annotation<string>,
});

function routerDecision(state: typeof StateAnnotation.State) {
  switch (state.decision) {
    case "SEO":
      return "seo";
    case "CRO":
      return "cro";
    default:
      throw new Error("Invalid decision");
  }
}

const workflow = new StateGraph(StateAnnotation)
  .addNode("router", routerAgent)
  .addNode("seo", seoAgent)
  .addNode("cro", croAgent)
  .addEdge("__start__", "router")
  .addConditionalEdges("router", routerDecision, ["seo", "cro"])
  .addEdge("seo", "__end__")
  .addEdge("cro", "__end__");

export const graph = workflow.compile();
//const res = await graph.invoke({
//  input: "i need help with my SEO",
//  url: "https://www.i2phi.com",
//});
//console.log(res);
