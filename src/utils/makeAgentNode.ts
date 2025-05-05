import { Command, MessagesAnnotation, StateGraph } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import fs from "fs";
const model = new ChatOpenAI({
  apiKey: process.env.OPENAI_KEY,
  model: "gpt-4o",
});

const makeAgentNode = (params: {
  name: string;
  destinations: string[];
  systemPrompt: string;
}) => {
  return async (state: typeof MessagesAnnotation.State) => {
    const possibleDest = ["__end__", ...params.destinations] as const;

    const responseSchema = z.object({
      response: z
        .string()
        .describe(
          "A human readable response to the original question. Does not need to be a final response. Will be streamed back to the user.",
        ),
      goto: z
        .enum(possibleDest)
        .describe(
          `The next agent to call, or __end__ if the user's query has been resolved. Must be one of the specified values.`,
        ),
    });
    const messages = [
      {
        role: "system",
        content: params.systemPrompt,
      },
      ...state.messages,
    ];

    const response = await model
      .withStructuredOutput(responseSchema)
      .invoke(messages);

    const aiMessage = {
      role: "assistant",
      content: response.response,
    };
    return new Command({
      goto: response.goto,
      update: { messages: aiMessage },
    });
  };
};

const copyWriter = makeAgentNode({
  name: "copy_writer",
  destinations: ["critical_thinker", "editor"],
  systemPrompt: `You are a creative copywriting expert working as part of a 3-person team. Your teammates are:
      critical_thinker: An expert in critical analysis who reviews and challenges ideas to improve their strength and clarity.
      editor: A professional editor who refines language, style, and tone to make the copy polished and publication-ready.

      Workflow:
        When you generate a new idea, immediately send it to critical_thinker for analysis.
        After receiving feedback and making improvements, send your updated copy to 'editor' for refinement.
        Once the editor has completed polishing the copy, send the final version to __end__.

      Important: Always follow this workflow: idea ➔ critical review ➔ editing ➔ finalization.`,
});

const criticalThinker = makeAgentNode({
  name: "critical_thinker",
  destinations: ["editor", "copy_writer"],
  systemPrompt: `You are an expert critical thinker specialized in analyzing and challenging ideas to make them stronger, clearer, and more persuasive.
    Workflow:
        When you receive a new idea from the 'copy_writer', your task is to critically review it.
        Identify weaknesses, unclear parts, logical gaps, or potential improvements.
        Provide detailed feedback that helps the 'copy_writer' refine the idea into a stronger version.
        When you receive feedback from the 'critical_thinker', review it and make any necessary adjustments to the idea.
    Important:
        Your goal is not to rewrite the idea, but to offer constructive criticism and suggest improvements.
        Once you finish your review, send the feedback directly back to the 'copy_writer' for revision.`,
});

const editor = makeAgentNode({
  name: "editor",
  destinations: ["critical_thinker", "copy_writer"],
  systemPrompt: `You are a professional editor specialized in refining copy for clarity, style, tone, grammar, and overall polish.
  Workflow:
      When you receive a revised idea from the copywriter (after critical review), your task is to edit it to not sound overly verbose, make it short and sweet.
      Focus on correcting grammar, enhancing flow, ensuring consistent tone, and making the copy ready for publication.

  Important:
      Preserve the meaning and intent of the original idea while improving its presentation.
      Once your editing work is complete, send the final version to __end__ for completion.`,
});

export const graph = new StateGraph(MessagesAnnotation)
  .addNode("copy_writer", copyWriter, {
    ends: ["editor", "critical_thinker", "__end__"],
  })
  .addNode("editor", editor, { ends: ["critical_thinker", "copy_writer"] })
  .addNode("critical_thinker", criticalThinker, {
    ends: ["editor", "copy_writer"],
  })
  .addEdge("__start__", "copy_writer")
  .compile();

// const res = await graph.invoke(
//   {
//     messages: [
//       {
//         role: "human",
//         content: "Write a creative copy for my AI Agent Bussiness",
//       },
//     ],
//   },
//   { recursionLimit: 6 },
// );
// console.log(res.messages);

const drawableGraph = await graph.getGraphAsync();
const image = await drawableGraph.drawMermaidPng();
const arrayBuffer = await image.arrayBuffer();
fs.writeFileSync("graph.png", Buffer.from(arrayBuffer));
