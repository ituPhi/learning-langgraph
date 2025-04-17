import { BaseMessage, HumanMessage } from "@langchain/core/messages";
import { Runnable, RunnableConfig } from "@langchain/core/runnables";
import { Annotation } from "@langchain/langgraph";

export async function runAgentNode(props: {
  state: any;
  agent: Runnable;
  name: string;
  config?: RunnableConfig;
}) {
  const { state, agent, name, config } = props;
  let result = await agent.invoke(state, config);
  return {
    messages: [result],
    sender: name,
  };
}
