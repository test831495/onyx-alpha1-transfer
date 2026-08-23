const removableWords=new Set(["a","an","the","my","me","please"]);
export const removeFillerWords=(tokens:readonly string[])=>tokens.filter(token=>!removableWords.has(token));
export const joinTokens=(tokens:readonly string[])=>tokens.join(" ").trim();
