import { Annotation, StateGraph } from "@langchain/langgraph";

const inputAnnotation = Annotation.Root({
  input: Annotation<string>,
});

const outputAnnotation = Annotation.Root({
  output: Annotation<string>,
});

const workflow = new StateGraph({
  input: inputAnnotation,
  output: outputAnnotation,
})
  .addNode("a", (state: typeof inputAnnotation) => {
    return {
      output: "bye",
    };
  })
  .addEdge("__start__", "a")
  .addEdge("a", "__end__")
  .compile();

const res = await workflow.invoke({ input: "HI" });
console.log(res);
