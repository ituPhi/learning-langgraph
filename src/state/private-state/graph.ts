import { Annotation, StateGraph } from "@langchain/langgraph";
import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";

const StateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (a, b) => a.concat(b),
    default: () => [],
  }),
});

const urlAnnotation = Annotation.Root({
  url: Annotation<string>,
  intent: Annotation<string>,
});

const sharedAnnotation = Annotation.Root({
  ...StateAnnotation.spec,
  ...urlAnnotation.spec,
});

const getUrl = async (state: typeof urlAnnotation.State) => {
  return {
    url: "https://www.i2phi.com",
    intent: "User needs SEO",
  };
};

const setMessage = async (state: typeof sharedAnnotation.State) => {
  let newAIMsg = new AIMessage(
    `This is the url you need to use the tools with: ${state.url} and the user wants: ${state.intent}`,
  );

  return {
    messages: [newAIMsg],
  };
};
const workflow = new StateGraph(StateAnnotation)
  .addNode("geturl", getUrl, { input: urlAnnotation })
  .addNode("setMessage", setMessage, { input: sharedAnnotation })
  .addEdge("__start__", "geturl")
  .addEdge("geturl", "setMessage")
  .addEdge("setMessage", "__end__")
  .compile();

const res = await workflow.invoke({
  messages: [new HumanMessage("hello there i need help with SEO with i2phi")],
});
console.log(res);
