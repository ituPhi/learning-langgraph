import { ChatPrem } from "@langchain/community/chat_models/premai";
import { HumanMessage } from "@langchain/core/messages";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";

const chat = ChatPromptTemplate.fromMessages([
  ["system", "you are a helpful agent"],
  ["user", " i need help with seo"],
]);
const r = await chat.invoke({});
//console.log(r.messages);

// messages placeholder
const pt = ChatPromptTemplate.fromMessages([
  ["system", "you are a system expert"],
  new MessagesPlaceholder("input"),
]);
const r2 = await pt.invoke({
  input: [new HumanMessage("I need help with SEO")],
});
console.log(r2.messages);
