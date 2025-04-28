import { AIMessage, BaseMessage, ToolMessage } from "@langchain/core/messages";
import { PromptTemplate } from "@langchain/core/prompts";
import { Runnable } from "@langchain/core/runnables";
import { StructuredTool, tool } from "@langchain/core/tools";
import { convertToOpenAITool } from "@langchain/core/utils/function_calling";
import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

const fetchFromApi = tool(
  async () => {
    try {
      let response = await fetch("https://catfact.ninja/fact", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch cat feact");
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("failed", error);
    }
  },
  {
    name: "fetchFromApi",
    description: "use this tool to fetch a cat fact from api",
    schema: z.object({}),
  },
);

let tools = [fetchFromApi];
const toolNode = new ToolNode(tools);

async function createAgent({
  llm,
  prompt,
  tools,
}: {
  llm: ChatOpenAI;
  prompt: string;
  tools: StructuredTool[];
}): Promise<Runnable> {
  const formatedTools = tools.map((t) => convertToOpenAITool(t));
  const pt = PromptTemplate.fromTemplate(prompt);
  const data = pt.pipe(llm.bind({ tools: formatedTools }));
  return data;
}

const StateAnnotation = Annotation.Root({
  response: Annotation<object>,
});

async function customToolNode(
  state: typeof StateAnnotation.State,
): Promise<typeof StateAnnotation.Update> {
  const response = state.response as AIMessage;
  const toolCall = response.tool_calls;

  const result = await fetchFromApi.invoke({ toolCall });
  let toolMessage = new ToolMessage({ content: result, id: result.id });

  console.log(toolMessage);
  return {
    response: toolMessage,
  };
}

async function agentNode(
  state: typeof StateAnnotation.State,
): Promise<typeof StateAnnotation.Update> {
  const llm = new ChatOpenAI({
    apiKey: process.env.OPENAI_KEY,
    temperature: 0,
  });

  const agent = createAgent({
    llm: llm,
    tools: tools,
    prompt: "Fetch a cat fact ",
  });

  const result = (await agent).invoke(state);
  return {
    response: await result,
  };
}

async function shouldContinue(state: typeof StateAnnotation.State) {
  let responseObject = state.response as AIMessage;
  console.log(responseObject);
  if ("tool_calls" in responseObject) {
    // console.log(responseObject.tool_calls);
    return "tool";
  }
  return "__end__";
}

let graph = new StateGraph(StateAnnotation)
  .addNode("agent", agentNode)
  .addNode("tool", customToolNode)
  .addEdge(START, "agent")
  .addConditionalEdges("agent", shouldContinue, ["tool", "__end__"])
  .addEdge("tool", "agent")
  .compile()
  .invoke({}, { recursionLimit: 4 });

//const result = await graph.invoke({});

//const a = result.response as AIMessage;
//console.log(a.tool_calls);
