import {
  Annotation,
  MessagesAnnotation,
  messagesStateReducer,
  StateGraph,
} from "@langchain/langgraph";
import {
  BaseMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { z } from "zod";
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";

const StateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  translation: Annotation<string>,
  language: Annotation<string>,
});

type State = typeof StateAnnotation.State;
type Update = typeof StateAnnotation.Update;

async function agentNode(state: State): Promise<Update> {
  console.log(state);
  const llm = new ChatOpenAI({
    apiKey: process.env.OPENAI_KEY,
  });

  const { language } = state;
  const prompt = PromptTemplate.fromTemplate(
    `Hi there, please respond with YES but in ${language}`,
  );
  console.log("prompt", prompt);

  const agentResponse = prompt.pipe(llm);
  const response = await agentResponse.invoke({});

  return {
    messages: [response],
    translation: response.content as string,
  };
}

const graph = new StateGraph(StateAnnotation)
  .addNode("agent", agentNode)
  .addEdge("__start__", "agent")
  .addEdge("agent", "__end__")
  .compile();
const res = await graph.invoke({ language: "Dutch" });
console.log(res);
