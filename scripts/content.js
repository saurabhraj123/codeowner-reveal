// variables
let isObserving = false;
let previousURL = null;
let trie = null;

// trie
class TrieNode {
  constructor() {
    this.children = {};
    this.codeowner = null;
  }
}

class CodeOwnerTrie {
  constructor() {
    this.root = new TrieNode();
  }

  insert(path, codeowner) {
    const parts = path.split("/");
    let node = this.root;
    for (const part of parts) {
      if (!node.children[part]) {
        node.children[part] = new TrieNode();
      }
      node = node.children[part];
    }
    node.codeowner = codeowner;
  }

  search(filePath) {
    const parts = filePath.split("/");
    let node = this.root;
    let lastCodeowner = null;
    for (const part of parts) {
      if (node.children[part]) {
        node = node.children[part];
        if (node.codeowner !== null) {
          lastCodeowner = node.codeowner;
        }
      } else {
        break;
      }
    }
    return lastCodeowner;
  }
}

const getCodeownersFileContent = () => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(["codeowners"], (result) => {
      if (result.codeowners) {
        resolve(result.codeowners);
      } else {
        reject();
      }
    });
  });
};

const buildTrie = (codeownersFileContent) => {
  const codeownersArray = codeownersFileContent
    .split("\n")
    .filter((line) => line.length > 0);
  const trie = new CodeOwnerTrie();

  for (const line of codeownersArray) {
    const [path, codeowner] = line.split(/\s+/); // assuming space separates path and codeowner
    if (path && codeowner) {
      trie.insert(path, codeowner);
    }
  }

  return trie;
};

const getCodeowner = (fileName) => {
  return trie?.search(fileName);
};

// mutation observer initialization
const getElementWithCodeOwner = (filePath = "") => {
  const element = document.createElement("div");
  const codeowner = getCodeowner(filePath);
  element.innerText = codeowner || "No codeowner found";
  element.classList.add("text-mono", "text-small", "wb-break-all");
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

const updateFileHeader = (node = document) => {
  const headers = node.querySelectorAll(".file-header");
  headers.forEach((header) => {
    const filePath = header.dataset.path;
    const fileInfoEle = header.querySelector(".file-info");
    const element = getElementWithCodeOwner(filePath);

    const wrapperDiv = document.createElement("div");
    wrapperDiv.style.display = "flex";
    wrapperDiv.style.flexDirection = "column";
    wrapperDiv.style.flex = 1;

    if (fileInfoEle) {
      header.replaceChild(wrapperDiv, fileInfoEle);
      wrapperDiv.appendChild(fileInfoEle);
      wrapperDiv.appendChild(element);
    }
  });
};

const handleComparePage = (mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === "childList") {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1 && node.dataset?.ignoreMutation !== "true") {
          updateFileHeader(node);
        }
      });
    }
  });
};

const MUTATION_HANDLER = {
  SUMMARY: handleSummaryPage,
  FILES: handleComparePage,
  COMPARE: handleComparePage,
};

const PAGE_LOAD_HANDLER = {
  SUMMARY: handleSummaryPageLoad,
  FILES: updateFileHeader,
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
  const isFilesPage = url.includes("/pull/") && url.includes("files");

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

window.onload = async () => {
  try {
    const codeownersFileContent = await getCodeownersFileContent();

    if (codeownersFileContent) {
      trie = buildTrie(codeownersFileContent);
    }
  } catch (err) {
    console.log("Error while loading codeowners file.");
  }
};
