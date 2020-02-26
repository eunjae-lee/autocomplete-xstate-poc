import React from "react";
import { useMachine } from "@xstate/react";
import { Machine, assign } from "xstate";
import { getSources } from "./algolia";
import "./Autocomplete.css";

const searchMachine = Machine({
  id: "search",
  initial: "idle",
  context: {
    hits: []
  },
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
      entry: ["setHits", "openDropdownIfHitsExist"],
      on: { INPUT: "searching" }
    }
  }
});

const dropdownMachine = Machine({
  id: "dropdown",
  initial: "closed",
  states: {
    closed: {
      on: { TOGGLE: "opened", OPEN: "opened" }
    },
    opened: {
      on: { TOGGLE: "closed", CLOSE: "closed" }
    }
  }
});

export default () => {
  const [searchState, sendToSearch] = useMachine(searchMachine, {
    actions: {
      search: (_, { data: { query } }) => {
        getSources()[0]
          .getSuggestions({ query })
          .then(hits => {
            sendToSearch({ type: "FETCHED", data: { hits } });
          });
      },
      setHits: assign({
        hits: (_, { data }) => data.hits
      }),
      openDropdownIfHitsExist: ({ hits }) => {
        if ((hits || []).length > 0) {
          sendToDropdown({ type: "OPEN" });
        }
      }
    }
  });
  const [dropdownState, sendToDropdown] = useMachine(dropdownMachine);

  const onInput = event => {
    const query = event.currentTarget.value;
    sendToSearch({ type: "INPUT", data: { query } });
  };

  const onFocus = () => {
    if ((searchState.context.hits || []).length > 0) {
      sendToDropdown({ type: "OPEN" });
    }
  };

  const onBlur = () => {
    sendToDropdown({ type: "CLOSE" });
  };

  return (
    <div>
      <input
        type="search"
        onInput={onInput}
        onFocus={onFocus}
        onBlur={onBlur}
      />
      {dropdownState.value === "opened" && (
        <ul className="dropdown">
          {(searchState.context.hits || []).map((hit, index) => {
            return (
              <div key={index}>
                <p>{hit.name}</p>
              </div>
            );
          })}
        </ul>
      )}
      {/* <pre>{JSON.stringify(highlightState, null, 2)}</pre> */}
    </div>
  );
};
