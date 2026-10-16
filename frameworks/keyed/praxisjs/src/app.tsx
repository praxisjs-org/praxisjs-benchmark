import { StatefulComponent } from "@praxisjs/core";
import { Component, Selector, State } from "@praxisjs/decorators";
import { For } from "@praxisjs/runtime";
import { ReactiveStore } from "@praxisjs/store";

import { buildData } from "./data";

class Row extends ReactiveStore {
  @State() label: string;

  constructor(
    readonly id: number,
    label: string,
  ) {
    super();
    this.label = label;
  }
}

const buildRows = (count: number) => buildData(count).map((row) => new Row(row.id, row.label));

@Component()
export class App extends StatefulComponent {
  @State() rows: Row[] = [];
  @State() selected = 0;
  @Selector("selected") isSelected!: Selector<number>;

  run() {
    this.rows = buildRows(1000);
    this.selected = 0;
  }

  runLots() {
    this.rows = buildRows(10000);
    this.selected = 0;
  }

  add() {
    this.rows = this.rows.concat(buildRows(1000));
  }

  update() {
    const rows = this.rows;
    for (let i = 0; i < rows.length; i += 10) rows[i].label += " !!!";
  }

  clear() {
    this.rows = [];
    this.selected = 0;
  }

  swapRows() {
    if (this.rows.length > 998) {
      const rows = this.rows.slice();
      const tmp = rows[1];
      rows[1] = rows[998];
      rows[998] = tmp;
      this.rows = rows;
    }
  }

  remove(id: number) {
    this.rows = this.rows.filter((row) => row.id !== id);
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
            <For each={() => this.rows}>
              {(row) => (
                <tr class={() => (this.isSelected(row().id) ? "danger" : "")}>
                  <td class="col-md-1">{row().id}</td>
                  <td class="col-md-4">
                    <a onClick={() => { this.select(row().id); }}>{() => row().label}</a>
                  </td>
                  <td class="col-md-1">
                    <a onClick={() => { this.remove(row().id); }}>
                      <span class="glyphicon glyphicon-remove" aria-hidden={"true" as const} />
                    </a>
                  </td>
                  <td class="col-md-6" />
                </tr>
              )}
            </For>
          </tbody>
        </table>
        <span class="preloadicon glyphicon glyphicon-remove" aria-hidden={"true" as const} />
      </div>
    );
  }
}
