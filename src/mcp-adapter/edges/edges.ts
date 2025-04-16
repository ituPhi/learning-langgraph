import { routerAnnotation } from "../graph";
import { Command, MessagesAnnotation } from "@langchain/langgraph";

export const routerAgent = async (state) => {
  const content = state;
  // console.log(content);
  const goto = () => {
    switch (state.step) {
      case "SEO":
        return "SEO";

      case "CRO":
        return "CRO";

      case "USER":
        return "UX";

      default:
        throw new Error("Invalid decision");
    }
  };
  return new Command({
    update: {
      url: state.url,
    },
    goto: goto(),
  });
};

//console.log(state.url);
// switch (state.step) {
//   case "SEO":
//     return "SEO";

//   case "CRO":
//     return "CRO";

//   case "USER":
//     return "UX";

//   default:
//     throw new Error("Invalid decision");
