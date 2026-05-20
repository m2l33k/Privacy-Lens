const DEFAULT_PROFILES = {
  Work:    { effect: 'default', shape: 'rect',      blurAmount: 20, overlayOpacity: 0.2, borderThickness: 1, grainEnabled: false },
  Cafe:    { effect: 'ghost',   shape: 'spotlight',  blurAmount: 30, overlayOpacity: 0.5, borderThickness: 1, grainEnabled: true  },
  Meeting: { effect: 'cctv',   shape: 'rect',       blurAmount: 25, overlayOpacity: 0.3, borderThickness: 2, grainEnabled: false },
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    globalSettings: {
      blurAmount: 20, lensW: 300, lensH: 200, locked: false,
      overlayOpacity: 0.2, borderThickness: 1, grainEnabled: false,
    },
    pl_profiles: DEFAULT_PROFILES,
  });

  chrome.contextMenus.create({
    id:       'pl-toggle',
    title:    'Toggle Privacy Lens',
    contexts: ['all'],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'pl-toggle' && tab?.id) {
    chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE' }).catch(() => {});
  }
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
