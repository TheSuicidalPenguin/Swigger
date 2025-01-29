chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'generateFilteredSwagger') {
    const { endpoints, fullSwagger } = message;

    // Extract the filtered paths based on the endpoints
    const filteredPaths = {};
    endpoints.forEach(endpoint => {
      if (fullSwagger.paths[endpoint]) {
        filteredPaths[endpoint] = fullSwagger.paths[endpoint];
      }
    });

    // Collect referenced components (Schemas, Parameters, Responses, etc.)
    const filteredComponents = collectReferencedComponents(filteredPaths, fullSwagger.components);

    const filteredSwagger = {
      openapi: fullSwagger.openapi,
      info: fullSwagger.info,
      servers: fullSwagger.servers || [],
      tags: filterTags(filteredPaths),
      paths: filteredPaths,
      components: filteredComponents
    };

    sendResponse({ filteredSwagger });
  }
});

// Collect referenced components (schemas, parameters, etc.)
function collectReferencedComponents(paths, components) {
  const referencedComponents = {
    schemas: {},
    parameters: {},
    responses: {},
    requestBodies: {},
    headers: {}
  };

  function extractReferences(data) {
    if (typeof data === 'object') {
      for (const key in data) {
        if (data[key] && data[key].$ref) {
          const ref = data[key].$ref.split('/');
          const refType = ref[ref.length - 2];
          const refName = ref[ref.length - 1];

          if (components[refType] && components[refType][refName]) {
            referencedComponents[refType][refName] = components[refType][refName];
          }
        } else if (data[key] && typeof data[key] === 'object') {
          extractReferences(data[key]);
        }
      }
    }
  }

  for (const path in paths) {
    for (const method in paths[path]) {
      extractReferences(paths[path][method]);
    }
  }

  return referencedComponents;
}

// Filter tags based on selected paths
function filterTags(paths) {
  const selectedTags = new Set();

  for (const path in paths) {
    for (const method in paths[path]) {
      if (paths[path][method].tags) {
        paths[path][method].tags.forEach(tag => selectedTags.add(tag));
      }
    }
  }

  return Array.from(selectedTags).map(tag => ({ name: tag }));
}