import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { Runnable } from "@langchain/core/runnables";
import { StructuredTool, Tool, tool } from "@langchain/core/tools";
import { convertToOpenAITool } from "@langchain/core/utils/function_calling";
import { Annotation, StateGraph } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import { TypeOf, z } from "zod";

const StateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (a, b) => a.concat(b),
  }),
  fact: Annotation<string>,
});

const fetchCatFact = tool(
  async () => {
    try {
      const response = await fetch("https://catfact.ninja/fact", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
      return data;
      if (!response.ok) {
        throw new Error("Failed to fetch data");
      }
    } catch (error) {
      console.error(error);
      throw error;
    }
  },
  {
    name: "fetchCatFact",
    description: "Get a random cat fact from api",
    schema: z.object({}),
  },
);

const tools = [fetchCatFact];
const llm = new ChatOpenAI({
  apiKey: process.env.OPENAI_KEY,
});

async function createAgent({
  llm,
  prompt,
  tools,
}: {
  llm: ChatOpenAI;
  prompt: string;
  tools: StructuredTool[];
}): Promise<Runnable> {
  // extract the tools info to pass it to the agent
  const toolNames = tools.map((t) => t.name).join(", ");
  const formatedTools = tools.map((t) => convertToOpenAITool(t));

  const promptTemplate = ChatPromptTemplate.fromMessages([
    ["system", `${prompt} : Use these tools to do your job: ${toolNames}`],
    new MessagesPlaceholder("messages"),
  ]);

  return promptTemplate.pipe(llm.bind({ tools: formatedTools }));
}
const systemPrompt = "Respond in SPANISH AlWAYS";

async function AgentNode(
  state: typeof StateAnnotation.State,
): Promise<typeof StateAnnotation.Update> {
  console.log("AgentNode called");
  const catFacter = await createAgent({
    llm: llm,
    prompt: systemPrompt,
    tools: tools,
  });
  let result = await catFacter.invoke(state);
  return {
    messages: [result],
    fact: result.content,
  };
}
const toolNode = new ToolNode<typeof StateAnnotation.State>(tools);

async function shouldContinue(state: typeof StateAnnotation.State) {
  const { messages } = state;
  const lastMessage = messages[messages.length - 1];
  if (
    "tool_calls" in lastMessage &&
    Array.isArray(lastMessage.tool_calls) &&
    lastMessage.tool_calls?.length
  ) {
    console.log("Tool Called");
    return "tool";
  }
  console.log("END called");
  return "__end__";
}

export const graph = new StateGraph(StateAnnotation)
  .addNode("getCatFact", AgentNode)
  .addNode("tool", toolNode)
  .addEdge("__start__", "getCatFact")
  .addConditionalEdges("getCatFact", shouldContinue, ["tool", "__end__"])
  .addEdge("tool", "getCatFact")
  .compile();

//const result = await graph.invoke(
//  { messages: [new HumanMessage("Fetch Cat Fact Now")], fact: "" },
//  { recursionLimit: 4 },
//);
//console.log(result);
