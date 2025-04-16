import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { AIMessage, SystemMessage } from "@langchain/core/messages";
import { Command } from "@langchain/langgraph";
import { SharedAnnotation, StateAnnotation } from "../graph";

export const extractor = async (state: typeof SharedAnnotation.State) => {
  console.log("extractor is running");
  const schema = z.object({
    intent: z
      .string()
      .describe(
        "This is what the user wants to do, try to sumarize in two word",
      ),
    url: z.string().describe("The user url"),
  });

  const model = new ChatOpenAI({
    apiKey: process.env.OPENAI_KEY,
    model: "gpt-4o",
  }).withStructuredOutput(schema);

  const userMessage = state.messages[state.messages.length - 1].content;
  console.log("userMessage:", userMessage);
  const result = await model.invoke([
    {
      role: "system",
      content: `You are an URL extraction specialist with perfect accuracy.
        Given the user message: "${userMessage}"
        Extract the URL and the user's INTENT.

        FORMATTING REQUIREMENTS:
        1. ALWAYS return URLs in proper format with the full protocol and domain.
        2. Add "https://" prefix if not explicitly specified.
        3. If a URL is provided without "www." and it's a common website, add it.
        4. Ensure there are no spaces or invalid characters in the URL.
        5. URLs must follow RFC standards and be directly usable in a browser.
        6. Try to categorize intent as "SEO", "CRO" or "UX".

        Examples of correct URL formatting:
        - "google.com" → "https://www.google.com"
        - "facebook.com/page" → "https://www.facebook.com/page"
        - "i2phi.com" → "https://www.i2phi.com"
        - "subdomain.example.com" → "https://subdomain.example.com"

        IMPORTANT: The formatted URL must be in the "url" field of your structured output.
        Return the intent as a brief description of what the user wants to do with the URL.`,
    },
  ]);
  //console.log(result);
  const newAIMessage = new AIMessage(
    `info: {url: ${result.url} , intent:${result.intent}}`,
  );
  return {
    url: result.url,
    intent: result.intent,
  };
};

export const routerAgent = async (state: typeof SharedAnnotation) => {
  console.log("routerAgent running");
  const url = state["url"];
  const intent = state["intent"];
  console.log("intent:", intent);
  const goto = (intent: string) => {
    if (intent.includes("SEO")) {
      return "SEO";
    } else if (intent.includes("CRO")) {
      return "CRO";
    } else if (intent.includes("UX")) {
      return "UX";
    } else {
      return "AGENT";
    }
  };

  let decision = goto(intent);
  console.log("router agent decision:", decision);

  if (decision === "SEO") {
    //console.log("state inside condition on router", state);
    return new Command({
      update: {
        messages: [],
        url: "url",
        intent: state["intent"],
      },
      goto: decision,
    });
  } else {
    return new Command({
      update: {},
      goto: "AGENT",
    });
  }
};

export const defaultAgent = async (state: typeof StateAnnotation) => {
  const model = new ChatOpenAI({
    modelName: "gpt-4o",
    apiKey: process.env.OPENAI_KEY,
  });
  const systemMessage = new SystemMessage(
    `respond with: "default agent running" ALLWAYS NO MATTER WHAT`,
  );
  const messagesWithSystem = [systemMessage];
  // console.log("default agent messages:", messagesWithSystem);
  const message = await model.invoke(messagesWithSystem);
  return {
    messages: [message],
  };
};

export const croAgent = async (state) => {
  const model = new ChatOpenAI({
    modelName: "gpt-4o",
    apiKey: process.env.OPENAI_KEY,
  });

  const systemMessage = new SystemMessage(
    `You are a web automation assistant CRO EXPERT respond short`,
  );

  const messagesWithSystem = [systemMessage, ...state.messages];
  const message = await model.invoke(messagesWithSystem);
  return {
    messages: [message],
  };
};

export const userAgent = async (state: typeof MessagesAnnotation.State) => {
  const model = new ChatOpenAI({
    modelName: "gpt-4o",
    apiKey: process.env.OPENAI_KEY,
  });

  const prompt = new SystemMessage(
    "Yuu are a user experience expert, repond very shortly saying hi",
  );

  const messages = [...state.messages, prompt];
  const response = model.invoke(messages);
  return response;
};
