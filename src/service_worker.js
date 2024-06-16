import { load } from "@tensorflow-models/mobilenet";
import { tidy, zeros } from "@tensorflow/tfjs";

const IMAGE_SIZE = 224;
const TOP_K_PREDICTIONS = 2;
const FIVE_SECONDS_IN_MS = 5000;

/**
 * What action to take when someone clicks the right-click menu option.
 * Here it takes the url of the right-clicked image and the current tabId, and
 * send them to the content script where the ImageData will be retrieved and
 * sent back here. After that, imageClassifier's analyzeImage method.
 */
function clickMenuCallback(info, tab) {
  const message = { action: "GET_IMAGE_DATA", url: info.srcUrl };
  chrome.tabs.sendMessage(tab.id, message, (resp) => {
    if (resp === null) {
      console.error(
        "Failed to get image data. " +
          "The image might be too small or failed to load. " +
          "See console logs for errors."
      );
      return;
    }
    const image = new ImageData(
      new Uint8ClampedArray(resp.data),
      resp.width,
      resp.height
    );
    imageClassifier.analyzeImageAndSendMessage(image, info.srcUrl, tab.id);
  });
}

/**
 * Async loads a mobilenet on construction.  Subsequently handles
 * requests to classify images through the .analyzeImage API.
 * Successful requests will post a chrome message with
 * 'ADD_PREDICTION_TO_IMAGES' action, which the content.js can
 * hear and use to manipulate the DOM.
 */
class ImageClassifier {
  constructor() {
    this.loadModel();
  }

  /**
   * Loads mobilenet from URL and keeps a ref erence to it in the object.
   */
  async loadModel() {
    console.log("Loading model...");
    const startTime = performance.now();
    try {
      this.model = await load({ version: 2, alpha: 1.0 });
      // Warms up the model by causing intermediate tensor values
      // to be built and pushed to GPU.
      tidy(() => {
        this.model.classify(zeros([1, IMAGE_SIZE, IMAGE_SIZE, 3]));
      });
      const totalTime = Math.floor(performance.now() - startTime);
      console.log(`Model loaded and initialized in ${totalTime} ms...`);
    } catch (e) {
      console.error("Unable to load model", e);
    }
  }

  /**
   * Triggers the model to make a prediction on the image referenced by the
   * image data. After a successful prediction a IMAGE_CLICK_PROCESSED message
   * when complete, for the content.js script to hear and update the DOM with
   * the results of the prediction.
   *
   * @param {ImageData} imageData ImageData of the image to analyze.
   * @param {string} url url of image to analyze.
   * @param {number} tabId which tab the request comes from.
   */
  async analyzeImageAndSendMessage(imageData, url, tabId) {
    if (!this.model) {
      console.log("Waiting for model to load...");
      setTimeout(
        () => this.analyzeImageAndSendMessage(imageData, url, tabId),
        FIVE_SECONDS_IN_MS
      );
      return;
    }
    console.log("Predicting...");
    const startTime = performance.now();
    const predictions = await this.model.classify(imageData, TOP_K_PREDICTIONS);
    const totalTime = performance.now() - startTime;
    console.log(`Done in ${totalTime.toFixed(1)} ms `);
    const message = {
      action: "ADD_PREDICTION_TO_IMAGES",
      url,
      predictions,
    };
    chrome.tabs.sendMessage(tabId, message);
  }
}

const imageClassifier = new ImageClassifier();

/**
 * Adds a listener to listen for messages from the content script for analyzing images.
 */

chrome.runtime.onMessage.addListener(
  async function (message, sender, sendResponse) {
    if (message.action === "ANALYZE_IMAGE") {
      const image = new ImageData(
        new Uint8ClampedArray(message.imageData.data),
        message.imageData.width,
        message.imageData.height
      );
      imageClassifier.analyzeImageAndSendMessage(
        image,
        message.src,
        sender.tab.id
      );
    }
  }
);

/**
 * Adds a right-click menu option to trigger classifying the image.
 * The menu option should only appear when right-clicking an image.
 */
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "contextMenu0",
    title: "Classify image with TensorFlow.js ",
    contexts: ["image"],
  });
});

chrome.contextMenus.onClicked.addListener(clickMenuCallback);
