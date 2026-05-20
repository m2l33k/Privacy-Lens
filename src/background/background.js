chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    globalSettings: {
      blurAmount: 20,
      lensW: 300,
      lensH: 200,
      locked: false,
    },
  });
});

// Relay messages from popup → active tab content script
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.target === 'content') {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, msg, response => {
          if (chrome.runtime.lastError) {
            sendResponse({ error: chrome.runtime.lastError.message });
          } else {
            sendResponse(response);
          }
        });
      }
    });
    return true;
  }
});
