import "./style.css";
import { transcriptPool } from "./pool";
import { formatDateKey, pickDailyTranscript } from "./daily";
import { initApp } from "./app";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("#app root element missing from index.html");
}

const todaysTranscript = pickDailyTranscript(formatDateKey(new Date()), transcriptPool);

initApp(app, todaysTranscript);
