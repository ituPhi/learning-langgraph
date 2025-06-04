import { ToolMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import {
  Command,
  getCurrentTaskInput,
  MessagesAnnotation,
} from "@langchain/langgraph";
import { z } from "zod";

// Reusable implementation of a transfer handOff Tool
const createHandOffTool = ({ agentName, description }) => {
  const toolName = `transfer_to_${agentName}`;
  const toolDescription = description || `Ask Agent ${agentName} for help`;

  const handOffTool = tool(
    async (_, config) => {
      const toolMessage = new ToolMessage({
        content: `Succesfuly transfered to ${agentName}`,
        name: toolName,
        tool_call_id: config.toolCall.id,
      });

      //inject current state
      const state =
        getCurrentTaskInput() as (typeof MessagesAnnotation)["State"];

      return new Command({
        goto: agentName,
        update: { messages: state.messages.concat(toolMessage) },
      });
    },
    {
      name: toolName,
      description: toolDescription,
      schema: z.object({}),
    },
  );
  return handOffTool;
};

const transferToDrafNode = createHandOffTool({
  agentName: " Darft Node",
  description: "Transfer user to the draft stage",
});
