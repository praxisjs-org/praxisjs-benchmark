import { StatefulComponent } from "@praxisjs/core";
import { Component, State } from "@praxisjs/decorators";

import { buildData, type RowData } from "./data";

@Component()
export class App extends StatefulComponent {
  @State() ids: number[] = [];
  @State() labels: Record<number, string> = {};
  @State() selected = 0;

  setRows(rows: RowData[]) {
    const labels: Record<number, string> = {};
    for (const row of rows) labels[row.id] = row.label;
    this.labels = labels;
    this.ids = rows.map((row) => row.id);
  }

  run() {
    this.setRows(buildData(1000));
    this.selected = 0;
  }

  runLots() {
    this.setRows(buildData(10000));
    this.selected = 0;
  }

  add() {
    const rows = buildData(1000);
    const labels = { ...this.labels };
    for (const row of rows) labels[row.id] = row.label;
    this.labels = labels;
    this.ids = this.ids.concat(rows.map((row) => row.id));
  }

  update() {
    const labels = { ...this.labels };
    const ids = this.ids;
    for (let i = 0; i < ids.length; i += 10) labels[ids[i]] += " !!!";
    this.labels = labels;
  }

  clear() {
    this.ids = [];
    this.labels = {};
    this.selected = 0;
  }

  swapRows() {
    if (this.ids.length > 998) {
      const ids = this.ids.slice();
      const tmp = ids[1];
      ids[1] = ids[998];
      ids[998] = tmp;
      this.ids = ids;
    }
  }

  remove(id: number) {
    this.ids = this.ids.filter((rowId) => rowId !== id);
  }

  select(id: number) {
    this.selected = id;
  }

  render() {
    return (
      <div class="container">
        <div class="jumbotron">
          <div class="row">
            <div class="col-md-6">
              <h1>PraxisJS (keyed)</h1>
            </div>
            <div class="col-md-6">
              <div class="row">
                <div class="col-sm-6 smallpad">
                  <button type="button" class="btn btn-primary btn-block" id="run" onClick={() => { this.run(); }}>
                    Create 1,000 rows
                  </button>
                </div>
                <div class="col-sm-6 smallpad">
                  <button type="button" class="btn btn-primary btn-block" id="runlots" onClick={() => { this.runLots(); }}>
                    Create 10,000 rows
                  </button>
                </div>
                <div class="col-sm-6 smallpad">
                  <button type="button" class="btn btn-primary btn-block" id="add" onClick={() => { this.add(); }}>
                    Append 1,000 rows
                  </button>
                </div>
                <div class="col-sm-6 smallpad">
                  <button type="button" class="btn btn-primary btn-block" id="update" onClick={() => { this.update(); }}>
                    Update every 10th row
                  </button>
                </div>
                <div class="col-sm-6 smallpad">
                  <button type="button" class="btn btn-primary btn-block" id="clear" onClick={() => { this.clear(); }}>
                    Clear
                  </button>
                </div>
                <div class="col-sm-6 smallpad">
                  <button type="button" class="btn btn-primary btn-block" id="swaprows" onClick={() => { this.swapRows(); }}>
                    Swap Rows
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <table class="table table-hover table-striped test-data">
          <tbody>
            {() => this.ids.map((id) => (
              <tr class={() => (this.selected === id ? "danger" : "")}>
                <td class="col-md-1">{id}</td>
                <td class="col-md-4">
                  <a onClick={() => { this.select(id); }}>{() => this.labels[id]}</a>
                </td>
                <td class="col-md-1">
                  <a onClick={() => { this.remove(id); }}>
                    <span class="glyphicon glyphicon-remove" aria-hidden={"true" as const} />
                  </a>
                </td>
                <td class="col-md-6" />
              </tr>
            ))}
          </tbody>
        </table>
        <span class="preloadicon glyphicon glyphicon-remove" aria-hidden={"true" as const} />
      </div>
    );
  }
}
