import { request } from "undici";

// Your assistant ID from the server logs
const ASSISTANT_ID = "fe096781-5601-53d2-b2f6-0d3403f7e9ca";

async function createThread() {
  console.log("Creating a new thread...");

  const { statusCode, body } = await request("http://localhost:2024/threads", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  const response = await body.json();
  console.log(`Thread created with ID: ${response.thread_id}`);
  return response;
}

async function runAssistant(
  threadId: string,
  assistantId: string,
  content: string,
) {
  console.log(`Running assistant ${assistantId} on thread ${threadId}...`);

  const { statusCode, body } = await request(
    `http://localhost:2024/threads/${threadId}/runs`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        assistant_id: assistantId,
        input: {
          messages: [
            {
              role: "human",
              content: content,
            },
          ],
        },
        stream: false,
        recursion_limit: 6,
      }),
    },
  );

  const response = await body.json();
  console.log("Run started:", response);
  return response;
}

async function getMessages(threadId: string) {
  console.log(`Getting messages for thread ${threadId}...`);

  try {
    const { statusCode, headers, body } = await request(
      `http://localhost:2024/threads/${threadId}/messages`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
    
    console.log(`Get messages status code: ${statusCode}`);
    console.log(`Response headers:`, headers);
    
    // First get the raw text response
    const responseText = await body.text();
    console.log(`Raw response text: "${responseText}"`);
    
    // Only try to parse if it looks like valid JSON
    if (responseText && responseText.trim()) {
      try {
        const response = JSON.parse(responseText);
        console.log("Parsed messages:", response);
        return response;
      } catch (parseError) {
        console.error("Error parsing JSON:", parseError);
        return null;
      }
    } else {
      console.log("Empty response received");
      return null;
    }
  } catch (error) {
    console.error(`Error getting messages for thread ${threadId}:`, error);
    throw error;
  }
}

async function getRun(threadId: string, runId: string) {
  console.log(`Getting run status for run ${runId}...`);
  
  try {
    const { statusCode, body } = await request(
      `http://localhost:2024/threads/${threadId}/runs/${runId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
    
    const responseText = await body.text();
    console.log(`Raw run status response: "${responseText}"`);
    
    if (responseText && responseText.trim()) {
      try {
        return JSON.parse(responseText);
      } catch (parseError) {
        console.error("Error parsing run status JSON:", parseError);
        return null;
      }
    }
    return null;
  } catch (error) {
    console.error(`Error getting run status for ${runId}:`, error);
    throw error;
  }
}

async function cancelRun(threadId: string, runId: string) {
  console.log(`Cancelling run ${runId}...`);
  
  try {
    const { statusCode, body } = await request(
      `http://localhost:2024/threads/${threadId}/runs/${runId}/cancel`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      },
    );
    
    const responseText = await body.text();
    console.log(`Cancel run response: "${responseText}"`);
    
    if (responseText && responseText.trim()) {
      try {
        const response = JSON.parse(responseText);
        console.log(`Run cancellation ${response.status === "cancelling" ? "initiated" : "failed"}`);
        return response;
      } catch (parseError) {
        console.error("Error parsing cancel response JSON:", parseError);
        return null;
      }
    }
    return null;
  } catch (error) {
    console.error(`Error cancelling run ${runId}:`, error);
    throw error;
  }
}

async function main() {
  try {
    // 1. Create a thread
    const thread = await createThread();

    // 2. Run the assistant with our input
    const run = await runAssistant(
      thread.thread_id,
      ASSISTANT_ID,
      "Write a creative copy for my AI Agent Business",
    );

    // 3. Poll for the run status until it's completed
    console.log("Polling for run status...");
    let runStatus = null;
    let isCompleted = false;
    
    // Poll for up to 2 minutes (24 attempts, 5 seconds apart)
    for (let i = 0; i < 24; i++) {
      runStatus = await getRun(thread.thread_id, run.run_id);
      
      if (runStatus && (runStatus.status === "completed" || runStatus.status === "failed")) {
        isCompleted = true;
        console.log(`Run ${runStatus.status} after ${i+1} attempts`);
        break;
      }
      
      console.log(`Run status: ${runStatus?.status || "unknown"}, waiting 5 seconds... (attempt ${i+1}/24)`);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
    
    if (!isCompleted) {
      console.log("Run didn't complete within the timeout period");
      console.log("Attempting to cancel the run...");
      await cancelRun(thread.thread_id, run.run_id);
      return;
    }

    // 4. Get the messages (results)
    const messages = await getMessages(thread.thread_id);
    
    // 5. Print the final result (the last assistant message)
    if (messages && Array.isArray(messages)) {
      const assistantMessages = messages.filter(
        (msg: any) => msg.role === "assistant",
      );
      if (assistantMessages.length > 0) {
        console.log("\nFinal Result:");
        console.log(assistantMessages[assistantMessages.length - 1].content);
      } else {
        console.log("No assistant messages found");
      }
    } else {
      console.log("No valid messages returned");
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

// Run the main function
main();