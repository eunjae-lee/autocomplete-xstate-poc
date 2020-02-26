import algoliasearch from "algoliasearch/lite";

function flatten(values) {
  return values.reduce((a, b) => {
    return a.concat(b);
  }, []);
}

function getAlgoliaSource({ searchClient, queries }) {
  if (typeof searchClient.addAlgoliaAgent === "function") {
    searchClient.addAlgoliaAgent(`Autocomplete.js (unreleased)`);
  }

  return searchClient.search(
    queries.map(searchParameters => {
      const { indexName, query, params } = searchParameters;

      return {
        indexName,
        query,
        params: {
          hitsPerPage: 5,
          highlightPreTag: "<mark>",
          highlightPostTag: "</mark>",
          ...params
        }
      };
    })
  );
}

export function getAlgoliaResults({ searchClient, queries }) {
  return getAlgoliaSource({ searchClient, queries }).then(response => {
    return response.results;
  });
}

export function getAlgoliaHits({ searchClient, queries }) {
  return getAlgoliaSource({ searchClient, queries }).then(response => {
    const results = response.results;

    // @TODO: should `getAlgoliaHits` flatten the hits?
    return flatten(results.map(result => result.hits));
  });
}

export function getSources() {
  const searchClient = algoliasearch(
    "latency",
    "6be0576ff61c053d5f9a3225e2a90f76"
  );

  return [
    {
      getInputValue({ suggestion }) {
        return suggestion.query;
      },
      getSuggestions({ query }) {
        return getAlgoliaHits({
          searchClient,
          queries: [
            {
              indexName: "instant_search",
              query,
              params: {
                hitsPerPage: 4
              }
            }
          ]
        });
      }
    }
  ];
}
