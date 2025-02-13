chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SEND_DATA") {
    if(message.accessToken){
      fetchData(message.accessToken, message.start_date, message.end_date, message.stage, message.status, message.tokenSelector);
    }else{
      alert("Extension error. Contact JX!");
      console.log("content.js error");
    }
  }
});

async function fetchData(token, start_date, end_date, stage, status,tokenSelector) {
  const url = `https://api.608939.com/api/bo/accountmanagement?page=1&perPage=1000&currency_id=all&date_type=lead_assigned_datetime&start_date=${start_date}%2016:00:00&end_date=${end_date}%2015:59:59&dummy=1&sort_by=id&sort_order=desc&development_stage=${stage}${status}`;


  const headers = {
      "Access-Token": token,
      "Authorization": `Bearer ${token}`,
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
      "Token-Selector": tokenSelector,
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
      exportToCSV(data);
      return data;
  } catch (error) {
      console.error("Error fetching API data:", error);
  }
}

function exportToCSV(apiResponse) {
  if (!apiResponse || !apiResponse.data || !apiResponse.data.rows) {
      console.error("Invalid API response");
      return;
  }

  const rows = apiResponse.data.rows;
  const headers = Object.keys(rows[0]); // Extract headers from first row
  let csvContent = headers.join(",") + "\n"; // Create CSV header row

  // Convert each row into CSV format
  rows.forEach(row => {
      const values = headers.map(header => {
          let cell = row[header];

          // Handle null, undefined, and escape special characters
          if (cell === null || cell === undefined) {
              cell = "";
          } else if (typeof cell === "string") {
              cell = `"${cell.replace(/"/g, '""')}"`; // Escape quotes
          }

          return cell;
      });

      csvContent += values.join(",") + "\n";
  });

  // Create dynamic filename with timestamp
  const filename = new Date().toISOString().replace(/[-T:.Z]/g, "").slice(0, 14) + "_data.csv";

  // Create and trigger download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}


