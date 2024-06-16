const TEXT_DIV_CLASSNAME = "tfjs-mobilenet-extension-text";
const TEXT_CONTAINER_CLASSNAME = "tfjs-mobilenet-extension-text-container";
const HIGH_CONFIDENCE_THRESHOLD_DEFAULT = 0.5;
const LOW_CONFIDENCE_THRESHOLD_DEFAULT = 0.1;
const IMAGE_SIZE = 224; // Size of the image expected by mobilenet.
const MIN_IMG_SIZE = 128;

/**
 * Produces a short text string summarizing the prediction
 * Input prediction should be a list of {className: string, prediction: float}
 * objects.
 * @param {[{className: string, predictions: number}]} predictions ordered list
 *     of objects, each with a prediction class and score
 */
async function getTextContentFromPrediction(predictions) {
  const settings = await chrome.storage.sync.get([
    "HIGH_CONFIDENCE_THRESHOLD",
    "LOW_CONFIDENCE_THRESHOLD",
  ]);

  const HIGH_CONFIDENCE_THRESHOLD =
    settings.HIGH_CONFIDENCE_THRESHOLD !== undefined
      ? settings.HIGH_CONFIDENCE_THRESHOLD
      : HIGH_CONFIDENCE_THRESHOLD_DEFAULT;
  const LOW_CONFIDENCE_THRESHOLD =
    settings.LOW_CONFIDENCE_THRESHOLD !== undefined
      ? settings.LOW_CONFIDENCE_THRESHOLD
      : LOW_CONFIDENCE_THRESHOLD_DEFAULT;

  if (!predictions || predictions.length < 1) {
    return `No prediction 🙁`;
  }

  // Confident.
  if (predictions[0].probability >= HIGH_CONFIDENCE_THRESHOLD) {
    return `😄 ${predictions[0].className}!`;
  }
  // Not Confident.
  if (
    predictions[0].probability >= LOW_CONFIDENCE_THRESHOLD &&
    predictions[0].probability < HIGH_CONFIDENCE_THRESHOLD
  ) {
    return `${predictions[0].className}?...\n Maybe ${predictions[1].className}?`;
  }
  // Very not confident.
  if (predictions[0].probability < LOW_CONFIDENCE_THRESHOLD) {
    return `😕  ${predictions[0].className}????...\n Maybe ${predictions[1].className}????`;
  }
}

/**
 *  Moves the provided imgNode into a container div, and adds a text div as a
 * peer.  Styles the container div and text div to place the text
 * on top of the image.
 * @param {HTMLElement} imgNode Which image node to write content on.
 * @param {string} textContent What text to write on the image.
 */
function addTextElementToImageNode(imgNode, textContent) {
  const originalParent = imgNode.parentElement;
  const container = document.createElement("div");
  const text = document.createElement("div");

  container.className = TEXT_CONTAINER_CLASSNAME;
  text.className = TEXT_DIV_CLASSNAME;

  originalParent.insertBefore(container, imgNode);
  container.appendChild(imgNode);
  container.appendChild(text);

  text.textContent = textContent;
}

// Add a listener to hear from the content.js page when the image is through
// processing.  The message should contain an action, a url, and predictions (the
// output of the classifier)
//
// message: {action, url, predictions}
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message) {
    return;
  }

  switch (message.action) {
    case "REMOVE_EXTENSION_TEXTS":
      Array.from(document.querySelectorAll(`.${TEXT_DIV_CLASSNAME}`)).forEach(
        (div) => div.parentNode.removeChild(div)
      );
      break;
    case "CLASSIFY_FIRST_N_IMAGES":
      Array.from(document.querySelectorAll('img[class="YQ4gaf"]'))
        .slice(0, 10)
        .forEach((image) => {
          getImageDataFromSrc(image.src).then((imageData) =>
            chrome.runtime.sendMessage({
              action: "ANALYZE_IMAGE",
              imageData: imageData,
              src: image.src,
            })
          );
        });
      break;
    case "GET_IMAGE_DATA":
      getImageDataFromSrc(message.url).then((imageData) =>
        sendResponse(imageData)
      );
      return true;
    case "ADD_PREDICTION_TO_IMAGES":
      if (message.url && message.predictions) {
        Array.from(document.getElementsByTagName("img"))
          .filter((x) => x.src === message.url)
          .forEach((node) => {
            getTextContentFromPrediction(message.predictions).then(
              (textContent) => addTextElementToImageNode(node, textContent)
            );
          });
      }
      break;
    default:
      break;
  }
});

function getImageDataFromSrc(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onerror = function (e) {
      console.warn(`Could not load image from external source ${src}.`);
      resolve(null);
    };
    img.onload = function (e) {
      // When image is loaded, render it to a canvas and send its ImageData back
      // to the service worker.
      if (
        (img.height && img.height > MIN_IMG_SIZE) ||
        (img.width && img.width > MIN_IMG_SIZE)
      ) {
        img.width = IMAGE_SIZE;
        img.height = IMAGE_SIZE;

        const canvas = new OffscreenCanvas(img.width, img.height);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        resolve({
          data: Array.from(imageData.data),
          height: imageData.height,
          width: imageData.width,
        });
        return;
      }
      console.warn(
        `Image size too small. [${img.height} x ${img.width}] vs. minimum [${MIN_IMG_SIZE} x ${MIN_IMG_SIZE}]`
      );
      resolve(null);
    };
    img.src = src;
  });
}
