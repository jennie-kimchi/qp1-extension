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

async function fetchData(token, start_date, end_date, stage, status, tokenSelector) {
  const url = `https://api.608939.com/api/bo/accountmanagement?page=1&perPage=1000&currency_id=all&date_type=lead_assigned_datetime&start_date=${start_date}%2016:00:00&end_date=${end_date}%2015:59:59&dummy=1&sort_by=id&sort_order=desc&development_stage=${stage}${status}`;

  const headers = {
      "Access-Token": token,
      "Authorization": `Bearer ${token}`,
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
      "Token-Selector": tokenSelector,
  };

  try {
      const response = await fetch(url, { method: "GET", headers: headers });
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
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
  const selectedHeaders = [
    "member_account_id", "username", "name", "mobile", "locale", "currency", "kpi_deposit_amount", "fav_game_category"
  ];
  const additionalHeaders = ["game_provider_code", "game_account", "total_bet_amount", "most_played_game", "most_played_category", "total_win_lose"];
  let csvContent = "\uFEFF" + [...selectedHeaders, ...additionalHeaders].join(",") + "\n";

  const userPromises = rows.map(async (row) => {
    const additionalData = await fetchAdditionalData(row.username, token, tokenSelector, end_date);
    const add_game_provider = additionalData?.game_provider_code || "N/A";
    const add_game_account = additionalData?.game_account || "N/A";
    const add_bet_amount = additionalData?.total_bet_amount || "N/A";
    const add_game_name = additionalData?.most_played_game_name || "N/A";
    const add_game_cat = additionalData?.most_played_game_cat || "N/A";
    const add_game_win_lose = additionalData?.total_win_lose || "N/A";

    const values = selectedHeaders.map(header => {
        let cell = row[header];
        if (cell === null || cell === undefined) {
            cell = "";
        } else if (typeof cell === "string") {
            cell = `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
    });

    values.push(add_game_provider, add_game_account, add_bet_amount, add_game_name, add_game_cat, add_game_win_lose);
    return values.join(",");
  });

  const userData = await Promise.all(userPromises);
  csvContent += userData.join("\n");

  const filename = new Date().toISOString().replace(/[-T:.Z]/g, "").slice(0, 14) + "_data.csv";
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  chrome.runtime.sendMessage({ action: "downloadStatus", data: "complete"});
}

async function fetchAdditionalData(username, token, tokenSelector, end_date) {
  const date30DaysBefore = await getDateDaysBefore(end_date, 30);
  const memberReportURL = `https://api.608939.com/api/bo/report/memberreport?perPage=100&username=${encodeURIComponent(username)}&start_date_time=${date30DaysBefore}%2016:00:00&end_date_time=${end_date}%2015:59:59`;

  try {
      const response = await fetch(memberReportURL, { method: "GET", headers: { "Access-Token": token, "Authorization": `Bearer ${token}`, "User-Agent": "Mozilla/5.0", "Token-Selector": tokenSelector } });
      if (!response.ok) throw new Error("Failed to fetch member report");
      const data = await response.json();

      if (!data || !data.data || !data.data.rows || data.data.rows.length === 0) return null;
      let bestRecord = data.data.rows.reduce((max, row) => parseFloat(row.total_bet_amount) > parseFloat(max.total_bet_amount) ? row : max, data.data.rows[0]);
      const gameProvider = bestRecord.game_provider_code;
      const gameAccount = bestRecord.game_account;
      const betAmount = bestRecord.total_bet_amount;
      const currencyCode = bestRecord.currency_code;

      const gameResultData = await fetchGameResult(username, gameProvider, token, tokenSelector, end_date, currencyCode);

      return { game_provider_code: gameProvider, game_account: gameAccount, total_bet_amount: betAmount, most_played_game_name: gameResultData.most_played_game_name, most_played_game_cat: gameResultData.most_played_game_cat, total_win_lose: gameResultData.total_win_lose };
  } catch (error) {
      console.error(`Error fetching data for ${username}:`, error);
      return null;
  }
}

async function fetchGameResult(username, gameProvider, token, tokenSelector, end_date, currencyCode) {
  const date30DaysBefore = await getDateDaysBefore(end_date, 30);
  const gameResultURL = `https://api.608939.com/api/bo/report/gametype?paginate=true&page=1&perPage=15&option=game&game_sub_category_name=all&start_date_time=${date30DaysBefore}%2016:00:00&end_date_time=${end_date}%2015:59:59&game_provider_code=${encodeURIComponent(gameProvider)}&username=${encodeURIComponent(username)}`;

  try {
      const gameResponse = await fetch(gameResultURL, { method: "GET", headers: { "Access-Token": token, "Authorization": `Bearer ${token}`, "User-Agent": "Mozilla/5.0", "Token-Selector": tokenSelector } });
      if (!gameResponse.ok) throw new Error("Failed to fetch game results");
      const gameResData = await gameResponse.json();
      if (!gameResData || !gameResData.data || !gameResData.data.rows || !gameResData.data.rows[currencyCode]) return {
        most_played_game_name: "Error",
        most_played_game_cat: "Error",
        total_win_lose: 0
    };

      // Extract the "currency" row data
      const currencyData = gameResData.data.rows[currencyCode];

      // Filter out the "summary" and get the game data
      const gameData = Object.values(currencyData).filter(item => item.game_name && item.win_lose);

      // Find the game with the highest "win_lose"
      const highestWinLoseGame = gameData.reduce((max, current) => {
          return parseFloat(current.win_lose) > parseFloat(max.win_lose) ? current : max;
      }, gameData[0]);

      console.log("here", highestWinLoseGame);

      return {
          most_played_game_name: highestWinLoseGame?.game_name || "N/A",
          most_played_game_cat: highestWinLoseGame?.game_sub_category_name || "N/A",
          total_win_lose: highestWinLoseGame?.win_lose || "0"
      };
  } catch (error) {
      console.error(`Error fetching game result for ${username}:`, error);
      return "N/A";
  }
}

async function getDateDaysBefore(dateString, days) {
  let date = new Date(dateString);
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}
