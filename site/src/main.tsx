import { render } from "@solidjs/web";
import "@fontsource-variable/golos-text";
import "@fontsource-variable/unbounded";
import "@fontsource-variable/jetbrains-mono";
import App from "./App";
import "./styles.css";

render(() => <App />, document.getElementById("root")!);
