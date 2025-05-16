import { Command } from "@langchain/langgraph";

const agent = async (state: any) => {
  const goto = () => {
    if (state.isValid) {
      return "agent";
    }
    return "__end__";
  };
  return new Command({
    goto: goto(),
    update: {
      foo: "bar",
    },
    graph: Command.PARENT, // this sets which subgraph to navigate to
  });
};
