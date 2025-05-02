import {
  Annotation,
  MessagesAnnotation,
  StateGraph,
} from "@langchain/langgraph";
import { Message, Feedback, Support, MessageType } from "./utils/types";
import { AIMessage, HumanMessage } from "@langchain/core/messages";

const StateAnnotation = Annotation.Root({
  message: Annotation<Message>,
  messageType: Annotation<MessageType>,
  support: Annotation<Support>,
  feedback: Annotation<Feedback>,
});

const ConversationAnnotation = MessagesAnnotation;

const PrivatePublicAnnotation = Annotation.Root({
  ...StateAnnotation.spec,
  ...ConversationAnnotation.spec,
});

async function processMessage(
  state: typeof PrivatePublicAnnotation.State,
): Promise<typeof PrivatePublicAnnotation.Update> {
  console.log("process message running");
  const decision = (): MessageType => {
    return "Support";
  };

  // console.log(state.messages[state.messages.length - 1].content);
  return {
    messages: [new AIMessage(`I am processing your request... ${decision()}`)],
    messageType: decision(),
  };
}

async function processFeedBack(
  state: typeof PrivatePublicAnnotation.State,
): Promise<typeof PrivatePublicAnnotation.Update> {
  console.log("process feedback running");
  return {
    messages: [
      new AIMessage(`Your request has been processed as ${state.messageType}`),
    ],
    feedback: {
      userId: "12",
      text: state.message.message,
      isPositive: true,
    },
  };
}

async function processSupport(
  state: typeof PrivatePublicAnnotation.State,
): Promise<typeof PrivatePublicAnnotation.Update> {
  console.log("process Support running");
  const awnser = "To remove old message go to -> menu/mssages";

  return {
    support: {
      supportType: "Bug",
      userId: "12",
      bug: {
        description: "does not work",
        severity: "ultra super high ",
      },
      technicalQuestion: {
        question: "Can we remove old messages?",
        awnser: awnser,
        awnserFound: true,
        links: ["www.i2phi.com"],
      },
    },
    messages: [new AIMessage(`Support says... ${awnser}`)],
  };
}

const graph = new StateGraph(PrivatePublicAnnotation)
  .addNode("process-message", processMessage)
  .addNode("process-feedback", processFeedBack)
  .addNode("process-support", processSupport)
  .addEdge("__start__", "process-message")
  .addEdge("process-message", "process-feedback")
  .addEdge("process-feedback", "process-support")
  .addEdge("process-support", "__end__")
  .compile();

const res = await graph.invoke({
  messages: [new HumanMessage("Hi my imbox is full can you help me")],
  message: {
    sender: "i2phi",
    message: "Hi my imbox is full can you help me",
  },
});

console.log(res);
