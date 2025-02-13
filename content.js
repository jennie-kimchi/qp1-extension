chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SEND_DATA") {
    if(message.accessToken){
      fetchData(message.accessToken, message.start_date, message.end_date, message.stage);
    }else{
      alert("Extension error. Contact JX!");
      console.log("content.js error");
    }
  }
});

async function fetchData(token, start_date, end_date, stage) {
  const url = `https://api.608939.com/api/bo/accountmanagement?page=1&perPage=1000&currency_id=all&date_type=lead_assigned_datetime&start_date=${start_date}%2016:00:00&end_date=${end_date}%2015:59:59&status[0]=1&dummy=1&sort_by=id&sort_order=desc&development_stage=${stage}`;


  const headers = {
      "Access-Token": token,
      "Authorization": `Bearer ${token}`,
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
      "Token-Selector": chrome.storage.local.get("tokenSelector"),
  };

  try {
      const response = await fetch(url, {
          method: "GET",
          headers: headers,
      });

      if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      console.log("API Response:", data);
      return data;
  } catch (error) {
      console.error("Error fetching API data:", error);
  }
}

