import { RunnableSequence } from "@langchain/core/runnables";

const storyPrompt = ChatPromptTemplate.fromTemplate(
  "Tell me a short story about {topic}",
);

const storyModel = new ChatOpenAI({ model: "gpt-4o" });

const chainWithCoercedFunction = RunnableSequence.from([
  storyPrompt,
  storyModel,
  (input) => input.content.slice(0, 5),
]);

await chainWithCoercedFunction.invoke({ topic: "bears" });
