import { Annotation, StateGraph } from "@langchain/langgraph";

const state = Annotation.Root({
  message: Annotation<string>(),
  pastMessage: Annotation<string[]>({
    default: () => [],
    reducer: (value, updateValue) => value.concat(updateValue),
  }),
});

const userQuestionState = (state: { message: string }) => {
  return {
    message: state.message,
    pastMessage: [],
  };
};
const routeToCroState = (state: { message: string }) => {
  return {
    message: "El usuario sera dirigido al analisis de CRO",
    pastMessage: [state.message],
  };
};
const routeToSeoState = (state: { message: string }) => {
  return {
    message: "El usuario sera dirigido al analisis de SEO",
    pastMessage: [state.message],
  };
};
const routerCondition = (state: { message: string }) => {
  if (state.message.includes("CRO")) {
    return "routeToCRO";
  }

  return "routeToSEO";
};

const workflow = new StateGraph(state)
  .addNode("userQuestion", userQuestionState)
  .addNode("routeToCRO", routeToCroState)
  .addNode("routeToSEO", routeToSeoState)
  .addEdge("__start__", "userQuestion")
  .addConditionalEdges("userQuestion", routerCondition)
  .addEdge("routeToSEO", "__end__");

const graph = workflow.compile();
const res = await graph.invoke({ message: "CR" });
console.log(res);
