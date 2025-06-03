import { Command, MessagesAnnotation } from "@langchain/langgraph";
import { Runnable } from "@langchain/core/runnables";
import { AIMessage } from "@langchain/core/messages";

async function RunAgentCommand(
  state: typeof MessagesAnnotation.State,
  agent: Runnable,
) {
  const response: AIMessage = await agent.invoke(state);

  const shouldContinue = (response: AIMessage) => {
    if (
      response &&
      "tool_calls" in response &&
      Array.isArray(response.tool_calls) &&
      response.tool_calls.length > 0
    ) {
      return "continue";
    }
    return "stop";
  };

  return new Command({
    goto: shouldContinue(response),
    update: {
      messages: [response],
    },
  });
}
