import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";
import { BaseMessage } from "@langchain/core/messages";
let messages: BaseMessage[] = [];

const messageSchema = z.object({
  content: z.string().describe("The content of the message"),
  role: z.string().describe("The role of the message"),
});

const classifcationSchema = z.object({
  sentiment: z
    .string()
    .describe("categorize the sentiment as Positive or Negative  "),
  language: z.string().describe("What is the language of the query"),
  reason: z.string().describe("The reason why you chose this Classification"),
  messages: z.array(messageSchema).describe("The messages from USER and AI"),
});

const llm = new ChatOpenAI({
  apiKey: process.env.OPENAI_KEY,
}).withStructuredOutput(classifcationSchema, { name: "SentimentAnalysis" });

let pt =
  PromptTemplate.fromTemplate(`extract the following information from the following passage.
Only extract the properties mentioned in the 'Classification' function. Sentiment MUST be ONLY Positive or Negative
Passage:{input}`);

//let fpt = await pt.format({ input: "I am very pissed today" });
//const res = await llm.invoke(fpt);
//console.log(res);

const res2 = await pt.pipe(llm).invoke({ input: "I feel happy today " });
console.log(res2);
