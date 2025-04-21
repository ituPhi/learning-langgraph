import { Annotation, Command, StateGraph } from "@langchain/langgraph";

const StateAnnotation = Annotation.Root({
  input: Annotation<string>,
});

const agentA = async (state: typeof StateAnnotation.State) => {
  console.log("Agent A called");
  const goto = Math.random() > 0.5 ? "nodeB" : "nodeC";
  return new Command({
    update: {
      input: "a",
    },
    goto,
  });
};

const agentB = async (state: typeof StateAnnotation.State) => {
  console.log("Agent B called");
  return {
    input: state.input + "Hello from agent B",
  };
};

const agentC = async (state: typeof StateAnnotation.State) => {
  console.log("Agent C called");
  return {
    input: state.input + "Hello from agentC",
  };
};

const workflow = new StateGraph(StateAnnotation)
  .addNode("node-a", agentA, {
    ends: ["nodeB", "nodeC"],
  })
  .addNode("nodeB", agentB)
  .addNode("nodeC", agentC)
  .addEdge("__start__", "node-a");

export const graph = workflow.compile();
