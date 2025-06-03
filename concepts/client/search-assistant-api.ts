import { request } from "undici";

async function searchAssistants() {
  try {
    console.log("Sending request to search assistants...");

    const { statusCode, headers, body } = await request(
      "http://localhost:2024/assistants/search",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          metadata: {},
          graph_id: "",
          limit: 10,
          offset: 0,
          sort_by: "assistant_id",
          sort_order: "asc",
        }),
      },
    );

    console.log(`Response status code: ${statusCode}`);
    console.log(`Response headers:`, headers);

    const responseText = await body.text(); // Get raw response as text first
    console.log(`Raw response text: "${responseText}"`);

    // Only try to parse as JSON if there's actual content
    const response = responseText ? JSON.parse(responseText) : null;
    console.log(`Parsed response:`, response);

    // Try to fetch a specific assistant we know exists
    await getAssistantById("fe096781-5601-53d2-b2f6-0d3403f7e9ca");

    return response;
  } catch (error) {
    console.error("Error searching assistants:", error);
    throw error;
  }
}

async function getAssistantById(assistantId: string) {
  try {
    console.log(`Getting assistant with ID: ${assistantId}`);

    const { statusCode, body } = await request(
      `http://localhost:2024/assistants/${assistantId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    console.log(`Get assistant status code: ${statusCode}`);

    const responseText = await body.text();
    console.log(`Get assistant raw response: "${responseText}"`);

    const response = responseText ? JSON.parse(responseText) : null;
    console.log(`Get assistant parsed response:`, response);

    return response;
  } catch (error) {
    console.error(`Error getting assistant ${assistantId}:`, error);
    throw error;
  }
}

// Call the search function
searchAssistants().catch((error) => console.error("Error:", error));
