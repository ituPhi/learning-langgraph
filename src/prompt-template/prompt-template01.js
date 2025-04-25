import { ChatOpenAI } from "@langchain/openai";
import {
  ChatPromptTemplate,
  PromptTemplate,
  SystemMessagePromptTemplate,
} from "@langchain/core/prompts"; // used to format a single string
import { StringOutputParser } from "@langchain/core/output_parsers";
import {
  RunnablePassthrough,
  RunnableSequence,
} from "@langchain/core/runnables";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { HumanMessage } from "@langchain/core/messages";
import { Cohere } from "@langchain/community/llms/cohere";

const model = new ChatOpenAI({
  apiKey: process.env.OPENAI_KEY,
});

async function PromptTemplateExample() {
  const sparser = new StringOutputParser();
  //fromTemplate is a method on the class PromptTemplate, methods are called with the . notations
  const options = {
    name: "initPrompt",
    outputParser: sparser,
    metadata: "This is the metadata",
  };
  const initPrompt = PromptTemplate.fromTemplate(
    "Hey there chatty i am {user}", //template
    options, // options
  );

  console.log(initPrompt.getName());
  console.log(initPrompt);
  const pt = await initPrompt.invoke({ user: "Juan" });
  return console.log(pt);
}
//PromptTemplateExample();

async function RunnableExample() {
  // lets give the model a tool
  const add = tool(
    ({ a, b }) => {
      return String(a + b);
    },
    {
      name: "Addition",
      description: "Use to add two numbers",
      schema: z.object({
        a: z.number(),
        b: z.number(),
      }),
    },
  );
  const modelWithTools = model.bindTools([add]);

  const userQuestion = PromptTemplate.fromTemplate("{question}");
  const finalFormat = PromptTemplate.fromTemplate(
    "respond to the {question} with the {result} regarles of what you think the awnser is",
  );

  const initSequence = RunnableSequence.from([
    (q) => q,
    (r) => r.question,
    modelWithTools,
    (input) => (input = input.tool_calls),
    (input) => input[0].args,
    {
      question: new RunnablePassthrough(), // here
      result: (args) => add.invoke({ a: args["a"], b: args["b"] }),
    },
    finalFormat,
    (a) => console.log(a),
    model,
    new StringOutputParser(),
  ]);

  const response = await initSequence.invoke({
    question: "What is the sum of 2 and 2?",
  });
  return console.log(response);
}
RunnableExample();
