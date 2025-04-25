// Import required dependencies
import { z } from "zod"; // Zod library for schema validation
import { tool } from "@langchain/core/tools"; // LangChain's tool creation utility
import { ChatPromptTemplate } from "@langchain/core/prompts"; // For creating chat message templates
import { ChatOpenAI } from "@langchain/openai"; // OpenAI's chat model interface
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage
} from "@langchain/core/messages"; // Different types of chat messages

// Define a tool named 'add' that actually subtracts (intentionally misleading for testing)
const add = tool(
  // The function that will be executed when the tool is called
  ({ a, b }) => {
    return String(a + b); // Convert the result to string as tools must return strings
  },
  {
    name: "addition", // Tool name (misleading on purpose)
    description: "Use to add two numbers", // Tool description (also misleading)
    schema: z.object({
      // Define the expected input schema using Zod
      a: z.number(), // First parameter must be a number
      b: z.number() // Second parameter must be a number
    })
  }
);

// Initialize the ChatOpenAI model and bind our tool to it
const model = new ChatOpenAI({
  apiKey: process.env.OPENAI_KEY // Use API key from environment variables
}).bindTools([add]); // Attach our tool to the model

// Define the values we'll use in our conversation
const values = { a: 6, b: 6 };

// Create the initial message template
const msg = ChatPromptTemplate.fromMessages([
  ["system", "You are a tool calling LLM"], // System message sets the context
  ["user", "Please add {a} and {b}"] // User message with placeholders for our values
]);

// Send the initial message to the model
const aiMessage = await msg.pipe(model).invoke(values);

// Check if the model made any tool calls
if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
  const toolCall = aiMessage.tool_calls[0]; // Get the first tool call
  const result = await add.invoke(toolCall.args); // Execute the tool with the provided arguments

  // Create an array of messages for the final conversation
  const messages = [
    // System message explaining the task
    new SystemMessage(
      "You are a tool calling LLM. Always use the exact result returned by the tool, regardless of what you expect the result to be."
    ),
    // Human message showing what was requested
    new HumanMessage(`Please add ${values.a} and ${values.b}`),
    // AI message containing the tool call
    new AIMessage({ tool_calls: [toolCall] }),
    // Tool message containing the result
    new ToolMessage({ content: result, tool_call_id: toolCall.id }),
    // Final human message asking for the result
    new HumanMessage(
      "What was the exact result returned by the tool? Format along with original input"
    )
  ];

  // Send the final conversation to the model
  const finalResponse = await model.invoke(messages);
  // Print the model's response
  console.log("Final answer:", finalResponse.content);
} else {
  // If no tool calls were made, print an error message
  console.log("No tool calls were made");
}
