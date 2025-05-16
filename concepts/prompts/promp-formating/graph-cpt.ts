import {
  SystemMessagePromptTemplate,
  ChatPromptTemplate,
} from "@langchain/core/prompts";

const message = SystemMessagePromptTemplate.fromTemplate("{text}");
const chatPrompt = ChatPromptTemplate.fromMessages([
  ["ai", "You are a helpful assistant."],
  message,
]);
const formattedChatPrompt = await chatPrompt.invoke({
  text: "Hello world!",
});

console.log(formattedChatPrompt);
