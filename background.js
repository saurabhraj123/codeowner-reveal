chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  const isGitHub = tab.url?.startsWith("https://github.com/");
  const isTabUpdateInProgress = changeInfo.status === "loading";
  console.log({ changeInfo });
  if (isGitHub && changeInfo.status === "complete") {
    chrome.tabs.sendMessage(tab.id, { url: tab.url });
  }
});
