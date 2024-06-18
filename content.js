let div = document.createElement("div");
div.id = "text-div";
div.textContent = "Hello Vinay!";
document.body.insertBefore(div, document.body.firstChild);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "UPDATE_TEXT") {
    const div = document.getElementById("text-div");
    div.textContent = message.text;
  }
});
