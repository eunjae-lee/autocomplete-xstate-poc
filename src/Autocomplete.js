import React from "react";
import { useMachine } from "@xstate/react";
import { Machine, assign } from "xstate";
import { getSources } from "./algolia";
import "./Autocomplete.css";

const autocompleteMachine = Machine({
  id: "autocomplete",
  type: "parallel",
  context: {
    hits: []
  },
  states: {
    searchBox: {
      initial: "idle",
      states: {
        idle: {
          on: { INPUT: "searching" }
        },
        searching: {
          entry: ["search"],
          on: {
            FETCHED: "success",
            INPUT: "searching"
          }
        },
        success: {
          entry: ["setHits", "openOrCloseDropdown"],
          on: { INPUT: "searching" }
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
    }
  }
});

export default () => {
  const [state, send] = useMachine(autocompleteMachine, {
    actions: {
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
      }
    }
  });

  const onInput = event => {
    const query = event.currentTarget.value;
    send({ type: "INPUT", data: { query } });
  };

  const onFocus = () => {
    if ((state.context.hits || []).length > 0) {
      send("OPEN");
    }
  };

  const onBlur = () => {
    send("CLOSE");
  };

  return (
    <div>
      <input
        type="search"
        onInput={onInput}
        onFocus={onFocus}
        onBlur={onBlur}
      />
      {state.value.dropdown === "opened" && (
        <ul className="dropdown">
          {(state.context.hits || []).map((hit, index) => {
            return (
              <div key={index}>
                <p>{hit.name}</p>
              </div>
            );
          })}
        </ul>
      )}
      <pre>{JSON.stringify(state, null, 2)}</pre>
    </div>
  );
};
