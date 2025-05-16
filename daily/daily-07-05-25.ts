import { ChatOpenAI } from "@langchain/openai";
import { Runnable } from "@langchain/core/runnables";

import {
  ChatPromptTemplate,
  MessagesPlaceholder,
  PromptTemplate,
} from "@langchain/core/prompts";
import { MessagesAnnotation } from "@langchain/langgraph";

async function CreateAgent({
  llm,
  systemPrompt,
}: {
  llm: ChatOpenAI;
  systemPrompt: string;
}): Promise<Runnable> {
  let prompt = PromptTemplate.fromTemplate(`${systemPrompt}`);
  return prompt.pipe(llm);
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
