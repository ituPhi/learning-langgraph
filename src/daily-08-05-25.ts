import { ChatOpenAI } from "@langchain/openai";
import { Runnable } from "@langchain/core/runnables";
import { MessagesPlaceholder, PromptTemplate } from "@langchain/core/prompts";
import { MessagesAnnotation } from "@langchain/langgraph";
import { HumanMessage } from "@langchain/core/messages";

async function createAgent({
  llm,
  systemPrompt,
}: {
  llm: ChatOpenAI;
  systemPrompt: string;
}): Promise<Runnable> {
  let p = systemPrompt;
  let pt = PromptTemplate.fromTemplate(p);
  return pt.pipe(llm);
}
async function runAgent(props: {
  agent: Runnable;
  state: typeof MessagesAnnotation.State;
}) {
  const { agent, state } = props;
  return {
    messages: [await agent.invoke(state)],
  };
}

async function agentNode(
  state: typeof MessagesAnnotation.State,
): Promise<typeof MessagesAnnotation.Update> {
  const llm = new ChatOpenAI({ apiKey: process.env.OPENAI_KEY });
  const agent = await createAgent({
    llm: llm,
    systemPrompt: "respond is spanish please",
  });

  return runAgent({ state: state, agent: agent });
}

const state = {
  messages: [new HumanMessage("Hello there how are you")],
};

const res = await agentNode(state);
console.log(res);
