
import { readFileSync, writeFileSync } from "fs";
import "dotenv/config";

const API_KEY = process.env.TMDB_API_KEY;
if (!API_KEY) {
    console.error("Missing TMDB_API_KEY — add it to a .env file next to this script.");
    process.exit(1);
}

const INPUT_FILE = "movies.json";
const DELAY_MS = 250;


function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}


function cleanTitle(rawTitle) {
    const match = rawTitle.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
    if (!match) return { searchTitle: rawTitle, year: null };

    const [, base, inside] = match;
    if (/^\d{4}$/.test(inside)) {
        return { searchTitle: rawTitle, year: inside };
    }
    return { searchTitle: base.trim(), year: null };
}

async function searchMovie(title, year) {
    const params = new URLSearchParams({
        api_key: API_KEY,
        query: title,
        include_adult: "false",
    });
    if (year) params.set("year", year);

    const res = await fetch(`https://api.themoviedb.org/3/search/movie?${params}`);
    if (!res.ok) {
        throw new Error(`TMDB error ${res.status} for "${title}"`);
    }
    const data = await res.json();
    return data.results?.[0] ?? null;
}

async function main() {
    const raw = readFileSync(INPUT_FILE, "utf-8");
    const genres = JSON.parse(raw);

    const cache = new Map();
    const notFound = [];
    const output = {};

    let processed = 0;
    const totalTitles = Object.values(genres).flat().length;

    for (const [genre, titles] of Object.entries(genres)) {
        output[genre] = [];

        for (const rawTitle of titles) {
            const { searchTitle, year } = cleanTitle(rawTitle);
            const cacheKey = `${searchTitle.toLowerCase()}::${year ?? ""}`;

            let result = cache.get(cacheKey);
            if (result === undefined) {
                try {
                    result = await searchMovie(searchTitle, year);
                } catch (err) {
                    console.error(err.message);
                    result = null;
                }
                cache.set(cacheKey, result);
                await sleep(DELAY_MS);
            }

            processed++;
            process.stdout.write(`\r${processed}/${totalTitles} processed`);

            if (result) {
                output[genre].push({
                    title: rawTitle,
                    tmdbId: result.id,
                    posterUrl: result.poster_path
                        ? `https://image.tmdb.org/t/p/w500${result.poster_path}`
                        : null,
                    releaseYear: result.release_date
                        ? result.release_date.slice(0, 4)
                        : null,
                });
            } else {
                output[genre].push({ title: rawTitle, tmdbId: null, posterUrl: null, releaseYear: null });
                notFound.push(rawTitle);
            }
        }
    }

    console.log("\nDone.");

    writeFileSync("movies-with-posters.json", JSON.stringify(output, null, 2));
    writeFileSync("movies-not-found.json", JSON.stringify(notFound, null, 2));

    console.log(`Matched: ${totalTitles - notFound.length}/${totalTitles}`);
    if (notFound.length > 0) {
        console.log(`${notFound.length} titles need manual fixing — see movies-not-found.json`);
    }
}

main();
