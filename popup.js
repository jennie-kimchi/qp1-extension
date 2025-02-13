(function() {
  const defaultD = defaultDate();
  document.getElementById("startDate").value = defaultD.start_date;
  document.getElementById("endDate").value = defaultD.end_date;
})();

document.getElementById("fetchToken").addEventListener("click", function () {
  let status_get = "";
  chrome.runtime.sendMessage({ type: "getAccessToken" }, (response) => {
    if(response.accessToken){
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        let start_date = document.getElementById("startDate").value;
        let end_date = document.getElementById("endDate").value;
        let stage = document.getElementById("stage").value;
        let status = Array.from(document.querySelectorAll('input[name="status"]:checked')).map(checkbox => checkbox.value);
        for (let i = 0; i < status.length; i++) {
          status_get += `&status[${i}]=${status[i]}`;
        }
        chrome.storage.local.get("tokenSelector", (data) => {
          chrome.tabs.sendMessage(tabs[0].id, { type: "SEND_DATA", accessToken: response.accessToken, start_date: start_date, end_date: end_date, stage: stage,status: status_get, tokenSelector: data.tokenSelector });
        });
        
      });
    }else{
      alert("Extension error. Contact JX!");
    }
  });
});

function defaultDate() {
  let curDate = new Date();
  const year = curDate.getFullYear();
  const month = curDate.getMonth() + 1;
  const d = curDate.getDate();
  curDate.setDate(curDate.getDate() - 1);
  const syear = curDate.getFullYear();
  const smonth = curDate.getMonth() + 1;
  const sd = curDate.getDate();
  
  return {
    end_date: `${year}-${month.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`,
    start_date: `${syear}-${smonth.toString().padStart(2, '0')}-${sd.toString().padStart(2, '0')}`
  };
}