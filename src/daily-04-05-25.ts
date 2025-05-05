// runnable sequences
import { StringOutputParser } from "@langchain/core/output_parsers";
import {
  ChatPromptTemplate,
  PromptTemplate,
  SystemMessagePromptTemplate,
} from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { ChatOpenAI } from "@langchain/openai";

const action = SystemMessagePromptTemplate.fromTemplate(
  "Take this website and extract it adding https:// to it : {website}",
);

const chat1 = ChatPromptTemplate.fromMessages([action]);
console.log(await chat1.invoke({ website: "i2phi.com" }));

const analyze = PromptTemplate.fromTemplate(
  "Take this website and analize it : {fullWebsite} ",
);

const llm = new ChatOpenAI({
  apiKey: process.env.OPENAI_KEY,
  model: "gpt-3.5-turbo",
});

const chain = RunnableSequence.from([
  {
    fullWebsite: RunnableSequence.from([chat1, llm, new StringOutputParser()]),
  },
  analyze,
  llm,
]);

const res = await chain.invoke({ website: "i2phi.com" });
console.log(res);
