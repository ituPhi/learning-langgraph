import { Annotation, Command, MessagesAnnotation } from "@langchain/langgraph";
import { BaseMessage, HumanMessage } from "@langchain/core/messages";
import { StructuredTool, tool } from "@langchain/core/tools";
import { z } from "zod";
import { ChatOpenAI } from "@langchain/openai";
import { convertToOpenAITool } from "@langchain/core/utils/function_calling";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { Runnable } from "@langchain/core/runnables";
import { ToolNode } from "@langchain/langgraph/prebuilt";

const StateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (a, b) => a.concat(b),
  }),
  fact: Annotation<string>,
});

async function createAgent({
  llm,
  systemPrompt,
  tools,
}: {
  llm: ChatOpenAI;
  systemPrompt: string;
  tools: StructuredTool[];
}): Promise<Runnable> {
  const toolNames = tools.map((tool) => tool.name).join(", ");
  const formatedTool = tools.map((t) => convertToOpenAITool(t));

  let promptTemplate = ChatPromptTemplate.fromMessages([
    ["system", `${systemPrompt}. These are the tool you can use ${toolNames} `],
    new MessagesPlaceholder("messages"),
  ]);

  return promptTemplate.pipe(llm.bind({ tools: formatedTool }));
}

async function runAgent({
  agent,
  state,
}: {
  agent: Runnable;
  state: typeof StateAnnotation.State;
}): Promise<Command<typeof StateAnnotation.Update>> {
  const response = await agent.invoke(state);
  return new Command({
    goto: "editor",
    update: {
      messages: [response],
      fact: response.content,
    },
  });
}

const fetchCatFactTool = tool(
  async () => {
    try {
      const response = await fetch("https://catfact.ninja/fact", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch cat fact");
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.log(error);
    }
  },
  {
    name: "fetch_cat_fact",
    description: "use this tool to get a cat fact",
    schema: z.object({}),
  },
);

const tools = [fetchCatFactTool];

async function AgentNodeGetFact(
  state: typeof StateAnnotation.State,
): Promise<Command<typeof StateAnnotation.Update>> {
  const agent = await createAgent({
    tools: tools,
    systemPrompt: "Respond in spanish",
    llm: new ChatOpenAI({ apiKey: process.env.OPENAI_KEY }),
  });
  return runAgent({
    agent: agent,
    state: state,
  });
}
const toolNode = new ToolNode<typeof StateAnnotation.State>(tools);

const testNode = await AgentNodeGetFact({
  messages: [new HumanMessage("what can you tell me about cats")],
  fact: "",
});
console.log(testNode);
