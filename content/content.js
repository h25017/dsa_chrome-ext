/**
 * Design System Analyzer - Content Script
 * Fogadja a popup üzeneteit és futtatja az elemzőket
 */

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'analyze') {
    // Run analysis asynchronously
    runAnalysis()
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ error: error.message }));

    // Return true to indicate async response
    return true;
  }
});

/**
 * Run all analyzers and compile results
 */
async function runAnalysis() {
  try {
    // Wait for analyzers to be available
    await waitForAnalyzers();

    // Run all analyzers
    const colors = window.ColorAnalyzer.analyze();
    const typography = window.TypographyAnalyzer.analyze();
    const images = window.ImageAnalyzer.analyze();

    return {
      url: window.location.href,
      timestamp: new Date().toISOString(),
      colors: colors,
      typography: typography,
      images: images
    };

  } catch (error) {
    console.error('Design System Analyzer error:', error);
    throw new Error('Hiba történt az oldal elemzése során: ' + error.message);
  }
}

/**
 * Wait for analyzer modules to be loaded
 */
function waitForAnalyzers(timeout = 5000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    function check() {
      if (window.ColorAnalyzer && window.TypographyAnalyzer && window.ImageAnalyzer) {
        resolve();
      } else if (Date.now() - startTime > timeout) {
        reject(new Error('Elemzők betöltése időtúllépés'));
      } else {
        setTimeout(check, 100);
      }
    }

    check();
  });
}

// Log that content script is loaded
console.log('Design System Analyzer content script loaded');
