import { StateGraph, Annotation } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";

const stateAnnotation = Annotation.Root({
  topic: Annotation<string>,
  joke: Annotation<string>,
  improvedJoke: Annotation<string>,
  finalJoke: Annotation<string>,
});

const model = new ChatOpenAI({
  apiKey: process.env.OPENAI_KEY,
  model: "gpt-3.5-turbo",
});

//define nodes
async function generateJoke(state: typeof stateAnnotation.State) {
  const msg = await model.invoke("write a short joke about {topic}");
  return { joke: msg.content };
}
// define a function to check if joke has punch line
function checkPunch(state: typeof stateAnnotation.State) {
  if (state.joke.includes("?") || state.joke.includes("!")) {
    return "Pass";
  } else {
    return "Fail";
  }
}

//seccond llm call
async function improveJoke(state: typeof stateAnnotation.State) {
  const msg = await model.invoke(`improve the joke "${state.joke}"`);
  return { improvedJoke: msg.content };
}

//create final jode
async function finilizeJoke(state: typeof stateAnnotation.State) {
  const msg = await model.invoke(
    `Add a twist to this joke: ${state.improvedJoke}`,
  );
  return { finalJoke: msg.content };
}

//build workflow
const workflow = new StateGraph(stateAnnotation)
  .addNode("generateJoke", generateJoke)
  .addNode("improveJoke", improveJoke)
  .addNode("finilizeJoke", finilizeJoke)
  .addEdge("__start__", "generateJoke")
  .addConditionalEdges("generateJoke", checkPunch, {
    Pass: "improveJoke",
    Fail: "__end__",
  })
  .addEdge("improveJoke", "finilizeJoke")
  .addEdge("finilizeJoke", "__end__");

export const graph = workflow.compile({
  interruptAfter: [],
  interruptBefore: [],
});
