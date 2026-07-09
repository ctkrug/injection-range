import "./style.css";
import { sampleTranscript } from "./sample-transcript";
import { initApp } from "./app";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("#app root element missing from index.html");
}

initApp(app, sampleTranscript);
