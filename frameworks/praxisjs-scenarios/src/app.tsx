import { StatefulComponent } from "@praxisjs/core";
import { Component, Computed, Prop, State } from "@praxisjs/decorators";

// Exercises what the table benchmark does not: class components with props and state, a computed
// per component, nested components, and one change fanning out to every instance.

@Component()
class Badge extends StatefulComponent {
  @Prop() value = 0;

  render() {
    return <em class="badge">{() => this.value}</em>;
  }
}

@Component()
class Item extends StatefulComponent {
  @Prop() label = "";
  @Prop() tick = 0;
  @State() count = 0;

  @Computed()
  get total() {
    return this.count + this.tick;
  }

  render() {
    return (
      <li class="item">
        <span class="label">{this.label}</span>
        <b class="count">{() => this.count}</b>
        <Badge value={() => this.total} />
        <button
          type="button"
          onClick={() => {
            this.count++;
          }}
        >
          +
        </button>
      </li>
    );
  }
}

@Component()
export class App extends StatefulComponent {
  @State() items: string[] = [];
  @State() tick = 0;

  render() {
    return (
      <div>
        <button id="run" type="button" onClick={() => { this.items = Array.from({ length: 1000 }, (_, i) => `item ${String(i)}`); }}>
          Mount 1,000 components
        </button>
        <button id="clear" type="button" onClick={() => { this.items = []; }}>
          Unmount
        </button>
        <button id="update" type="button" onClick={() => { this.tick++; }}>
          Tick
        </button>
        <ul>{() => this.items.map((label) => <Item label={label} tick={() => this.tick} />)}</ul>
      </div>
    );
  }
}
