document.addEventListener('DOMContentLoaded', () => {
  // Load saved endpoints from chrome storage
  loadSavedEndpoints();

  // Add event listener to add endpoint button
  document.getElementById('addEndpointButton').addEventListener('click', addEndpoint);

  // Add event listener to generate filtered swagger button
  document.getElementById('generateSwaggerButton').addEventListener('click', generateFilteredSwagger);

  // Get reference to the JSON error display div
  const jsonErrorDisplay = document.getElementById('jsonErrorDisplay');

  // Add event listener to fullJsonInput textarea
  const fullJsonInput = document.getElementById('fullJsonInput');
  fullJsonInput.addEventListener('input', () => {
    const content = fullJsonInput.value;
    try {
      JSON.parse(content);
      // JSON is valid
      fullJsonInput.classList.remove('error');
      jsonErrorDisplay.textContent = '';
      jsonErrorDisplay.style.display = 'none';
    } catch (error) {
      // JSON is invalid
      fullJsonInput.classList.add('error');
      jsonErrorDisplay.textContent = 'Invalid JSON format. Check syntax.';
      jsonErrorDisplay.style.display = 'block';
    }
  });
});
document.getElementById('jsonFileInput').addEventListener('change', handleFileUpload);

// Add the entered endpoint to chrome storage
function addEndpoint() {
  const endpointInput = document.getElementById('endpointInput');
  const endpoint = endpointInput.value.trim();

  if (endpoint) {
    // Check if the endpoint is already saved
    isEndpointAlreadySaved(endpoint).then((exists) => {
      if (exists) {
        alert('This endpoint is already saved.');
      } else {
        chrome.storage.local.get(['endpoints'], (result) => {
          let savedEndpoints = result.endpoints || [];

          // Add the new endpoint to the array
          savedEndpoints.push(endpoint);

          // Save the updated array to chrome storage
          chrome.storage.local.set({ endpoints: savedEndpoints }, () => {
            // Reload the list of saved endpoints
            loadSavedEndpoints();
            endpointInput.value = '';  // Clear input
          });
        });
      }
    });
  } else {
    alert('Please enter a valid endpoint.');
  }
}

// Check if the endpoint is already saved in chrome storage
function isEndpointAlreadySaved(endpoint) {
  return new Promise((resolve) => {
    chrome.storage.local.get(['endpoints'], (result) => {
      const savedEndpoints = result.endpoints || [];
      resolve(savedEndpoints.includes(endpoint));
    });
  });
}

// Function to load saved endpoints and update the UI
function loadSavedEndpoints() {
  chrome.storage.local.get(['endpoints'], (result) => {
    const endpoints = result.endpoints || [];
    const endpointListDiv = document.getElementById('endpointList');
    endpointListDiv.innerHTML = '';  // Clear the existing list

    // Iterate through the endpoints array and create elements for each
    endpoints.forEach(endpoint => {
      const div = document.createElement('div');
      div.classList.add('endpoint-item');

      const endpointText = document.createElement('span');
      endpointText.textContent = endpoint;

      const removeButton = document.createElement('button');
      removeButton.textContent = 'Remove';
      removeButton.classList.add('remove-btn');
      removeButton.addEventListener('click', () => removeEndpoint(endpoint));

      div.appendChild(endpointText);
      div.appendChild(removeButton);
      endpointListDiv.appendChild(div);
    });
  });
}

// Function to remove an endpoint from chrome storage
function removeEndpoint(endpointToRemove) {
  chrome.storage.local.get(['endpoints'], (result) => {
    let savedEndpoints = result.endpoints || [];

    // Remove the endpoint from the array
    savedEndpoints = savedEndpoints.filter(endpoint => endpoint !== endpointToRemove);

    // Save the updated array to chrome storage
    chrome.storage.local.set({ endpoints: savedEndpoints }, () => {
      // Reload the list after removing the endpoint
      loadSavedEndpoints();
    });
  });
}

// Function to generate the filtered Swagger JSON based on selected endpoints
function generateFilteredSwagger() {
  chrome.storage.local.get(['endpoints'], (result) => {
    const savedEndpoints = result.endpoints || [];
    if (savedEndpoints.length === 0) {
      alert('No endpoints selected!');
      return;
    }

    const fullJsonInputElement = document.getElementById('fullJsonInput');
    // Manually trigger input event to run validation
    fullJsonInputElement.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));

    // Check if the input field has the 'error' class after validation
    if (fullJsonInputElement.classList.contains('error')) {
      alert("Cannot generate Swagger: The JSON input is invalid. Please correct the errors.");
      return;
    }

    const fullJsonValue = fullJsonInputElement.value.trim();
    if (!fullJsonValue) {
      // This case should ideally be caught by the 'input' event handler if it adds .error for empty required field.
      // Or, the validation logic in the 'input' event could be enhanced to handle emptiness.
      // For now, keeping this check as a safeguard.
      alert('Please enter the full Swagger JSON!');
      return;
    }

    // At this point, the JSON is considered valid by the UI validator.
    // The original try-catch for JSON.parse can be removed or simplified if confidence in the UI validator is high.
    // For safety, we can keep a try-catch, but the primary user feedback is already handled.
    let fullSwagger;
    try {
      fullSwagger = JSON.parse(fullJsonValue);
    } catch (error) {
      // This catch block might indicate a discrepancy between the live validator and this parse attempt,
      // or an edge case not handled by the live validator.
      console.error("Error parsing JSON despite passing live validation:", error);
      alert("An unexpected error occurred while parsing the JSON. Please check its format.");
      return;
    }

    chrome.runtime.sendMessage({
      action: 'generateFilteredSwagger',
      endpoints: savedEndpoints,
      fullSwagger: fullSwagger
    }, (response) => {
      if (response && response.filteredSwagger) {
        showPopup(response.filteredSwagger);
      }
    });
  });
}

// Function to show the popup modal with the filtered Swagger JSON
function showPopup(filteredJson) {
  const popupModal = document.getElementById("popupModal");
  popupModal.style.display = "flex";

  document.getElementById("downloadButton").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(filteredJson, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "filtered_swagger.json";
    link.click();
  });

  document.getElementById("viewButton").addEventListener("click", () => {
    const newTab = window.open();
    newTab.document.write("<pre>" + JSON.stringify(filteredJson, null, 2) + "</pre>");
  });

  document.getElementById("closeButton").addEventListener("click", () => {
    popupModal.style.display = "none";
  });
}

// Function to handle file upload
function handleFileUpload(event) {
  const file = event.target.files[0];

  if (file && file.type === 'application/json') {
    const reader = new FileReader();

    reader.onload = function(e) {
      try {
        const jsonContent = JSON.parse(e.target.result);
        document.getElementById('fullJsonInput').value = JSON.stringify(jsonContent, null, 2);
        alert('JSON file loaded successfully.');
      } catch (error) {
        alert("Invalid JSON file. Please ensure the file contains valid JSON.");
      }
    };

    reader.onerror = function() {
      alert('Error reading file!');
    };

    reader.readAsText(file);
  } else {
    alert('Please upload a valid JSON file.');
  }
}
