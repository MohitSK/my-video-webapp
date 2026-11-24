// =========================================================================
// 1. CONFIGURATION
// =========================================================================
// Paste your TMDB v3 API key here
const TMDB_API_KEY = "ce3df16a904fe0591886cf38d92c61ab";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const POSTER_BASE_URL = "https://image.tmdb.org/t/p/w342";
const BACKDROP_BASE_URL = "https://image.tmdb.org/t/p/w1280";
const STILL_BASE_URL = "https://image.tmdb.org/t/p/w300";

// Categories shown on the Home Page (Movies + TV Shows)
const HOME_CATEGORIES = [
    {
        title: "Trending Movies",
        endpoint: "/trending/movie/week",
        mediaType: "movie"
    },
    {
        title: "Trending TV Shows",
        endpoint: "/trending/tv/week",
        mediaType: "tv"
    },
    {
        title: "Popular Movies",
        endpoint: "/movie/popular",
        mediaType: "movie"
    },
    {
        title: "Popular TV Shows",
        endpoint: "/tv/popular",
        mediaType: "tv"
    },
    {
        title: "Top Rated Movies",
        endpoint: "/movie/top_rated",
        mediaType: "movie"
    }
];

// Add or edit your video embed servers here.
// Your video embed servers (Define both Movie and TV URL formats)
const EMBED_SERVERS = [
    {
        name: "VIDRIFT-NET",
        getMovieUrl: function(tmdbId) {
            return `https://embed.vidrift.net/embed/movie/${tmdbId}`;
        },
        getTvUrl: function(tmdbId, season, episode) {
            return `https://embed.vidrift.net/embed/tv/${tmdbId}/${season}/${episode}`;
        }
    },
    {
        name: "VIDEM-CC",
        getMovieUrl: function(tmdbId) {
            return `https://videm.cc/embed/movie/${tmdbId}`;
        },
        getTvUrl: function(tmdbId, season, episode) {
            return `https://videm.cc/embed//tv?tmdb=${tmdbId}&s=${season}&e=${episode}`;
        }
    },
    {
        name: "VIDBOLT-ST",
        getMovieUrl: function(tmdbId) {
            return `https://vidbolt.st/movie/${tmdbId}`;
        },
        getTvUrl: function(tmdbId, season, episode) {
            return `https://vidbolt.st/tv/${tmdbId}-${season}-${episode}`;
        }
    },
	{
        name: "VIDY-ST",
        getMovieUrl: function(tmdbId) {
            return `https://www.vidy.st/movie/${tmdbId}?color=DC2626`;
        },
        getTvUrl: function(tmdbId, season, episode) {
            return `https://www.vidy.st/tv/${tmdbId}/${season}/${episode}?color=DC2626&nextEpisode=true&episodeSelector=true`;
        }
    },
	{
        name: "VIDLY-PRO",
        getMovieUrl: function(tmdbId) {
            return `https://vidly.pro/movie/${tmdbId}`;
        },
        getTvUrl: function(tmdbId, season, episode) {
            return `https://vidly.pro/tv/${tmdbId}/${season}/${episode}?color=DC2626&nextEpisode=true&episodeSelector=true`;
        }
    }
];

// =========================================================================
// 2. APP STATE
// =========================================================================

let currentMediaType = "movie"; // "movie" or "tv"
let currentMediaId = null;
let currentTitle = "";
let currentSeason = 1;
let currentEpisode = 1;
let currentEpisodeName = "";
let currentServerIndex = 0;
let previousView = "home";

// =========================================================================
// 3. HTML ELEMENTS
// =========================================================================

const homeButton = document.getElementById("homeButton");
const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const errorBanner = document.getElementById("errorBanner");

// Views
const homeView = document.getElementById("homeView");
const searchView = document.getElementById("searchView");
const detailsView = document.getElementById("detailsView");
const playerView = document.getElementById("playerView");

// Home & Search elements
const categoriesContainer = document.getElementById("categoriesContainer");
const searchBackBtn = document.getElementById("searchBackBtn");
const searchHeading = document.getElementById("searchHeading");
const searchGrid = document.getElementById("searchGrid");

// Details elements
const detailsBackBtn = document.getElementById("detailsBackBtn");
const detailsBackdrop = document.getElementById("detailsBackdrop");
const detailsPoster = document.getElementById("detailsPoster");
const detailsTitle = document.getElementById("detailsTitle");
const detailsMeta = document.getElementById("detailsMeta");
const detailsGenres = document.getElementById("detailsGenres");
const playMovieBtn = document.getElementById("playMovieBtn");
const detailsOverview = document.getElementById("detailsOverview");

// TV Show Episodes elements
const episodesSection = document.getElementById("episodesSection");
const seasonSelect = document.getElementById("seasonSelect");
const episodesList = document.getElementById("episodesList");

