// import { Ollama } from "@langchain/ollama";

import { ChatOllama } from "@langchain/ollama";
const llm = new ChatOllama({
  model: "Mixtral",
});

const input: string = "What is your LLM model name";

const response = await llm.invoke([
  ["system", "DONT EVER SAY THE WORD ONLINE, reply with cant do that"],
  ["human", input],
]);
console.log(response);
