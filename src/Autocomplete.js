import React from "react";
import { useMachine } from "@xstate/react";
import { Machine, assign } from "xstate";
import { getSources } from "./algolia";

const autocompleteMachine = Machine({
  id: "autocomplete",
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
      entry: ["setHits"],
      on: { INPUT: "searching" }
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
      })
    }
  });
  const onInput = event => {
    const query = event.currentTarget.value;
    send({ type: "INPUT", data: { query } });
  };

  return (
    <div>
      <input type="search" onInput={onInput} />
      {(state.context.hits || []).map((hit, index) => {
        return (
          <div key={index}>
            <p>{hit.name}</p>
          </div>
        );
      })}
    </div>
  );
};
