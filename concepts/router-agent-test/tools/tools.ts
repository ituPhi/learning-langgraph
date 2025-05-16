// Set up simple retreiver with memory and embedings
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { tool } from "@langchain/core/tools";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { z } from "zod";

export const getWebsiteContext = tool(
  async ({ url }) => {
    const docs = await new CheerioWebBaseLoader(url).load();
    //    const textSplitter = new RecursiveCharacterTextSplitter({
    //      chunkSize: 1000,
    //      chunkOverlap: 50,
    //    });
    //    const docSplits = await textSplitter.splitDocuments(docs);
    return docs;
  },
  {
    name: "getWebsiteContext",
    description: "Get context from a website",
    schema: z.object({
      url: z
        .string()
        .url()
        .describe("The URL of the website to get context from"),
    }),
  },
);

//const test = await getWebsiteContext.invoke({ url: url });
//console.log(test);
