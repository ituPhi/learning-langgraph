// this is a starting point for agentic rag

import { Annotation, StateGraph } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { tools } from "./tools/tools";
import { z } from "zod";

export const StateAnnotation = Annotation.Root({
  url: Annotation<string>,
  input: Annotation<string>,
  decision: Annotation<string>,
  output: Annotation<string>,
  welcomeMessage: Annotation<string>,
});

async function routerAgent(state: typeof StateAnnotation.State) {
  const url = state.url;
  //console.log("url", url);
  const modelWithRouterSchema = async () => {
    const baseModel = new ChatOpenAI({
      apiKey: process.env.OPENAI_KEY,
      model: "gpt-3.5-turbo",
      temperature: 0,
    });
    const routerSchema = z.object({
      url: z.string().describe("The url the user wants analized"),
      baseMessage: z
        .string()
        .describe("The base message response to the user must include url"),
      step: z
        .enum(["SEO", "CRO", "USER"])
        .describe("The next step in the route process"),
    });

    const modelRouter = baseModel.withStructuredOutput(routerSchema);
    return modelRouter;
  };

  const router = await modelWithRouterSchema();
  const res = await router.invoke([
    {
      role: "system",
      content: `you are an router agent you task is to process the input query and select the next step according to the users need: SEO | CRO | Technical. Respond to the user with a nice message tell him we are processing ${url}`,
      url: state.url,
    },
    {
      role: "user",
      content: state.input,
      url: state.url,
    },
  ]);
  return {
    decision: res.step,
    welcomeMessage: res.baseMessage,
  };
}

async function seoAgent(state: typeof StateAnnotation.State) {}

const workflow = new StateGraph(StateAnnotation)
  .addNode("router", routerAgent)
  .addEdge("__start__", "router")
  .addEdge("router", "__end__");

export const graph = workflow.compile();
// const res = await graph.invoke({
//   input: "i need help with my SEO",
//   url: "i2phi.com",
// });
// console.log(res);
