document.getElementById('change-text-button').addEventListener('click', function() {
    const inputText = document.getElementById('input-text').value;
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        chrome.runtime.sendMessage({
            type: 'PROCESS_TEXT',
            tabId: tabs[0].id,
            text: inputText
        });
    });
});
