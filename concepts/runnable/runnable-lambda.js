import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate, PromptTemplate } from "@langchain/core/prompts";
import { RunnableLambda } from "@langchain/core/runnables";
import { ChatOpenAI } from "@langchain/openai";

const lengthFunc = ({ input }) => {
  return {
    length: input.length.toString(),
  };
};

const model = new ChatOpenAI({
  apiKey: process.env.OPENAI_KEY,
});

const pt = PromptTemplate.fromTemplate(" what is {length} * 2");
const lambda = RunnableLambda.from(lengthFunc)
  .pipe(pt)
  .pipe(model)
  .pipe(new StringOutputParser());

//console.log(lambda);
const res = await lambda.invoke({ input: "Hello friend" }); // this is invoking the lamba with the input variable
console.log(res);
