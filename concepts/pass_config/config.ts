import { Annotation, StateGraph } from "@langchain/langgraph";
import { BaseMessage, HumanMessage } from "@langchain/core/messages";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableConfig } from "@langchain/core/runnables";
import { ChatOpenAI } from "@langchain/openai";

const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (a, b) => a.concat(b),
  }),
  userInfo: Annotation<string>({
    reducer: (prev, next) => next || prev,
    default: () => "User information not available",
  }),
});

let promptTemplate = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are a helpful assistant with access to user information.
When asked about user details, always reference this information: {userInfo}
Always incorporate relevant user data in your responses when appropriate.`,
  ],
  ["placeholder", "{messages}"],
]);

const agentNode = async (
  state: typeof AgentState.State,
  config?: RunnableConfig,
) => {
  const { messages, userInfo } = state;
  console.log("Agent node received userInfo:", userInfo);
  
  const model = new ChatOpenAI({
    apiKey: process.env.OPENAI_KEY,
    temperature: 0, // Lower temperature for more consistent responses
  });

  const chain = promptTemplate.pipe(model);
  const response = await chain.invoke({ messages, userInfo }, config);
  return { messages: [response] };
};

const fetchUserInfo = async (
  state: typeof AgentState.State,
  config?: RunnableConfig,
) => {
  const userDB = {
    user1: {
      name: "John Doe",
      age: 30,
      email: "john.doe@example.com",
    },
    user2: {
      name: "Jane Doe",
      age: 25,
      email: "jane.doe@example.com",
    },
  };
  
  console.log("Config received in fetchUserInfo:", JSON.stringify(config));
  
  // Access the user ID from config
  const userID = config?.configurable?.user;
  console.log("User ID extracted:", userID);
  
  if (userID) {
    const user = userDB[userID as keyof typeof userDB];
    if (user) {
      console.log(`Found user info for ${userID}`);
      return {
        userInfo: `Name: ${user.name}, Age: ${user.age}, Email: ${user.email}`,
      };
    }
  }
  return { userInfo: "User not found" };
};

const workflow = new StateGraph(AgentState)
  .addNode("fetchInfo", fetchUserInfo)
  .addNode("agent", agentNode)
  .addEdge("__start__", "fetchInfo")
  .addEdge("fetchInfo", "agent")
  .addEdge("agent", "__end__")
  .compile();

const config = {
  user: "user1",
};

const input = {
  messages: [new HumanMessage("what is my email?")],
};

// Run example for user1
const runUser1Example = async () => {
  console.log("Running example for user1...");
  const res = await workflow.invoke(input, {
    configurable: config,
    streamMode: "values",
  });
  console.log("User1 result:", res);
};

// Example of different user query
const runUser2Example = async () => {
  console.log("Running example for user2...");
  const result = await workflow.invoke(
    { messages: [new HumanMessage("Tell me about myself")] },
    { configurable: { user: "user2" }, streamMode: "values" },
  );
  console.log("User2 result:", result);
};

// Run both examples
runUser1Example().then(() => runUser2Example());
