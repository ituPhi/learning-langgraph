import { MessagesAnnotation, StateGraph } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { Runnable } from "@langchain/core/runnables";
import { HumanMessage } from "@langchain/core/messages";

async function createAgent({
  llm,
  systemPrompt,
}: {
  llm: ChatOpenAI;
  systemPrompt: string;
}): Promise<Runnable> {
  let prompt = ChatPromptTemplate.fromMessages([
    ["system", "these are your instructions : {instructions}"],
    new MessagesPlaceholder("messages"),
  ]);
  prompt = await prompt.partial({ instructions: systemPrompt });
  return prompt.pipe(llm);
}

async function runAgent(props: {
  state: typeof MessagesAnnotation.State;
  agent: Runnable;
  name: string;
}) {
  const { agent, name, state } = props;
  let result = await agent.invoke(state);

  return {
    messages: [result],
    name: name,
  };
}

const llm = new ChatOpenAI({
  apiKey: process.env.OPENAI_KEY,
});

async function agentNode(state: typeof MessagesAnnotation.State) {
  const researcher = await createAgent({
    llm: llm,
    systemPrompt: "Respond in Spanish",
  });

  return runAgent({
    state: state,
    name: "researcher",
    agent: researcher,
  });
}

const workflow = new StateGraph(MessagesAnnotation)
  .addNode("researcher", agentNode)
  .addEdge("__start__", "researcher")
  .addEdge("researcher", "__end__")
  .compile();

const test = async () => {
  const response = await workflow.invoke({
    messages: [new HumanMessage("Hi how are you today?")],
  });
  return response;
};

const res = await test();
console.log(res);
