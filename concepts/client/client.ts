const { Client } = await import("@langchain/langgraph-sdk");
const client = new Client({ apiUrl: "http://localhost:2024" });
const assistantID = "tool-router";
const thread = await client.threads.create();
//console.log(thread);

const streamResponse = client.runs.stream(thread["thread_id"], assistantID, {
  input: {
    messages: [{ role: "user", content: "what is 2*2" }],
  },
  streamMode: "messages",
});
for await (const chunk of streamResponse) {
  console.log(chunk.data);
}
export default client;
