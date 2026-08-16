const removableWords = new Set([
  "a",
  "an",
  "the",
  "my",
  "me",
  "hey",
  "the",
  "ummm",
  "hmmm",
  "um",
  "uh",
  "er",
  "ah",
  "like",
  "you know",
  "i mean",
  "sort of",
  "kind of",
  "basically",
  "literally",
  "actually",
  "seriously","right","well","so","just","really","totally","absolutely","definitely","obviously","clearly","honestly","frankly","personally","ultimately","essentially","basically","generally","typically","usually","often","sometimes","rarely","never","well","okay","alright","fine","good","great","awesome","amazing","fantastic","wonderful","excellent","perfect","superb","outstanding","remarkable","incredible","fabulous","marvelous","splendid","brilliant","exceptional","phenomenal","extraordinary","magnificent","impressive","spectacular","stunning","breathtaking","mind-blowing","jaw-dropping",
  "mine","yours","his","hers","ours","theirs","this","that","these","those","here","there","where","when","why","how","what","which","who","whom","whose",
  "please",
]);

export function removeFillerWords(
  tokens: readonly string[],
): string[] {
  return tokens.filter(
    token => !removableWords.has(token),
  );
}

export function joinTokens(
  tokens: readonly string[],
): string {
  return tokens.join(" ").trim();
}
