import { PromptTemplate } from "@langchain/core/prompts";
import { OpenAI } from "@langchain/openai";

const model = new OpenAI();

const template = "Tell me a {adjective} story about {subject}.";
const prompt = PromptTemplate.fromTemplate(template);

const formattedPrompt = await prompt.format({
  adjective: "funny",
  subject: "dragons",
});
console.log(formattedPrompt);

const response = await model.invoke(formattedPrompt);
console.log(response);
