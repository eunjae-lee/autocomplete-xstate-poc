import React from "react";
import { useMachine } from "@xstate/react";
import { Machine, assign } from "xstate";
import { getSources } from "./algolia";
import "./Autocomplete.css";

const autocompleteMachine = Machine({
  id: "autocomplete",
  type: "parallel",
  context: {
    query: null,
    hits: [],
    highlightedIndex: null
  },
  states: {
    searchBox: {
      initial: "initial",
      states: {
        initial: {
          entry: ["resetSearch"],
          on: { INPUT: "searching" }
        },
        searching: {
          entry: ["setQuery", "search"],
          on: {
            FETCHED: "success",
            INPUT: "searching",
            RESET_SEARCH: "initial"
          }
        },
        success: {
          entry: ["setHits", "openOrCloseDropdown"],
          on: { INPUT: "searching", RESET_SEARCH: "initial" }
        }
      }
    },
    dropdown: {
      initial: "closed",
      states: {
        closed: {
          on: { OPEN: "opened", ESCAPE: "reset" }
        },
        opened: {
          on: { CLOSE: "closed", ESCAPE: "closed" }
        },
        reset: {
          entry: ["resetEverything"],
          on: { "": "closed" }
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
            HIGHLIGHT_PREV: { target: "highlighted", cond: "hasHits" },
            HIGHLIGHT_SPECIFIC_INDEX: "highlighted"
          }
        },
        highlighted: {
          entry: ["updateHighlightedIndex"],
          on: {
            HIGHLIGHT_NEXT: "highlighted",
            HIGHLIGHT_PREV: "highlighted",
            HIGHLIGHT_SPECIFIC_INDEX: "highlighted",
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
      resetSearch: assign({
        hits: [],
        query: null
      }),
      setQuery: assign({
        query: (_, { data: { query } }) => query
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
        highlightedIndex: (
          { hits, highlightedIndex },
          { type, data: { specificIndex } = {} }
        ) => {
          if (specificIndex !== undefined) {
            return specificIndex;
          }
          if (highlightedIndex === null) {
            return 0;
          } else if (type === "HIGHLIGHT_NEXT") {
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
      }),
      resetEverything: () => {
        send("RESET_SEARCH");
        send("RESET_HIGHLIGHT");
      }
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

  const openIfHitsExistsAndClosed = () => {
    if (state.value.dropdown === "closed" && state.context.hits.length > 0) {
      send("OPEN");
    }
  };

  const onKeyDown = event => {
    if (event.keyCode === KEY_ARROW_DOWN) {
      openIfHitsExistsAndClosed();
      send("HIGHLIGHT_NEXT");
    } else if (event.keyCode === KEY_ARROW_UP) {
      openIfHitsExistsAndClosed();
      send("HIGHLIGHT_PREV");
    } else if (event.keyCode === KEY_ESC) {
      send("ESCAPE");
    }
  };

  const onMouseOverWith = specificIndex => () => {
    if (state.context.highlightedIndex === specificIndex) {
      return;
    }
    send({ type: "HIGHLIGHT_SPECIFIC_INDEX", data: { specificIndex } });
  };

  return (
    <div>
      <input
        type="search"
        onInput={onInput}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        value={state.context.query || ""}
      />
      {state.value.dropdown === "opened" && (
        <ul className="dropdown">
          {(state.context.hits || []).map((hit, index) => {
            return (
              <li
                key={index}
                onMouseOver={onMouseOverWith(index)}
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
