import {
  BaseMessage,
  HumanMessage,
  ToolMessage,
  ToolMessageFieldsWithToolCallId,
} from "@langchain/core/messages";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { Runnable } from "@langchain/core/runnables";
import { StructuredTool, Tool, tool } from "@langchain/core/tools";
import { MessagesAnnotation } from "@langchain/langgraph";
import { MessagesPlaceholder } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { AIMessage } from "@langchain/langgraph-sdk";

const add = tool(
  async ({ a, b }) => {
    return (a + b).toString();
  },
  {
    name: "add",
    description: "add two numbers",
    schema: z.object({
      a: z.number().describe("first number"),
      b: z.number().describe("second number"),
    }),
  },
);
async function createAgent({
  llm,
  systemPrompt,
  tools,
}: {
  llm: ChatOpenAI;
  systemPrompt: string;
  tools: StructuredTool[];
}): Promise<Runnable> {
  let prompt = ChatPromptTemplate.fromMessages([
    ["system", systemPrompt],
    new MessagesPlaceholder("messages"),
  ]);

  return prompt.pipe(llm.bind({ tools: tools }));
}

async function runAgent(props: { state: any; agent: Runnable }) {
  const { agent, state } = props;
  return {
    messages: [await agent.invoke({ messages: state.messages })],
  };
}

const tools = [add];
async function AgentNode(
  state: typeof MessagesAnnotation.State,
): Promise<typeof MessagesAnnotation.Update> {
  const agent = await createAgent({
    llm: new ChatOpenAI({ apiKey: process.env.OPENAI_KEY }),
    systemPrompt:
      "you must respond in spanish, use add tool to add two numbers",
    tools: tools,
  });
  return runAgent({ state: state, agent: agent });
}

let state: typeof MessagesAnnotation.State = {
  messages: [new HumanMessage("what is 4+2")],
};

const res = await AgentNode(state);
if (res.messages?.[0]) {
  state.messages.push(res.messages[0]);
}
// get last message to check for tool call
const lastMessage = state.messages[state.messages.length - 1];
//get the tool Call from the message
const toolCall = (lastMessage as unknown as AIMessage).tool_calls?.[0];
//console.log(toolCall);

// Execute the tool call to get back a toolMessage
const toolMessage = await add.invoke({
  name: toolCall?.name || "",
  args: toolCall?.args || {},
  id: toolCall?.id || "",
  type: "tool_call",
});
// push the tool message to the message state
state.messages.push(toolMessage);
// execute the llm with the full state [systemPrompt + HumanMessage =>  toolcall + toolMessage]
console.log(state);
const finalResponse = await AgentNode(state);
if (finalResponse.messages?.[0]?.content) {
  console.log(finalResponse.messages[0].content);
}
