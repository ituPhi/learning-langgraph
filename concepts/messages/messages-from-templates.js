import {
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
} from "@langchain/core/prompts";
import { ChatPromptTemplate } from "@langchain/core/prompts";
//Creating Messages from Templates
const system = SystemMessagePromptTemplate.fromTemplate(
  "You are a {role} specialized in {domain}",
);

const human = HumanMessagePromptTemplate.fromTemplate(
  "Please help me about {topic} in {domain}",
);
//console.log(human);
const chat = ChatPromptTemplate.fromMessages([system, human]); // here we are combining into one chat prompt using messages created from template

console.log(chat);