// Player elements
const playerBackBtn = document.getElementById("playerBackBtn");
const playerTitle = document.getElementById("playerTitle");
const videoIframe = document.getElementById("videoIframe");
const serverButtons = document.getElementById("serverButtons");

// =========================================================================
// 4. NAVIGATION HELPERS
// =========================================================================

function showView(viewName) {
    if (viewName !== "player") {
        videoIframe.src = "";
    }

    homeView.classList.add("hidden");
    searchView.classList.add("hidden");
    detailsView.classList.add("hidden");
    playerView.classList.add("hidden");

	if (viewName === "home") {
        homeView.classList.remove("hidden");
        const firstCard = categoriesContainer.querySelector(".movie-card");
        if (firstCard) {
            firstCard.focus();
        }
    } else if (viewName === "search") {
        searchView.classList.remove("hidden");
    } else if (viewName === "details") {
        detailsView.classList.remove("hidden");
    } else if (viewName === "player") {
        playerView.classList.remove("hidden");
    }

    window.scrollTo(0, 0);
}

function showError(message) {
    errorBanner.textContent = message;
    errorBanner.classList.remove("hidden");
}

function clearError() {
    errorBanner.textContent = "";
    errorBanner.classList.add("hidden");
}

/**
 * Makes any HTML element selectable with a TV D-Pad remote.
 * - Adds tabindex="0" so D-Pad can land on it
 * - Scrolls smoothly into view (both horizontally and vertically) when focused
 * - Triggers the click action when the remote's OK / Enter button is pressed
 */
function makeTvFocusable(element, onSelectAction) {
    element.setAttribute("tabindex", "0");

    element.addEventListener("focus", function() {
        element.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: "center"
        });
    });

    element.addEventListener("keydown", function(event) {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelectAction();
        }
    });
}

// =========================================================================
// 5. EVENT LISTENERS
// =========================================================================

window.addEventListener("DOMContentLoaded", function() {
    loadHomeCategories();
});

homeButton.addEventListener("click", function() {
    searchInput.value = "";
    showView("home");
});

searchForm.addEventListener("submit", function(event) {
    event.preventDefault();
    const query = searchInput.value.trim();
    if (query !== "") {
        searchMedia(query);
    }
});

searchBackBtn.addEventListener("click", function() {
    showView("home");
});

detailsBackBtn.addEventListener("click", function() {
    showView(previousView);
});

playMovieBtn.addEventListener("click", function() {
    openPlayer();
});

playerBackBtn.addEventListener("click", function() {
    showView("details");
});

// When user picks a different season from the dropdown, load its episodes
seasonSelect.addEventListener("change", function() {
    currentSeason = parseInt(seasonSelect.value, 10);
    loadSeasonEpisodes(currentMediaId, currentSeason);
});

// Prevent the video iframe from stealing TV remote focus when it finishes loading
videoIframe.addEventListener("load", function() {
    const activeServerBtn = serverButtons.querySelector(".server-btn.active");
    if (activeServerBtn) {
        activeServerBtn.focus();
    }
});

// =========================================================================
// 6. TMDB API HELPER
// =========================================================================

async function fetchFromTmdb(endpoint) {
    clearError();

    const separator = endpoint.includes("?") ? "&" : "?";
    const fullUrl = `${TMDB_BASE_URL}${endpoint}${separator}api_key=${TMDB_API_KEY}`;

    const response = await fetch(fullUrl);
    const data = await response.json();

    if (!response.ok) {
        const msg = data.status_message || `HTTP Error ${response.status}`;
        throw new Error(msg);
    }

    return data;
}

// =========================================================================
// 7. HOME PAGE (CATEGORY ROWS)
// =========================================================================

async function loadHomeCategories() {
    categoriesContainer.innerHTML = "<p>Loading categories...</p>";

    try {
        categoriesContainer.innerHTML = "";

        for (let i = 0; i < HOME_CATEGORIES.length; i++) {
            const category = HOME_CATEGORIES[i];
            const data = await fetchFromTmdb(category.endpoint);

            const row = document.createElement("div");
            row.className = "category-row";

            const heading = document.createElement("h2");
            heading.className = "category-title";
            heading.textContent = category.title;
            row.appendChild(heading);

            const scroller = document.createElement("div");
            scroller.className = "card-scroller";

            const items = data.results || [];
            for (let j = 0; j < items.length; j++) {
                const card = createMediaCard(items[j], category.mediaType, "home");
                scroller.appendChild(card);
            }

            row.appendChild(scroller);
            categoriesContainer.appendChild(row);
        }
		// Put TV remote focus on the very first movie card automatically
        const firstCard = categoriesContainer.querySelector(".movie-card");
        if (firstCard) {
            firstCard.focus();
        }
    } catch (error) {
        showError("TMDB Error: " + error.message);
        console.error(error);
    }
}

