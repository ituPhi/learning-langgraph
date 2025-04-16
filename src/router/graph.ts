import { StateGraph, Annotation } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

const routerSchema = z.object({
  step: z
    .enum(["SEO", "CRO", "USER"])
    .describe("The next step in the route process"),
});

const model = new ChatOpenAI({
  apiKey: process.env.OPENAI_KEY,
  modelName: "gpt-3.5-turbo",
});

// create the router with structured output
const router = model.withStructuredOutput(routerSchema);

// init graph state
const stateAnnotation = Annotation.Root({
  input: Annotation<string>,
  decision: Annotation<string>,
  output: Annotation<string>,
});

// node 01 - write seo report

async function seoExpert(state: typeof stateAnnotation.State) {
  const response = await model.invoke([
    {
      role: "system",
      content:
        "You are a SEO expert, start by saying you are SEO Master; then create a report using dummy data, Be very brief, use the initial use message for context ",
    },
    {
      role: "user",
      content: state.input,
    },
  ]);
  return {
    output: response.content,
  };
}

async function croExpert(state: typeof stateAnnotation.State) {
  const croResponse = await model.invoke([
    {
      role: "system",
      content:
        "You are a CRO expert, use dummy data, we are testing. Be very brief",
    },
    {
      role: "user",
      content: state.input,
    },
  ]);
  return {
    output: croResponse.content,
  };
}

async function userExpert(state: typeof stateAnnotation.State) {
  const userExpertResponse = await model.invoke([
    {
      role: "system",
      content:
        "You are a User Experience expert, use dummy data, we are testing. Be very brief",
    },
    {
      role: "user",
      content: state.input,
    },
  ]);
  return {
    output: userExpertResponse.content,
  };
}

async function routerAgent(state: typeof stateAnnotation.State) {
  const routerAgentDecision = await router.invoke([
    {
      role: "system",
      content:
        "Route to nodeSeoExpert, nodeCroExpert or nodeUserExpert as per the user needs",
    },
    {
      role: "user",
      content: state.input,
    },
  ]);
  return {
    decision: routerAgentDecision.step,
  };
}

function routerDecision(state: typeof stateAnnotation.State) {
  switch (state.decision) {
    case "SEO":
      return "nodeSeoExpert";

    case "CRO":
      return "nodeCroExpert";

    case "USER":
      return "nodeUserExpert";

    default:
      throw new Error("Invalid decision");
  }
}

// build workflow
const workflow = new StateGraph(stateAnnotation)
  .addNode("nodeSeoExpert", seoExpert)
  .addNode("nodeCroExpert", croExpert)
  .addNode("nodeUserExpert", userExpert)
  .addNode("nodeRouterAgent", routerAgent)
  .addEdge("__start__", "nodeRouterAgent")
  .addConditionalEdges("nodeRouterAgent", routerDecision, [
    "nodeSeoExpert",
    "nodeCroExpert",
    "nodeUserExpert",
  ])
  .addEdge("nodeSeoExpert", "__end__")
  .addEdge("nodeCroExpert", "__end__")
  .addEdge("nodeUserExpert", "__end__");

export const graph = workflow.compile({
  interruptBefore: [],
  interruptAfter: [],
});
