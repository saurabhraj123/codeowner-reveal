// variables
let isObserving = false;
let previousURL = null;

// mutation observer initialization
const handleSummaryPage = () => {
  console.log("handleSummaryPage");
};

const handleFilesPage = () => {
  console.log("handleFilesPage");
};

const handleComparePage = () => {
  console.log("handleComparePage");
};

const PAGE_HANDLER = {
  SUMMARY: handleSummaryPage,
  FILES: handleFilesPage,
  COMPARE: handleComparePage,
};

let observer;

const observerConfig = {
  childList: true, // observe direct children changes
  attributes: true, // observe attribute changes
  subtree: true, // observe entire subtree
};

// handler functions
const startObserving = (message) => {
  if (observer) {
    stopObserving();
  }

  const url = message.url;
  const isComparePage = url.includes("/compare/");
  const isSummaryPage = url.split("/").slice(-2, -1)[0] === "pull";
  const isFilesPage =
    url.includes("/pull/") && url.split("/").pop().startsWith("files");

  console.log({ isComparePage, isSummaryPage, isFilesPage });

  if (!isComparePage && !isFilesPage && !isSummaryPage) return;

  const pageType = isComparePage
    ? "COMPARE"
    : isFilesPage
    ? "FILES"
    : "SUMMARY";

  console.log("observing", pageType);

  const observerCallback = PAGE_HANDLER[pageType];
  observer = new MutationObserver(observerCallback);

  const targetNode = document.body; // You can modify this to the specific node you want to observe
  observer.observe(targetNode, observerConfig);

  isObserving = true;
};

const stopObserving = () => {
  observer.disconnect();
  console.log("MutationObserver stopped");
  isObserving = false;
};

// ============== Content script related code ===================
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const url = message.url;
  console.log({ url });

  if (previousURL === url) return;
  previousURL = url;

  const isBranchPage = url.includes("/pull/") || url.includes("/compare/");
  if (isBranchPage) {
    startObserving(message);
  } else if (!isBranchPage) {
    stopObserving();
  }

  console.log("Received message from background:", message);
});