// =========================================================================
// 8. SEARCH (MOVIES + TV SHOWS)
// =========================================================================

async function searchMedia(query) {
    showView("search");
    searchHeading.textContent = `Search Results for "${query}"`;
    searchGrid.innerHTML = "<p>Searching...</p>";

    try {
        const encodedQuery = encodeURIComponent(query);
        const data = await fetchFromTmdb(`/search/multi?query=${encodedQuery}`);
        const items = data.results || [];

        searchGrid.innerHTML = "";
        let count = 0;

        for (let i = 0; i < items.length; i++) {
            const item = items[i];

            // Keep only Movies and TV Shows (skip actors/people)
            if (item.media_type !== "movie" && item.media_type !== "tv") {
                continue;
            }

            const card = createMediaCard(item, item.media_type, "search");
            searchGrid.appendChild(card);
            count++;
        }

        if (count === 0) {
            searchGrid.innerHTML = "<p>No movies or TV shows found.</p>";
        }
    } catch (error) {
        searchGrid.innerHTML = "";
        showError("Search failed: " + error.message);
        console.error(error);
    }
}

/**
 * Builds a single clickable card for either a Movie or a TV Show.
 */
function createMediaCard(item, mediaType, sourceView) {
    // Movies use "title" and "release_date"; TV shows use "name" and "first_air_date"
    const title = item.title || item.name || "Untitled";
    const rawDate = item.release_date || item.first_air_date || "";
    const year = rawDate.length >= 4 ? rawDate.substring(0, 4) : "N/A";
    const rating = item.vote_average ? item.vote_average.toFixed(1) : "N/A";
    const badgeText = mediaType === "tv" ? "TV" : "Movie";

    const posterUrl = item.poster_path
        ? `${POSTER_BASE_URL}${item.poster_path}`
        : "https://via.placeholder.com/342x513?text=No+Poster";

    const card = document.createElement("div");
    card.className = "movie-card";
    card.innerHTML = `
        <span class="media-badge">${badgeText}</span>
        <img src="${posterUrl}" alt="${title}">
        <div class="movie-card-info">
            <div class="movie-card-title" title="${title}">${title}</div>
            <div class="movie-card-meta">
                <span>${year}</span>
                <span>★ ${rating}</span>
            </div>
        </div>
    `;

	const openThisItem = function() {
        previousView = sourceView;
        openDetails(item.id, mediaType);
    };

    card.addEventListener("click", openThisItem);
    makeTvFocusable(card, openThisItem);

    return card;
}

// =========================================================================
// 9. DETAILS PAGE (MOVIES & TV SHOWS)
// =========================================================================

async function openDetails(mediaId, mediaType) {
    currentMediaId = mediaId;
    currentMediaType = mediaType;
    showView("details");

    // Reset fields while loading
    detailsTitle.textContent = "Loading...";
    detailsMeta.textContent = "";
    detailsGenres.innerHTML = "";
    detailsOverview.textContent = "";
    playMovieBtn.classList.add("hidden");
    episodesSection.classList.add("hidden");
    episodesList.innerHTML = "";

    try {
        const endpoint = mediaType === "tv" ? `/tv/${mediaId}` : `/movie/${mediaId}`;
        const item = await fetchFromTmdb(endpoint);

        currentTitle = item.title || item.name || "Untitled";
        detailsTitle.textContent = currentTitle;

        // Backdrop image
        if (item.backdrop_path) {
            detailsBackdrop.style.backgroundImage = `url('${BACKDROP_BASE_URL}${item.backdrop_path}')`;
        } else {
            detailsBackdrop.style.backgroundImage = "none";
        }

        // Poster image
        detailsPoster.src = item.poster_path
            ? `${POSTER_BASE_URL}${item.poster_path}`
            : "https://via.placeholder.com/342x513?text=No+Poster";

        // Meta line
        const rawDate = item.release_date || item.first_air_date || "";
        const year = rawDate.length >= 4 ? rawDate.substring(0, 4) : "N/A";
        const rating = item.vote_average ? `★ ${item.vote_average.toFixed(1)}` : "N/A";

        if (mediaType === "movie") {
            const runtime = item.runtime ? `${item.runtime} min` : "N/A";
            detailsMeta.textContent = `${year}  •  ${runtime}  •  ${rating}`;
        } else {
            const seasonCount = item.number_of_seasons || 1;
            const seasonLabel = seasonCount === 1 ? "1 Season" : `${seasonCount} Seasons`;
            detailsMeta.textContent = `${year}  •  ${seasonLabel}  •  ${rating}`;
        }

        // Genre pills
        detailsGenres.innerHTML = "";
        const genres = item.genres || [];
        for (let i = 0; i < genres.length; i++) {
            const tag = document.createElement("span");
            tag.className = "genre-tag";
            tag.textContent = genres[i].name;
            detailsGenres.appendChild(tag);
        }

        // Plot summary
        detailsOverview.textContent = item.overview || "No description available.";

        // Show Movie Play Button OR TV Seasons & Episodes
        if (mediaType === "movie") {
            playMovieBtn.classList.remove("hidden");
        } else {
            episodesSection.classList.remove("hidden");
            populateSeasons(item.seasons || []);
        }

    } catch (error) {
        showError("Failed to load details: " + error.message);
        console.error(error);
    }
}

