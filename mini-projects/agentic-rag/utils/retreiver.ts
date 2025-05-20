import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { OpenAIEmbeddings } from "@langchain/openai";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { z } from "zod";
import { createRetrieverTool } from "langchain/tools/retriever";
import { tool } from "@langchain/core/tools";

const urls = [
  "https://lilianweng.github.io/posts/2023-06-23-agent/",
  "https://lilianweng.github.io/posts/2023-03-15-prompt-engineering/",
  "https://lilianweng.github.io/posts/2023-10-25-adv-attack-llm/",
];

const docs = await Promise.all(
  urls.map((url) => new CheerioWebBaseLoader(url).load()),
);
const docList = docs.flat();

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 500,
  chunkOverlap: 150,
});

const docSplits = await textSplitter.splitDocuments(docList);

const vectorStore = await MemoryVectorStore.fromDocuments(
  docSplits,
  new OpenAIEmbeddings({ apiKey: process.env.OPENAI_KEY }),
);

export const retreiver = vectorStore.asRetriever();

const searchToolForAgent = tool(
  async ({ query }) => {
    const results = await retreiver.invoke(query);
    return results.map((doc) => doc.pageContent).join("\n");
  },
  {
    name: "search",
    description: "Search the web for information",
    schema: z.object({
      query: z.string().describe("The query to search for"),
    }),
  },
);

const toolAsRetriever = createRetrieverTool(retreiver, {
  name: "retriever",
  description: "Retrieves information from the web",
});

//let res = await toolAsRetriever.invoke({ query: "agent" });
//console.log(res);

export const tools = [toolAsRetriever];
