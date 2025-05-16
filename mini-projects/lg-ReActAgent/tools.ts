import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
const seachTavily = new TavilySearchResults({
  maxResults: 3,
  apiKey: process.env.TAVILY_API_KEY,
});
export const TOOLS = [seachTavily];
