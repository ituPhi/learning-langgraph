import {
  Annotation,
  END,
  messagesStateReducer,
  StateGraph,
} from "@langchain/langgraph";
import { BaseMessage, HumanMessage } from "@langchain/core/messages";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";

import { ToolNode } from "@langchain/langgraph/prebuilt";
import { tools } from "./utils/retreiver";
import { ChatOpenAI } from "@langchain/openai";

const StateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
});

const toolNode = new ToolNode<typeof StateAnnotation.State>(tools);

function shouldRetrieve(state: typeof StateAnnotation.State) {
  const { messages } = state;
  const lastMessage = messages[messages.length - 1];
  if (
    "tool_calls" in lastMessage &&
    Array.isArray(lastMessage.tool_calls) &&
    lastMessage.tool_calls.length
  ) {
    console.log("RETREIVE");
    return "retrieve";
  }
  return "__end__";
}
``;
async function agent(
  state: typeof StateAnnotation.State,
): Promise<typeof StateAnnotation.Update> {
  const llm = new ChatOpenAI({
    apiKey: process.env.OPENAI_KEY,
  });
  const init = ChatPromptTemplate.fromMessages([
    [
      "system",
      'you are an information seeker agent your job is to use your tool "retriever" to extract relevant information per the user request ',
    ],
    new MessagesPlaceholder("messages"),
  ]);

  const response = await init
    .pipe(llm.bind({ tools: tools }))
    .invoke({ messages: state.messages });

  return {
    messages: [response],
  };
}

const graph = new StateGraph(StateAnnotation)
  .addNode("agent", agent)
  .addNode("retrieve", toolNode)
  .addEdge("__start__", "agent")
  .addConditionalEdges("agent", shouldRetrieve, ["retrieve", "__end__"])
  .addEdge("retrieve", "agent")
  .compile();

const state = {
  messages: [new HumanMessage("what can you tell me about agents")],
};
const res = await graph.invoke(state, { recursionLimit: 4 });
console.log(res);
