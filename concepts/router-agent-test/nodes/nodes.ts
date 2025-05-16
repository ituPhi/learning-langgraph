import { StateAnnotation } from "../graph";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { PromptTemplate } from "@langchain/core/prompts";
import { getWebsiteContext } from "../tools/tools";

export async function routerAgent(state: typeof StateAnnotation.State) {
  if (!state.url) throw new Error("url is required");
  const url = state.url;

  const modelWithRouterSchema = async () => {
    const baseModel = new ChatOpenAI({
      apiKey: process.env.OPENAI_KEY,
      model: "gpt-3.5-turbo",
      temperature: 0,
    });
    const routerSchema = z.object({
      url: z.string().describe("The url the user wants analized"),
      baseMessage: z
        .string()
        .describe("The base message response to the user must include url"),
      step: z
        .enum(["SEO", "CRO", "USER"])
        .describe("The next step in the route process"),
    });

    const modelRouter = baseModel.withStructuredOutput(routerSchema);
    return modelRouter;
  };

  const router = await modelWithRouterSchema();
  const res = await router.invoke([
    {
      role: "system",
      content: `you are an router agent you task is to process the input query and select the next step according to the users need: SEO | CRO | Technical. Respond to the user with a nice message tell him we are processing ${url}`,
      url: state.url,
    },
    {
      role: "user",
      content: state.input,
      url: state.url,
    },
  ]);
  return {
    decision: res.step,
  };
}

export async function seoAgent(state: typeof StateAnnotation.State) {
  let url = state.url;
  console.log(state.url);
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = "https://" + url;
  }

  const model = new ChatOpenAI({
    apiKey: process.env.OPENAI_KEY,
    temperature: 0.2,
    maxTokens: 2048,
    model: "gpt-3.5-turbo",
  });

  const webContext = await getWebsiteContext.invoke({ url: url });
  console.log(webContext[0].pageContent);
  const report = model.invoke([
    {
      role: "system",
      content: `You are an SEO expert you must report on the given website using the context provided : ${webContext[0].pageContent} , ${url}`,
      url: url,
    },
    {
      role: "user",
      content: state.input,
      url: url,
    },
  ]);

  const res = await report;
  return { output: res };
}

export async function croAgent(state: typeof StateAnnotation.State) {
  const model = new ChatOpenAI({
    apiKey: process.env.OPENAI_KEY,
    temperature: 0.2,
    maxTokens: 2048,
    model: "gpt-3.5-turbo",
  });
  const croResponse = await model.invoke([
    {
      role: "system",
      content:
        "You are a CRO expert, use dummy data, we are testing. Be very brief",
    },
    {
      role: "user",
      content: state.input,
    },
  ]);
  return {
    output: croResponse.content,
  };
}
