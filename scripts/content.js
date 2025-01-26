// variables
let isObserving = false;
let previousURL = null;

// mutation observer initialization
const getElementWithCodeOwner = () => {
  const element = document.createElement("div");
  element.innerText = "@toddle-edu/frontend-team-3";
  element.classList.add("text-mono", "text-small", "wb-break-all", "mr-2");
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

const handleComparePage = (mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === "childList") {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1 && node.dataset?.ignoreMutation !== "true") {
          const headers = node.querySelectorAll(".file-header");
          headers.forEach((container) => {
            const fileInfoEle = container.querySelector(".file-info");
            const element = getElementWithCodeOwner();

            // Create a wrapper div with flex-direction column
            const wrapperDiv = document.createElement("div");
            wrapperDiv.style.display = "flex";
            wrapperDiv.style.flexDirection = "column";
            wrapperDiv.style.flex = 1;

            console.log({ container, fileInfoEle });

            if (fileInfoEle) {
              container.replaceChild(wrapperDiv, fileInfoEle);
              wrapperDiv.appendChild(fileInfoEle);
              wrapperDiv.appendChild(element);
            }
          });
        }
      });
    }
  });
  //   console.log("handleComparePage");
  //   const containers = document.querySelectorAll("copilot-diff-entry");
  //   console.log(containers);
  //   containers.forEach((container) => {
  //     const element = getElementWithCodeOwner();
  //     container.appendChild(element);
  //   });
};

const MUTATION_HANDLER = {
  SUMMARY: handleSummaryPage,
  FILES: handleFilesPage,
  COMPARE: handleComparePage,
};

const PAGE_LOAD_HANDLER = {
  SUMMARY: handleSummaryPageLoad,
  FILES: handleFilesPage,
  COMPARE: () => {},
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

  PAGE_LOAD_HANDLER[pageType]();

  const observerCallback = MUTATION_HANDLER[pageType];
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

  previousURL = url;

  const isBranchPage = url.includes("/pull/") || url.includes("/compare/");
  if (isBranchPage) {
    startObserving(message);
  } else if (!isBranchPage) {
    stopObserving();
  }
});
