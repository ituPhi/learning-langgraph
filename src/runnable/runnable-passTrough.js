import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import {
  RunnablePassthrough,
  RunnableSequence,
} from "@langchain/core/runnables";
import { ChatOpenAI } from "@langchain/openai";
const s = "Tell me the day and user: {date} , {user}, and respond nicely";
const sp = ChatPromptTemplate.fromTemplate(s);
const m = new ChatOpenAI({
  apiKey: process.env.OPENAI_KEY,
});
const rs = RunnableSequence.from([
  {
    date: () => new Date().toLocaleDateString("en-EN", { weekday: "long" }),
    user: new RunnablePassthrough(),
  },
  sp,
  m,
  new StringOutputParser(),
]);
const res = rs.invoke({ user: "Juan" });
console.log(await res);
