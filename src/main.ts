import "./style.css";
import { sampleTranscript } from "./sample-transcript";
import { renderTranscript } from "./render";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("#app root element missing from index.html");
}

renderTranscript(app, sampleTranscript);
