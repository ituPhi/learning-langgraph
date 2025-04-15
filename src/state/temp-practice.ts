import { StateGraph, Annotation } from "@langchain/langgraph";
import { PromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

const StateAnnotation = Annotation.Root({
  reason: Annotation<string>,
  messages: Annotation<string[]>({
    reducer: (a, b) => a.concat(b),
    default: () => [],
  }),
});

const extractor = async () => {
  const schema = z.object({
    intent: z.string().describe("This is what the user wants to do"),
    url: z.string().describe("The user url"),
  });

  const model = new ChatOpenAI({
    apiKey: process.env.OPENAI_KEY,
    model: "gpt-3.5-turbo",
  }).withStructuredOutput(schema);

  const prompt = PromptTemplate.fromTemplate(`
  You are an URL extraction specialist with perfect accuracy.

  Given the user prompt: "{prompt}"

  Extract the URL and the user's intent.

  FORMATTING REQUIREMENTS:
  1. ALWAYS return URLs in proper format with the full protocol and domain.
  2. Add "https://" prefix if not explicitly specified.
  3. If a URL is provided without "www." and it's a common website, add it.
  4. Ensure there are no spaces or invalid characters in the URL.
  5. URLs must follow RFC standards and be directly usable in a browser.

  Examples of correct URL formatting:
  - "google.com" → "https://www.google.com"
  - "facebook.com/page" → "https://www.facebook.com/page"
  - "i2phi.com" → "https://www.i2phi.com"
  - "subdomain.example.com" → "https://subdomain.example.com"

  IMPORTANT: The formatted URL must be in the "url" field of your structured output.

  Return the intent as a brief description of what the user wants to do with the URL.
  `);
  const res = prompt.pipe(model).invoke({
    prompt:
      "hey i would like to analyze this website fenomenadigital.com to improve my SEO",
  });
  return res;
};

const a = await extractor();
console.log(a);

const workflow = new StateGraph(StateAnnotation);
const graph = workflow.compile();
