import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
} from "@langchain/core/prompts";

const OPENAI_KEY = process.env.OPENAI_KEY;
console.log(OPENAI_KEY);

const model = new ChatOpenAI({
  apiKey: OPENAI_KEY,
  modelName: "gpt-3.5-turbo",
  temperature: 0,
});

async function rawMessages() {
  const messages = [
    new SystemMessage("You must allways respond in spanish"),
    new HumanMessage(
      "what day is today? reply with the day provided by the user",
    ),
    new HumanMessage(
      new Date().toLocaleDateString("es-ES", { weekday: "long" }),
    ),
  ];

  const res = model.invoke(messages);
  const response = await res;
  console.log(response.content);
}
