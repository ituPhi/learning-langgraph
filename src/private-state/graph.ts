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
});

const sharedAnnotation = Annotation.Root({
  ...StateAnnotation.spec,
  ...urlAnnotation.spec,
});

const getUrl = async (state: typeof urlAnnotation.State) => {
  return {
    url: "www.i2phi.com",
  };
};

const setMessage = async (state: typeof sharedAnnotation.State) => {
  let newAIMsg = new AIMessage(state.url);

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
  messages: [new HumanMessage("hello there")],
});
console.log(res);
