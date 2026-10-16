import { render } from "@praxisjs/runtime";

import { App } from "./app";

render(() => <App />, document.getElementById("main") as HTMLElement);
