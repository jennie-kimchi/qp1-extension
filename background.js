let latestAccessToken = '', latestTokenSelector = '';

chrome.webRequest.onBeforeSendHeaders.addListener(
  function (details) {
    if (details.url.includes("https://api.608939.com/api/bo/accountManagerList")) {
      for (let header of details.requestHeaders) {
        if (header.name.toLowerCase() === "access-token") {
          latestAccessToken = header.value;
          console.log("Latest Access Token:", latestAccessToken);
          chrome.storage.local.set({ accessToken: latestAccessToken });
        }else if(header.name.toLowerCase() === "token-selector"){
          latestTokenSelector = header.value;
          console.log("Latest Token Selector:", latestTokenSelector);
          chrome.storage.local.set({ tokenSelector: latestTokenSelector });
        }
      }
    }
  },
  { urls: ["https://api.608939.com/api/bo/accountManagerList"] },
  ["requestHeaders"]
);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "getAccessToken") {
    chrome.storage.local.get("accessToken", (data) => {
      sendResponse({ accessToken: data.accessToken || null });
    });
    return true;
  }
});
