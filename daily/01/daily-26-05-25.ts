import { ChatPromptTemplate } from "@langchain/core/prompts";
import { Runnable, RunnableConfig } from "@langchain/core/runnables";
import { StructuredTool } from "@langchain/core/tools";
import { convertToOpenAITool } from "@langchain/core/utils/function_calling";
import { MessagesAnnotation } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";

const config: RunnableConfig = {
  runName: "configurable_run",
};

async function createAgent({
  llm,
  tools,
  systemPrompt,
}: {
  llm: ChatOpenAI;
  tools?: StructuredTool[];
  systemPrompt: string;
}): Promise<Runnable> {
  const toolNames = tools?.map((tool) => tool.name).join(",  ");
  const formatedTool = tools?.map((t) => convertToOpenAITool(t));

  const chatPrompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      `${systemPrompt} : Your tools are: ${toolNames} with the following format ${formatedTool}`,
    ],
  ]);

  return chatPrompt.pipe(llm);
}

async function runAgent(
  state: typeof MessagesAnnotation.State,
  agent: Runnable,
  config?: RunnableConfig,
): Promise<typeof MessagesAnnotation.Update> {
  const result = await agent.invoke(state, config);
  return {
    messages: [result],
  };
}

async function AgentNode(
  state: typeof MessagesAnnotation.State,
): Promise<typeof MessagesAnnotation.Update> {
  const llm = new ChatOpenAI({
    apiKey: process.env.OPENAI_KEY,
  });

  const analist = await createAgent({
    llm: llm,
    systemPrompt: "you are a data analist",
  });
  return runAgent(state, analist, config);
}

const shouldContinue = (state: typeof MessagesAnnotation.State) => {
  const { messages } = state;
  const lastMessage = messages[messages.length - 1];
  if (
    "tool_calls" in lastMessage &&
    Array.isArray(lastMessage.tool_calls) &&
    lastMessage.tool_calls?.length
  ) {
    return "tools";
  }
  return "__end__";
};
