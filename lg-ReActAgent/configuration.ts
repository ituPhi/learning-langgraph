import { Annotation } from "@langchain/langgraph";
import { RunnableConfig } from "@langchain/core/runnables";

export const ConfigurationSchema = Annotation.Root({
  systemPromptTemplate: Annotation<string>,
  model: Annotation<string>,
});

export function ensureConfiguration(
  config: RunnableConfig,
): typeof ConfigurationSchema.State {
  const configurable = config.configurable ?? {};
  return {
    systemPromptTemplate:
      configurable.systemPromptTemplate ??
      `You are a helpful AI assistant.
    System time: {system_time}`,
    model: configurable.model ?? "gpt-3.5-turbo",
  };
}
