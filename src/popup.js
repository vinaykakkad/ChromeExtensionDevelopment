document.addEventListener('DOMContentLoaded', function() {
    // document.getElementById('resetAll').addEventListener('click', function() {
    //     chrome.storage.sync.set({
    //         'HIGH_CONFIDENCE_THRESHOLD': 0.5,
    //         'LOW_CONFIDENCE_THRESHOLD': 0.1
    //     }, function() {
    //         alert('All values reset to default.');
    //         chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    //             chrome.tabs.sendMessage(tabs[0].id, { action: "reset" });
    //         });
    //     });
    // });

    document.getElementById('chooseFirstN').addEventListener('click', function() {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, { action: "SELECT_FIRST_N_IMAGES" });
        });
    });

    document.getElementById('resetAll').addEventListener('click', function() {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, { action: "RESET_ALL_IMAGES" });
        });
    });
});
