const saveButton = document.querySelector("#saveButton");
const codeownersTextarea = document.querySelector("#codeownersTextarea");

chrome.storage.local.get(["codeowners"], (result) => {
  if (result.codeowners) {
    codeownersTextarea.value = result.codeowners;
  }
});

saveButton.addEventListener("click", () => {
  chrome.storage.local.set({ codeowners: codeownersTextarea.value });
});
