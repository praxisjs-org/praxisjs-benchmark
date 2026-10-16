import { render } from "@praxisjs/runtime";

import { DevTools } from "../../../../praxisjs/packages/dx/devtools/dist/index.js";

import { App } from "./app";

render(() => <App />, document.getElementById("main") as HTMLElement);
DevTools.init();
