import { StateGraph, Annotation } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";

const stateAnnotation = Annotation.Root({
  seoReport: Annotation<string>,
  croReport: Annotation<string>,
  userReport: Annotation<string>,
  combinedReport: Annotation<string>,
});
const model = new ChatOpenAI({
  apiKey: process.env.OPENAI_KEY,
  model: "gpt-3.5-turbo",
  temperature: 0,
});

async function seoReportInit(state: typeof stateAnnotation.State) {
  const seoReportMsg = await model.invoke([
    {
      role: "system",
      content: "You are a SEO expert. Respond in a very short format",
    },
    {
      role: "user",
      content: "Write a short SEO report about a fake website",
    },
  ]);
  return {
    seoReport: seoReportMsg.content,
  };
}

async function croReportInit(state: typeof stateAnnotation.State) {
  const croReportMsg = await model.invoke(
    "Write a short dummy  CRO report about a fake website, very short",
  );
  return {
    croReport: croReportMsg.content,
  };
}

async function userReportInit(state: typeof stateAnnotation.State) {
  const userReportMsg = await model.invoke(
    "Write a short dummy user report about a fake website, make it short",
  );
  return {
    userReport: userReportMsg.content,
  };
}

async function combinator(state: typeof stateAnnotation.State) {
  const { seoReport, croReport, userReport } = state;
  const combinedReportMsg = await model.invoke(
    `Combine the SEO report, CRO report, and user report into a single report. SEO report: ${seoReport}, CRO report: ${croReport}, user report: ${userReport}`,
  );
  return {
    combinedReport: combinedReportMsg.content,
  };
}

const workflow = new StateGraph(stateAnnotation)
  .addNode("seoReportInit", seoReportInit)
  .addNode("croReportInit", croReportInit)
  .addNode("userReportInit", userReportInit)
  .addNode("combinator", combinator)
  .addEdge("__start__", "seoReportInit")
  .addEdge("__start__", "croReportInit")
  .addEdge("__start__", "userReportInit")

  .addEdge("seoReportInit", "combinator")
  .addEdge("croReportInit", "combinator")
  .addEdge("userReportInit", "combinator")
  .addEdge("combinator", "__end__");

export const graph = workflow.compile({
  interruptBefore: [],
  interruptAfter: [],
});
