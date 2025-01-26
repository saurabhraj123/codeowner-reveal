// variables
let isObserving = false;
let previousURL = null;

// mutation observer initialization
const getElementWithCodeOwner = () => {
  const element = document.createElement("div");
  element.innerText = "@toddle-edu/frontend-team-3";
  element.classList.add(
    "text-mono",
    "text-small",
    "Link--primary",
    "wb-break-all",
    "mr-2"
  );
  element.dataset.ignoreMutation = "true"; // use this attribute wherever mutation has to be ignored
  return element;
};

const handleSummaryPageLoad = (ele = document) => {
  const reviewContainers = ele.querySelectorAll("div[id^='pullrequestreview'"); // id starts with pullrequestreview

  if (reviewContainers.length) {
    reviewContainers.forEach((reviewContainer) => {
      const reviewContainers = reviewContainer.querySelectorAll("turbo-frame");
      reviewContainers.forEach((reviewContainer) => {
        const summaryEle = reviewContainer.querySelector("summary");
        const element = getElementWithCodeOwner();
        summaryEle.appendChild(element);
      });
    });
  }
};

const handleSummaryPage = (mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === "childList") {
      mutation.addedNodes.forEach((node) => {
        // if node is not element type or has ignoreMutation attribute, return
        if (
          node.nodeType !== 1 ||
          node.dataset?.ignoreMutation === "true" ||
          node.tagName === "IMG" ||
          node.tagName === "A" ||
          node.tagName === "SCRIPT"
        )
          return;

        if (
          node.nodeName === "TURBO-FRAME" &&
          node.id.startsWith("review-thread-or-comment-id")
        ) {
          const summary = node.querySelector("summary");
          const element = getElementWithCodeOwner();
          summary.appendChild(element);
        } else {
          handleSummaryPageLoad(node);
        }
      });
    }
  });
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

  if (!isComparePage && !isFilesPage && !isSummaryPage) return;

  const pageType = isComparePage
    ? "COMPARE"
    : isFilesPage
    ? "FILES"
    : "SUMMARY";

  console.log("observing", pageType);

  const observerCallback = PAGE_HANDLER[pageType];
  observer = new MutationObserver(observerCallback);

  const targetNode = document.body;
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

  if (previousURL === url) return;

  handleSummaryPageLoad();

  previousURL = url;

  const isBranchPage = url.includes("/pull/") || url.includes("/compare/");
  if (isBranchPage) {
    startObserving(message);
  } else if (!isBranchPage) {
    stopObserving();
  }
});
