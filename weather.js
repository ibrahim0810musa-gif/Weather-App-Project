// ======================================
// PHASE 1: CONNECT TO HTML ELEMENTS
// ======================================

const cityInput = document.getElementById("city-input");
const searchButton = document.getElementById("search-button");
const message = document.getElementById("message");
const locationSelect = document.getElementById("location-select");
const weatherResult = document.getElementById("weather-result");

// Store matching locations returned by the API
let weatherPlaces = [];


// ======================================
// PHASE 2: WEATHER CODES AND ICONS
// ======================================

function getWeatherInfo(code) {
  if (code === 0) {
    return { description: "Clear sky", icon: "☀️" };
  } else if (code === 1 || code === 2) {
    return { description: "Partly cloudy", icon: "🌤️" };
  } else if (code === 3) {
    return { description: "Overcast", icon: "☁️" };
  } else if ([45, 48].includes(code)) {
    return { description: "Foggy", icon: "🌫️" };
  } else if ([51, 53, 55, 56, 57].includes(code)) {
    return { description: "Drizzle", icon: "🌦️" };
  } else if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return { description: "Rain", icon: "🌧️" };
  } else if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return { description: "Snow", icon: "❄️" };
  } else if ([95, 96, 99].includes(code)) {
    return { description: "Thunderstorm", icon: "⛈️" };
  }

  return { description: "Unknown conditions", icon: "🌡️" };
}


// ======================================
// PHASE 3: DISPLAY WEATHER INFORMATION
// ======================================

function displayWeather(place, current) {
  const info = getWeatherInfo(current.weather_code);

  document.getElementById("city-name").textContent =
    place.name + (place.country ? ", " + place.country : "");

  document.getElementById("weather-icon").textContent =
    info.icon;

  document.getElementById("temperature").textContent =
    Math.round(current.temperature_2m) + "°C";

  document.getElementById("description").textContent =
    info.description;

  document.getElementById("humidity").textContent =
    current.relative_humidity_2m + "%";

  document.getElementById("wind-speed").textContent =
    current.wind_speed_10m + " km/h";

  weatherResult.hidden = false;
}


// ======================================
// PHASE 4: GET WEATHER FOR A LOCATION
// ======================================

async function getWeather(place) {
  const weatherURL =
    `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=5`;

  const response = await fetch(weatherURL);

  if (!response.ok) {
    throw new Error("Weather request failed.");
  }

  const data = await response.json();

  if (!data.current || !data.daily) {
    throw new Error("Weather data is unavailable.");
  }

  displayWeather(place, data.current);
  displayForecast(data.daily);
}

function displayForecast(daily) {
  const forecastList = document.getElementById("forecast-list");

  forecastList.innerHTML = "";

  daily.time.forEach(function (date, index) {
    const info = getWeatherInfo(daily.weather_code[index]);

    const forecastCard = document.createElement("div");
    forecastCard.className = "forecast-day";

    const dayName = new Date(date + "T12:00:00")
      .toLocaleDateString("en", { weekday: "short" });

    forecastCard.innerHTML = `
      <p>${dayName}</p>
      <p class="forecast-icon">${info.icon}</p>
      <p>${info.description}</p>
      <p class="forecast-temperature">
        ${Math.round(daily.temperature_2m_max[index])}°C
      </p>
      <p>
        Low: ${Math.round(daily.temperature_2m_min[index])}°C
      </p>
    `;

    forecastList.appendChild(forecastCard);
  });
}

// ======================================
// PHASE 5: SEARCH CITIES AND LOCAL AREAS
// ======================================

