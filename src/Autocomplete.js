import React from "react";
import { useMachine } from "@xstate/react";
import { Machine, assign } from "xstate";
import { getSources } from "./algolia";
import "./Autocomplete.css";

const autocompleteMachine = Machine({
  id: "autocomplete",
  type: "parallel",
  context: {
    hits: [],
    highlightedIndex: null
  },
  states: {
    searchBox: {
      initial: "idle",
      states: {
        idle: {
          entry: ["reset"],
          on: { INPUT: "searching" }
        },
        searching: {
          entry: ["search"],
          on: {
            FETCHED: "success",
            INPUT: "searching",
            RESET_SEARCH: "idle"
          }
        },
        success: {
          entry: ["setHits", "openOrCloseDropdown"],
          on: { INPUT: "searching", RESET_SEARCH: "idle" }
        }
      }
    },
    dropdown: {
      initial: "closed",
      states: {
        closed: {
          on: { OPEN: "opened" }
        },
        opened: {
          on: { CLOSE: "closed" }
        }
      }
    },
    highlight: {
      initial: "none",
      states: {
        none: {
          entry: ["resetHighlightedIndex"],
          on: {
            HIGHLIGHT_NEXT: { target: "highlighted", cond: "hasHits" },
            HIGHLIGHT_PREV: { target: "highlighted", cond: "hasHits" }
          }
        },
        highlighted: {
          entry: ["updateHighlightedIndex"],
          on: {
            HIGHLIGHT_NEXT: "highlighted",
            HIGHLIGHT_PREV: "highlighted",
            RESET_HIGHLIGHT: "none"
          }
        }
      }
    }
  }
});

const KEY_ESC = 27;
const KEY_ARROW_UP = 38;
const KEY_ARROW_DOWN = 40;

export default () => {
  const [state, send] = useMachine(autocompleteMachine, {
    actions: {
      reset: assign({
        hits: []
      }),
      search: (_, { data: { query } }) => {
        getSources()[0]
          .getSuggestions({ query })
          .then(hits => {
            send({ type: "FETCHED", data: { hits } });
          });
      },
      setHits: assign({
        hits: (_, { data }) => data.hits
      }),
      openOrCloseDropdown: ({ hits }) => {
        if ((hits || []).length > 0) {
          send("OPEN");
        } else {
          send("CLOSE");
        }
      },
      resetHighlightedIndex: assign({
        highlightedIndex: null
      }),
      updateHighlightedIndex: assign({
        highlightedIndex: ({ hits, highlightedIndex }, { type }) => {
          if (type === "HIGHLIGHT_NEXT") {
            return highlightedIndex + 1 < hits.length
              ? highlightedIndex + 1
              : 0;
          } else if (type === "HIGHLIGHT_PREV") {
            return highlightedIndex - 1 >= 0
              ? highlightedIndex - 1
              : hits.length - 1;
          } else {
            return null;
          }
        }
      })
    },
    guards: {
      hasHits: ({ hits }) => {
        return (hits || []).length > 0;
      }
    }
  });

  const onInput = event => {
    const query = event.currentTarget.value;
    if (query === "") {
      send("RESET_SEARCH");
      send("RESET_HIGHLIGHT");
      send("CLOSE");
    } else {
      send({ type: "INPUT", data: { query } });
    }
  };

  const onFocus = () => {
    if ((state.context.hits || []).length > 0) {
      send("OPEN");
    }
  };

  const onBlur = () => {
    send("CLOSE");
  };

  const onKeyDown = event => {
    if (event.keyCode === KEY_ARROW_DOWN) {
      if (state.value.dropdown === "closed" && state.context.hits.length > 0) {
        send("OPEN");
      }
      send("HIGHLIGHT_NEXT");
    } else if (event.keyCode === KEY_ARROW_UP) {
      if (state.value.dropdown === "closed" && state.context.hits.length > 0) {
        send("OPEN");
      }
      send("HIGHLIGHT_PREV");
    } else if (event.keyCode === KEY_ESC) {
      send("CLOSE");
    }
  };

  return (
    <div>
      <input
        type="search"
        onInput={onInput}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
      />
      {state.value.dropdown === "opened" && (
        <ul className="dropdown">
          {(state.context.hits || []).map((hit, index) => {
            return (
              <li
                key={index}
                className={
                  index === state.context.highlightedIndex ? "highlighted" : ""
                }
              >
                <p>{hit.name}</p>
              </li>
            );
          })}
        </ul>
      )}
      <pre>{JSON.stringify(state, null, 2)}</pre>
    </div>
  );
};
