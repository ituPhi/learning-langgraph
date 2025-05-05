import {
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
} from "@langchain/core/prompts";
import { ChatPromptTemplate } from "@langchain/core/prompts";

let shm = HumanMessagePromptTemplate.fromTemplate("Hi i am {name}");
//const msg = await shm.format({ name: "Juan" });

let smpt = SystemMessagePromptTemplate.fromTemplate(
  "You must always respond in {language}",
);
//const smgs = await smpt.format({ language: "Spanish" });

const cpt = ChatPromptTemplate.fromMessages([shm, smpt]);

let res = cpt.invoke({ name: "Juan", language: "Spanaish" });
console.log(await res);
