import { StateGraph, Annotation, StateSnapshot } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { Graph } from "@langchain/core/runnables/graph";
import { tool } from "@langchain/core/tools";
import { ToolNode } from "@langchain/langgraph/prebuilt";

const OPEN_AI_KEY =
  "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";

const setReservation = tool(
  () => {
    const randomDate = Date.now();
    return randomDate;
  },
  {
    name: "set_reservation",
    description: "Call to pick a date for the reservation",
  },
);

const tools = [setReservation];
const model = new ChatOpenAI({
  apiKey: OPEN_AI_KEY,
  model: "gpt-4o-mini",
}).bindTools(tools);

const GraphAnnotation = Annotation.Root({
  message: Annotation<string>,
  pastMessages: Annotation<string[]>({
    default: () => [],
    reducer: (a, b) => a.concat(b),
  }),
});

const greetingMessage = async () => {
  const parser = new StringOutputParser();
  const prompt = PromptTemplate.fromTemplate(
    "{user} hara una reservacion, ya tu lo conoces, saludalo",
  );
  const chain = prompt.pipe(model).pipe(parser);
  const res = await chain.invoke({ user: "Juan" });
  console.log(res);
  return {
    message: res,
    pastMessages: [],
  };
};

const reserve = (state: typeof GraphAnnotation.State) => {
  const pm = state.message;
  const userName = pm.match(/Juan/)?.[0] ?? "";

  return {
    message: `Ya se quien eres ${userName} he reservado mesa para dos a las 7pm`,
    pastMessages: [state.message],
  };
};

const toolNode = new ToolNode(tools);

const condition = (state: typeof GraphAnnotation.State) => {
  if (state.message.includes("Juan")) {
    return "reserve";
  } else {
    return "__end__";
  }
};

const flow = new StateGraph(GraphAnnotation)
  .addNode("greeting", greetingMessage)
  .addEdge("__start__", "greeting")
  .addConditionalEdges("greeting", condition)
  .addNode("reserve", reserve)
  .addNode("tool", toolNode)

  .addEdge("tool", "__end__");

const runGraph = async (flow: any) => {
  const graph = flow.compile();
  const res = await graph.invoke({});
  return res;
};

const res = await runGraph(flow);
console.log(res.message);
