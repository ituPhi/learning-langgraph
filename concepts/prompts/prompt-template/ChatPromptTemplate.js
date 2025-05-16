import { ChatPromptTemplate } from "@langchain/core/prompts";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";

const chat = ChatPromptTemplate.fromMessages([
  ["system", "You are a helpful assistant"],
  ["human", "Hello! {question} "],
]);

const chat2 = ChatPromptTemplate.fromTemplate(`
  System: You are a helpful asistant,
  Human: reply to {question}
  `);

const model = new ChatOpenAI({
  apiKey: process.env.OPENAI_KEY,
});

const ai = chat2.pipe(model);
const res = await ai.invoke({ question: "sing in spanish" });
console.log(res.content);
