// managing state with reducers in langgraph
import { StateGraph, Annotation } from "@langchain/langgraph";

const StateGraphAnnotation = Annotation.Root({
  // state annotation just return an object with the state
  input: Annotation<string>,
  msg: Annotation<string[]>({
    reducer: (state, update) => state.concat(update),
    default: () => [],
  }),
});

const updateOne = async (state: typeof StateGraphAnnotation.State) => {
  return {
    input: "Update one to state",
    msg: (state.input = "stateInput one"),
  };
};

const updateTwo = async (state: typeof StateGraphAnnotation.State) => {
  return {
    input: "Update two",
    msg: [(state.input = "state input two")],
  };
};

const workflow = new StateGraph(StateGraphAnnotation)
  .addNode("call", updateOne)
  .addNode("call2", updateTwo)
  .addEdge("__start__", "call")
  .addEdge("call", "call2")
  .addEdge("call2", "__end__");

const graph = workflow.compile();
const res = await graph.invoke({ input: "Hello" });
console.log("Final state:", res);
