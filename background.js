chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  const isGitHub = tab.url?.startsWith("https://github.com/");
  if (isGitHub && changeInfo.status === "complete") {
    chrome.tabs.sendMessage(tab.id, { url: tab.url });
  }
});
