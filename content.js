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
      await exportToCSV(data, token, tokenSelector, end_date);
      return data;
  } catch (error) {
      console.error("Error fetching API data:", error);
  }
}

async function exportToCSV(apiResponse, token, tokenSelector, end_date) {
  if (!apiResponse || !apiResponse.data || !apiResponse.data.rows) {
      console.error("Invalid API response");
      return;
  }

  const rows = apiResponse.data.rows;
  // Define only the headers (columns) you want to export
  const selectedHeaders = [
    "member_account_id",
    "username",
    "name",
    "mobile",
    "locale",
    "currency",
    "kpi_deposit_amount",
    "fav_game_category"
  ];
  // Additional columns to append
  const additionalHeaders = ["game_provider_code", "game_account","total_bet_amount"];
  let csvContent = "\uFEFF" + [...selectedHeaders, ...additionalHeaders].join(",") + "\n"; // Create CSV header row

  // Convert each row into CSV format
  const userPromises = rows.map(async (row) => {
    const additionalData = await fetchAdditionalData(row.username, token, tokenSelector, end_date);
    
    // Extract relevant fields from additionalData (Modify this part as per API response)
    const add_game_provider = additionalData?.game_provider_code || "N/A";
    const add_game_account = additionalData?.game_account || "N/A";
    const add_bet_amount = additionalData?.total_bet_amount || "N/A";

    const values = selectedHeaders.map(header => {
        let cell = row[header];
        if (cell === null || cell === undefined) {
            cell = "";
        } else if (typeof cell === "string") {
            cell = `"${cell.replace(/"/g, '""')}"`; // Escape quotes
        }
        return cell;
    });

    // Append additional data
    values.push(add_game_provider, add_game_account, add_bet_amount);

    return values.join(",");
  });

  const userData = await Promise.all(userPromises);
  csvContent += userData.join("\n");

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

async function fetchAdditionalData(username, token, tokenSelector, end_date) {
  const date30DaysBefore = await getDate30DaysBefore(end_date);
  const url = `https://api.608939.com/api/bo/report/memberreport?perPage=100&username=${encodeURIComponent(username)}&start_date_time=${date30DaysBefore}%2016:00:00&end_date_time=${end_date}%2015:59:59`;

  try {
      const response = await fetch(url, {
          method: "GET",
          headers: {
              "Access-Token": token,
              "Authorization": `Bearer ${token}`,
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
              "Token-Selector": tokenSelector
          }
      });

      if (!response.ok) throw new Error("Failed to fetch additional data");

      const data = await response.json();

        // Ensure data exists
        if (!data || !data.data || !data.data.rows || data.data.rows.length === 0) return null;

        // Find the record with the highest total_bet_amount
        let bestRecord = data.data.rows.reduce((max, row) => {
            return parseFloat(row.total_bet_amount) > parseFloat(max.total_bet_amount) ? row : max;
        }, data.data.rows[0]);

        // Extract only required fields
        return {
            game_provider_code: bestRecord.game_provider_code,
            game_account: bestRecord.game_account,
            total_bet_amount: bestRecord.total_bet_amount
        };

    } catch (error) {
        console.error(`Error fetching data for ${username}:`, error);
        return null;
    }
}

async function getDate30DaysBefore(dateString) {
  let date = new Date(dateString);
  date.setDate(date.getDate() - 30);
  return date.toISOString().split('T')[0];
}
