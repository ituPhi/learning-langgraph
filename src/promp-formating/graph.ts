import { BaseMessage } from "@langchain/core/messages";
import { PromptTemplate } from "@langchain/core/prompts";
import { HumanMessagePromptTemplate } from "@langchain/core/prompts";
import { Annotation } from "@langchain/langgraph";

const StateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (a, b) => a.concat(b),
    default: () => [],
  }),
});

const message = " This is a {query}";
const template = HumanMessagePromptTemplate.fromTemplate(message);
const res = template.invoke({ query: "test" });
const result = await res;

console.log(result);
