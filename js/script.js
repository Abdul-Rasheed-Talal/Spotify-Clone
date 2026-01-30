let currentSong = new Audio();
let songs = [];
let currFolder = "";
let currentSongIndex = 0;

function secondsToMinutesSeconds(seconds) {
    if (isNaN(seconds) || seconds < 0) return "00:00";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

async function getSongs(folder) {
    currFolder = folder;
    let a = await fetch(`http://127.0.0.1:3000/${folder}/`);
    let response = await a.text();
    let div = document.createElement("div");
    div.innerHTML = response;
    let as = div.getElementsByTagName("a");
    let songList = [];

    for (let index = 0; index < as.length; index++) {
        const element = as[index];
        if (element.href.endsWith(".mp3")) {
            let url = decodeURIComponent(element.href);
            url = url.replace(/\\/g, '/');
            let filename = url.split('/').pop();
            songList.push(filename.split('?')[0]);
        }
    }
    return songList;
}

function playSongByIndex(index) {
    if (index >= 0 && index < songs.length) {
        let song = songs[index];
        currentSongIndex = index;
        currentSong.src = `/${currFolder}/${song}`;

        currentSong.play().then(() => {
            document.querySelector(".song-info").innerHTML = song.replace('.mp3', '');
            document.getElementById("play").src = "./assets/pause.svg";
        }).catch(error => {
            console.error("Error playing song:", error);
        });
    }
}

function updateSongsList() {
    let songUL = document.querySelector(".songs-list").getElementsByTagName("ul")[0];
    songUL.innerHTML = "";

    for (const song of songs) {
        let displayName = song.replace('.mp3', '');
        songUL.innerHTML += `<li>
            <img class="invert" src="/assets/music.svg" alt="music">
            <div class="info">
                <div>${displayName}</div>
                <div>Song Artist</div>
            </div>
            <div class="playnow">
                <span>Play Now</span>
                <img class="invert" src="./assets/play.svg" alt="playnow">
            </div>
        </li>`;
    }

    Array.from(songUL.getElementsByTagName("li")).forEach((e, index) => {
        e.addEventListener("click", () => {
            playSongByIndex(index);
        });
    });
}

async function displayAlbums() {
    try {
        let a = await fetch(`/songs/`)
        if (!a.ok) return;
        
        let response = await a.text();
        let div = document.createElement("div")
        div.innerHTML = response;
        let anchors = div.getElementsByTagName("a")
        let cardContainer = document.querySelector(".cardContainer")

        cardContainer.innerHTML = "";

        for (let i = 0; i < anchors.length; i++) {
            const e = anchors[i];
            let decodedHref = decodeURIComponent(e.href);

            if ((decodedHref.includes("/songs/") || decodedHref.includes("\\songs\\")) &&
                !decodedHref.includes(".htaccess")) {

                let folder;
                if (decodedHref.includes("\\songs\\")) {
                    let parts = decodedHref.split('\\');
                    folder = parts[parts.length - 1].replace('/', '');
                } else {
                    let parts = decodedHref.split('/');
                    folder = parts[parts.length - 2] || parts[parts.length - 1].replace('/', '');
                }

                try {
                    let metadataResponse = await fetch(`/songs/${folder}/info.json`)
                    if (!metadataResponse.ok) continue;
                    
                    let metadata = await metadataResponse.json();

                    cardContainer.innerHTML += ` 
                    <div data-folder="${folder}" class="card">
                        <div class="play">
                            <svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="24" cy="24" r="24" fill="#1DB954"/>
                                <path d="M31.5 24C31.5 24.828 30.866 25.5 30.066 25.5L19.934 25.5C19.134 25.5 18.5 24.828 18.5 24C18.5 23.172 19.134 22.5 19.934 22.5L30.066 22.5C30.866 22.5 31.5 23.172 31.5 24Z" fill="black"/>
                                <path d="M30.366 24L20.134 30.696C19.434 31.152 18.5 30.624 18.5 29.796L18.5 18.204C18.5 17.376 19.434 16.848 20.134 17.304L30.366 24Z" fill="black"/>
                            </svg>
                        </div>
                        <img src="/songs/${folder}/cover.jpg" alt="${metadata.title}">
                        <h2>${metadata.title}</h2>
                        <p>${metadata.description}</p>
                    </div>`;

                } catch (error) {
                    console.error(`Error loading ${folder}:`, error);
                }
            }
        }
    } catch (error) {
        console.error("Error in displayAlbums:", error);
    }
}

async function main() {
    await displayAlbums();
    songs = await getSongs("songs/NFAK");

    if (songs.length > 0) {
        currentSong.src = `/${currFolder}/${songs[0]}`;
        document.querySelector(".song-info").innerHTML = songs[0].replace('.mp3', '');
        document.querySelector(".song-time").innerHTML = "00:00 / 00:00";
    }

    updateSongsList();

    // Load the library when card is clicked
    Array.from(document.getElementsByClassName("card")).forEach(e => {
        e.addEventListener("click", async item => {
            songs = await getSongs(`songs/${item.currentTarget.dataset.folder}`);
            updateSongsList();
            
            // CHANGED: Play the first song when clicking an album
            if (songs.length > 0) {
                playSongByIndex(0);
            }
        });
    });

    const playButton = document.getElementById("play");
    playButton.addEventListener("click", () => {
        if (!currentSong.src) {
            if (songs.length > 0) playSongByIndex(0);
            return;
        }

        if (currentSong.paused) {
            currentSong.play().then(() => {
                playButton.src = "./assets/pause.svg";
            });
        } else {
            currentSong.pause();
            playButton.src = "./assets/play.svg";
        }
    });

    currentSong.addEventListener("timeupdate", () => {
        if (currentSong.duration) {
            document.querySelector(".song-time").innerHTML =
                `${secondsToMinutesSeconds(currentSong.currentTime)} / ${secondsToMinutesSeconds(currentSong.duration)}`;
            document.querySelector(".circle").style.left = (currentSong.currentTime / currentSong.duration) * 100 + "%";
        }
    });

    document.querySelector(".seekbar").addEventListener("click", e => {
        if (currentSong.duration) {
            let percent = (e.offsetX / e.target.getBoundingClientRect().width) * 100;
            document.querySelector(".circle").style.left = percent + "%";
            currentSong.currentTime = (currentSong.duration * percent) / 100;
        }
    });

    document.getElementById("previous").addEventListener("click", () => {
        if (songs.length > 0 && currentSongIndex > 0) {
            playSongByIndex(currentSongIndex - 1);
        }
    });

    document.getElementById("next").addEventListener("click", () => {
        if (songs.length > 0 && currentSongIndex < songs.length - 1) {
            playSongByIndex(currentSongIndex + 1);
        }
    });

    document.querySelector(".volume input").addEventListener("change", (e) => {
        currentSong.volume = parseInt(e.target.value) / 100;
    });

    document.querySelector(".hamburger").addEventListener("click", () => {
        document.querySelector(".left").style.left = "0";
    });

    document.querySelector(".close").addEventListener("click", () => {
        document.querySelector(".left").style.left = "-120%";
    });

    document.querySelector(".volume>img").addEventListener("click", e => {
        if (e.target.src.includes("volume.svg")) {
            e.target.src = e.target.src.replace("volume.svg", "mute.svg");
            currentSong.volume = 0;
            document.querySelector(".range").getElementsByTagName("input")[0].value = 0;
        }
        else {
            e.target.src = e.target.src.replace("mute.svg", "volume.svg");
            currentSong.volume = .10;
            document.querySelector(".range").getElementsByTagName("input")[0].value = 10;
        }
    });
}

main();