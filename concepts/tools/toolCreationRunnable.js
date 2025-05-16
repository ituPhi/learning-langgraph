// Import required dependencies
import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { PromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";

// Define the addition tool
const add = tool(
  ({ a, b }) => {
    return String(a + b);
  },
  {
    name: "addition",
    description: "Use to add two numbers",
    schema: z.object({
      a: z.number(),
      b: z.number()
    })
  }
);

// Initialize the model with the tool
const model = new ChatOpenAI({
  apiKey: process.env.OPENAI_KEY
}).bindTools([add]);

// Create a simple prompt template
const prompt = PromptTemplate.fromTemplate(
  "Please add these two numbers: {a} and {b}"
);

// Create the sequence
const chain = RunnableSequence.from([
  // First step: format the prompt with input values
  {
    formattedPrompt: prompt,
    // Pass through original values for later use
    originalInput: (input) => input
  },
  // Second step: use the formatted prompt and get model response
  {
    modelResponse: async (input) => {
      const response = await model.invoke(input.formattedPrompt);

      return response;
    },
    // Pass through values we want to keep
    values: (input) => input.originalInput
  },
  // Third step: execute the tool with the values

  async (input) => {
    if (input.modelResponse.tool_calls?.length > 0) {
      const result = await add.invoke(input.modelResponse.tool_calls[0].args);
      return `The sum of ${input.values.a} and ${input.values.b} is ${result}`;
    }
    return "No tool calls were made";
  },
  // Finally, ensure we get a clean string output
  new StringOutputParser()
]);

// Use the chain
const values = { a: 6, b: 6 };
const result = await chain.invoke(values);
console.log(result);
