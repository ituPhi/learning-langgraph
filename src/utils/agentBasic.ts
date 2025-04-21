import { ChatOpenAI } from "@langchain/openai";
import { MessagesAnnotation } from "@langchain/langgraph";
import { BaseMessage, HumanMessage } from "@langchain/core/messages";

const agent = async (state: typeof MessagesAnnotation.State) => {
  const llm = new ChatOpenAI({
    apiKey: process.env.OPENAI_KEY,
    model: "gpt-4o-mini",
  });
  const llmResponse = await llm.invoke([
    { role: "system", content: "Respond in spanish Always" },
    ...state.messages,
  ]);
  return {
    messages: [llmResponse],
  };
};

const userMsg = new HumanMessage({
  content: "Hello, i am Juan!",
});

const state: typeof MessagesAnnotation.State = {
  messages: [userMsg],
};

console.log(await agent(state));
