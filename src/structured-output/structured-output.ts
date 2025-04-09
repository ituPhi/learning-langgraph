import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { PromptTemplate } from "@langchain/core/prompts";

// lets complete this with a little langgchain, here we set up a prompt that recieves our input
const template = PromptTemplate.fromTemplate(`
  extract the following information from the following passage.
  Only extract the properties mentiones in the 'Classification' function.
  Passage:{input}
  `);

// define a schema with zod that the output will follow, the descriptions are sent along to the llm
const classificationSchema = z.object({
  sentiment: z.string().describe("The sentiment of the passage"),
  aggresivness: z
    .number()
    .int()
    .describe("How agressive is the passage from 1 to 10"),
  language: z.string().describe("The language the text is written in"),
});
// init our model
const model = new ChatOpenAI({
  apiKey: process.env.OPENAI_KEY,
  model: "gpt-3.5-turbo",
});
// add structured output schema to the model
const structuredModel = model.withStructuredOutput(classificationSchema, {
  name: "extractor",
});

const res = await template
  .pipe(structuredModel)
  .invoke({ input: "estoy molesto hoy" });

const prompt1 = await template.format({
  input: "estoy muy molesto hoy",
});
console.log(await structuredModel.invoke(prompt1));

//console.log(res);
