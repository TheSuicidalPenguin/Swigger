// content.js

// Function to extract path from Swagger UI elements
function getEndpointPath(endpointElement) {
  // Swagger UI uses `data-path` in `.opblock-summary-path` for the endpoint path
  const path = endpointElement.querySelector('.opblock-summary-path')?.getAttribute('data-path').trim();
  
  return path || null;
}

// Function to handle the creation of the context menu item
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "extractEndpoint",
    title: "Extract Endpoint",
    contexts: ["all"], // Show for all right-click contexts
  });
});

// Listener for context menu item click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "extractEndpoint") {
    // Ensure that we can access the DOM elements correctly
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: handleExtractEndpoint
    });
  }
});

// Function to handle extracting the endpoint and storing it
function handleExtractEndpoint() {
  // Find the endpoint in the Swagger UI DOM
  const selectedEndpointElement = document.querySelector('.swagger-ui .opblock.opblock-summary');

  if (selectedEndpointElement) {
    // Extract the path from the selected endpoint
    const endpointPath = getEndpointPath(selectedEndpointElement);

    if (endpointPath) {
      // Retrieve existing endpoints from localStorage or initialize an empty array
      let endpoints = JSON.parse(localStorage.getItem('selectedEndpoints')) || [];

      // Add the new endpoint path to the list
      endpoints.push(endpointPath);

      // Save the updated list of endpoints to localStorage
      localStorage.setItem('selectedEndpoints', JSON.stringify(endpoints));

      // Provide feedback to the user
      alert('Endpoint extracted and saved!');
    }
  } else {
    alert('No endpoint selected!');
  }
}
