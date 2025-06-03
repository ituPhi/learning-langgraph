import { ChatOllama } from "@langchain/ollama";
import { ChatOpenAI } from "@langchain/openai";
import { Runnable } from "@langchain/core/runnables";
import { StructuredToolInterface, tool } from "@langchain/core/tools";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { z } from "zod";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { Command, MessagesAnnotation, StateGraph } from "@langchain/langgraph";
import { HumanMessage } from "@langchain/core/messages";

const add = tool(
  async ({ a, b }) => {
    return String(a + b);
  },
  {
    name: "add",
    description: "this tool is used to add",
    schema: z.object({
      a: z.number(),
      b: z.number(),
    }),
  },
);

const tools = [add];

function createToolNode(tools: StructuredToolInterface[]) {
  const toolNode = new ToolNode(tools);
  return toolNode;
}

const toolNode = createToolNode(tools);

const llm = new ChatOpenAI({
  apiKey: process.env.OPENAI_KEY,
}).bindTools(tools);

async function createAgent({
  llm,
  prompt,
}: {
  llm: Runnable;
  prompt: string;
}): Promise<Runnable> {
  let promptTemplate = ChatPromptTemplate.fromMessages([
    ["system", prompt],
    new MessagesPlaceholder("messages"),
  ]);
  const response = promptTemplate.pipe(llm);
  return response;
}

async function runAgent(
  agent: Runnable,
  state: typeof MessagesAnnotation.State,
): Promise<Command> {
  function shouldContinue(state: typeof MessagesAnnotation.State) {
    const lastMessage = state.messages[state.messages.length - 1];
    if (
      lastMessage &&
      "tool_calls" in lastMessage &&
      Array.isArray(lastMessage.tool_calls) &&
      lastMessage.tool_calls.length > 0
    ) {
      return "tool";
    }
    return "__end__";
  }
  const response = await agent.invoke(state);

  let updatesState = {
    ...state,
    messages: [...state.messages, response],
  };
  return new Command({
    goto: shouldContinue(updatesState),
    update: {
      messages: [response],
    },
  });
}

async function agentNode(state: typeof MessagesAnnotation.State) {
  const agent = await createAgent({ llm, prompt: "you can add numbers" });
  return runAgent(agent, state);
}

const graph = new StateGraph(MessagesAnnotation)
  .addNode("agent", agentNode, { ends: ["tool", "__end__"] })
  .addNode("tool", toolNode)
  .addEdge("__start__", "agent")
  .addEdge("tool", "agent")
  .compile();

const testResponse = await graph.invoke({
  messages: new HumanMessage("add 2 + 6"),
});
console.log(testResponse.messages[testResponse.messages.length - 1].content);