searchButton.addEventListener("click", async function () {
  const city = cityInput.value.trim();

  if (city === "") {
    message.textContent = "Please enter a city or local area.";
    locationSelect.hidden = true;
    return;
  }

  message.textContent = "Searching for locations...";
  locationSelect.hidden = true;
  weatherResult.hidden = true;
  searchButton.disabled = true;

  try {
    const geoURL =
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=10&language=en&format=json`;

    const response = await fetch(geoURL);

    if (!response.ok) {
      throw new Error("Location search failed.");
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      message.textContent =
        "No location found. Try another name or spelling.";
      return;
    }

    weatherPlaces = data.results;

    // Remove options from the previous search
    locationSelect.innerHTML =
      '<option value="">Choose a location...</option>';

    // Add every matching location to the dropdown
    weatherPlaces.forEach(function (place, index) {
      const option = document.createElement("option");

      option.value = index;

      option.textContent =
        place.name +
        (place.admin1 ? ", " + place.admin1 : "") +
        (place.country ? ", " + place.country : "");

      locationSelect.appendChild(option);
    });

    locationSelect.hidden = false;
    message.textContent =
      "Found " + weatherPlaces.length +
      " locations. Choose one from the list.";

  } catch (error) {
    message.textContent =
      "Search failed. Check your internet and try again.";

    console.error(error);

  } finally {
    searchButton.disabled = false;
  }
});


// ======================================
// LOAD WEATHER WHEN A LOCATION IS CHOSEN
// ======================================

locationSelect.addEventListener("change", async function () {
  if (locationSelect.value === "") {
    return;
  }

  const place = weatherPlaces[Number(locationSelect.value)];

  if (!place) {
    message.textContent = "Please choose a valid location.";
    return;
  }

  message.textContent = "Loading weather...";
  weatherResult.hidden = true;

  try {
    await getWeather(place);
    saveRecentPlace(place);
    message.textContent = "Weather updated successfully!";

  } catch (error) {
    message.textContent =
      "Could not load weather. Check your internet and try again.";

    console.error(error);
  }
});


// ======================================
// SEARCH WHEN ENTER IS PRESSED
// ======================================

cityInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    searchButton.click();
  }
});



// ======================================
// Enable/Find My Location 
// ======================================
// FIND MY LOCATION — FIXED VERSION
const locationButton = document.getElementById("location-button");

locationButton.addEventListener("click", function () {
  if (!navigator.geolocation) {
    message.textContent = "Your browser does not support location.";
    return;
  }

  message.textContent = "Finding your location...";
  locationButton.disabled = true;

  navigator.geolocation.getCurrentPosition(
    async function (position) {
      const place = {
        name: "Your Location",
        country: "",
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };

      try {
        message.textContent = "Location found! Loading weather...";
        weatherResult.hidden = true;
        await getWeather(place);
        saveRecentPlace(place);
        message.textContent = "Weather for your current location!";
      } catch (error) {
        message.textContent =
          "Your location was found, but weather could not load. Check your internet and try again.";
        console.error(error);
      } finally {
        locationButton.disabled = false;
      }
    },
    function (error) {
      if (error.code === 1) {
        message.textContent =
  "Location permission denied. Allow location access in your browser settings, or search for a place instead.";;
      } else if (error.code === 2) {
        message.textContent =
          "Your location is unavailable. Turn on your phone's location service and try again.";
      } else if (error.code === 3) {
        message.textContent =
          "Location request timed out. Try again in a place with a better signal.";
      } else {
        message.textContent =
          "Could not get your location. Please search for your area instead.";
      }

      console.error("Location error:", error);
      locationButton.disabled = false;
    },
    {
      enableHighAccuracy: false,
      timeout: 15000,
      maximumAge: 60000
    }
  );
});

// PHASE 8: RECENT SEARCH HISTORY

const recentSearches = document.getElementById("recent-searches");
const clearHistoryButton = document.getElementById("clear-history");

function getSavedHistory() {
  try {
    return JSON.parse(localStorage.getItem("weatherHistory")) || [];
  } catch (error) {
    return [];
  }
}

function saveRecentPlace(place) {
  let history = getSavedHistory();

  const savedPlace = {
    name: place.name,
    admin1: place.admin1 || "",
    country: place.country || "",
    latitude: place.latitude,
    longitude: place.longitude
  };

  // Remove an existing copy of the same location.
  history = history.filter(function (item) {
    return !(
      item.name === savedPlace.name &&
      item.latitude === savedPlace.latitude &&
      item.longitude === savedPlace.longitude
    );
  });

  // Put the newest search first and keep only five.
  history.unshift(savedPlace);
  history = history.slice(0, 5);

  localStorage.setItem("weatherHistory", JSON.stringify(history));

  displayRecentSearches();
}

function displayRecentSearches() {
  const history = getSavedHistory();

  recentSearches.innerHTML = "";

  history.forEach(function (place) {
    const button = document.createElement("button");
    button.className = "history-item";
    button.textContent = place.name;

    button.addEventListener("click", async function () {
      message.textContent = "Loading " + place.name + "...";
      weatherResult.hidden = true;

      try {
        await getWeather(place);
        message.textContent = "Weather updated for " + place.name + "!";
      } catch (error) {
        message.textContent = "Could not load this location. Try again.";
        console.error(error);
      }
    });

    recentSearches.appendChild(button);
  });
}

clearHistoryButton.addEventListener("click", function () {
  localStorage.removeItem("weatherHistory");
  displayRecentSearches();
  message.textContent = "Recent searches cleared.";
});

// Show saved searches when the app opens.
displayRecentSearches();

// PHASE 9: LIGHT AND DARK MODE

const themeToggle = document.getElementById("theme-toggle");

// Restore the saved theme
const savedTheme = localStorage.getItem("weatherTheme");

if (savedTheme === "dark") {
  document.body.classList.add("dark-mode");
  themeToggle.textContent = "☀️ Light Mode";
}

// Switch themes when the button is clicked
themeToggle.addEventListener("click", function () {
  document.body.classList.toggle("dark-mode");

  if (document.body.classList.contains("dark-mode")) {
    themeToggle.textContent = "☀️ Light Mode";
    localStorage.setItem("weatherTheme", "dark");
  } else {
    themeToggle.textContent = "🌙 Dark Mode";
    localStorage.setItem("weatherTheme", "light");
  }
});