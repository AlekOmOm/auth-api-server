export async function fetchGet(url) {
  try {
    const response = await fetch(url, {
      credentials: "include",
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error (${response.status}): ${errorText}`);
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return await response.json();
    } else {
      const text = await response.text();
      throw new Error(
        `API returned non-JSON response: ${text.substring(0, 50)}...`
      );
    }
  } catch (error) {
    console.error("fetchGet error:", error);
    throw error; // Re-throw so it can be handled by the caller
  }
}

export async function fetchPost(url, body) {
  try {
    const response = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    // Always try to read the response body
    let responseData;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      responseData = await response.json();
    } else {
      const text = await response.text();
      // If response is not ok and not JSON, throw an error
      if (!response.ok) {
        throw new Error(
          `API error (${response.status}): ${text.substring(0, 100)}...`
        );
      }
      // If response is ok but not JSON, maybe still throw or handle differently?
      // For now, let's wrap it similar to JSON for consistency, but mark as non-JSON.
      responseData = { success: true, data: text, isJson: false };
    }

    // Check response.ok *after* parsing
    if (!response.ok) {
      // Return the parsed error object but mark as unsuccessful
      // Add success: false if it's not already present in the error response
      if (
        typeof responseData === "object" &&
        responseData !== null &&
        responseData.success === undefined
      ) {
        responseData.success = false;
      }
      // If it's not an object (rare case), wrap it
      else if (typeof responseData !== "object" || responseData === null) {
        responseData = { success: false, data: responseData };
      }
      return responseData; // Return the error details
    }

    // If response is ok and was JSON, ensure success: true is set if not present
    if (
      response.ok &&
      contentType &&
      contentType.includes("application/json")
    ) {
      if (
        typeof responseData === "object" &&
        responseData !== null &&
        responseData.success === undefined
      ) {
        responseData.success = true;
      }
      // If it's not an object (e.g., just a success message string from API), wrap it
      else if (typeof responseData !== "object" || responseData === null) {
        responseData = { success: true, data: responseData };
      }
    }

    return responseData; // Return successful data
  } catch (error) {
    console.error("fetchPost error:", error);
    // For network errors or JSON parsing errors, return a standard error object
    return {
      success: false,
      message: error.message || "Network error or failed to parse response.",
    };
  }
}
