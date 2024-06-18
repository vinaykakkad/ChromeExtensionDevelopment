chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "PROCESS_TEXT") {
    const processedText = processText(message.text);
    chrome.tabs.sendMessage(message.tabId, {
      type: "UPDATE_TEXT",
      text: processedText
    });
  }
});

function processText(str) {
  return `Hello ${str} 👋!`;
}