/**
 * Fills the Season dropdown and loads episodes for the first valid season.
 */
function populateSeasons(seasons) {
    seasonSelect.innerHTML = "";

    for (let i = 0; i < seasons.length; i++) {
        const season = seasons[i];

        // Skip Season 0 (Specials) if there are regular seasons
        if (season.season_number === 0 && seasons.length > 1) {
            continue;
        }

        const option = document.createElement("option");
        option.value = season.season_number;
        option.textContent = season.name || `Season ${season.season_number}`;
        seasonSelect.appendChild(option);
    }

    if (seasonSelect.options.length > 0) {
        currentSeason = parseInt(seasonSelect.value, 10);
        loadSeasonEpisodes(currentMediaId, currentSeason);
    }
}

/**
 * Fetches and displays the clickable list of episodes for a season.
 */
async function loadSeasonEpisodes(tvId, seasonNumber) {
    episodesList.innerHTML = "<p>Loading episodes...</p>";

    try {
        const data = await fetchFromTmdb(`/tv/${tvId}/season/${seasonNumber}`);
        const episodes = data.episodes || [];

        episodesList.innerHTML = "";

        if (episodes.length === 0) {
            episodesList.innerHTML = "<p>No episodes found for this season.</p>";
            return;
        }

        for (let i = 0; i < episodes.length; i++) {
            const ep = episodes[i];
            const epNumber = ep.episode_number;
            const epName = ep.name || `Episode ${epNumber}`;
            const epOverview = ep.overview || "No description available.";
            const thumbUrl = ep.still_path
                ? `${STILL_BASE_URL}${ep.still_path}`
                : "https://via.placeholder.com/300x169?text=No+Image";

            const epCard = document.createElement("div");
            epCard.className = "episode-card";
            epCard.innerHTML = `
                <img class="episode-thumb" src="${thumbUrl}" alt="${epName}">
                <div class="episode-info">
                    <div class="episode-title">E${epNumber}. ${epName}</div>
                    <div class="episode-overview">${epOverview}</div>
                </div>
            `;

            // Clicking an episode opens the player for that Season & Episode
			const playThisEpisode = function() {
			        currentEpisode = epNumber;
			        currentEpisodeName = epName;
			        openPlayer();
			};

		    epCard.addEventListener("click", playThisEpisode);
		    makeTvFocusable(epCard, playThisEpisode);

            episodesList.appendChild(epCard);
        }

    } catch (error) {
        episodesList.innerHTML = "<p>Failed to load episodes.</p>";
        console.error(error);
    }
}

// =========================================================================
// 10. VIDEO PLAYER & SERVER SWITCHER
// =========================================================================

function openPlayer() {
    currentServerIndex = 0;

    if (currentMediaType === "movie") {
        playerTitle.textContent = currentTitle;
    } else {
        playerTitle.textContent = `${currentTitle} — S${currentSeason} E${currentEpisode}: ${currentEpisodeName}`;
    }

    showView("player");
    renderServerButtons();
    loadIframeVideo();

	renderServerButtons();
    loadIframeVideo();

    // Focus the first server button so TV remote can easily switch servers
    const firstServerBtn = serverButtons.querySelector(".server-btn");
    if (firstServerBtn) {
        firstServerBtn.focus();
    }
}

function renderServerButtons() {
    serverButtons.innerHTML = "";

    for (let i = 0; i < EMBED_SERVERS.length; i++) {
        const server = EMBED_SERVERS[i];
        const btn = document.createElement("button");
        btn.className = "server-btn";
        btn.textContent = server.name;

        if (i === currentServerIndex) {
            btn.classList.add("active");
        }

        btn.addEventListener("click", function() {
            currentServerIndex = i;
            renderServerButtons();
            loadIframeVideo();
        });

        serverButtons.appendChild(btn);
    }
}

function loadIframeVideo() {
    const selectedServer = EMBED_SERVERS[currentServerIndex];

    if (currentMediaType === "movie") {
        videoIframe.src = selectedServer.getMovieUrl(currentMediaId);
    } else {
        videoIframe.src = selectedServer.getTvUrl(currentMediaId, currentSeason, currentEpisode);
    }
}
