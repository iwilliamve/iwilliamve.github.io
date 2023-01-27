sap.ui.define([], function () {
  "use strict";

  var context = {}
  context.string = "";
  context.total_tokens = 0;


  //function to remove all characters from beginning of string until the first occurrence of a character in the list
  function removeUntilFirstOccurrence(sString, sCharList) {
    let iIndex = sString.length;
    for (let i = 0; i < sCharList.length; i++) {
      let iTempIndex = sString.indexOf(sCharList[i]);
      if (iTempIndex > -1 && iTempIndex < iIndex) {
        iIndex = iTempIndex;
      }
    }
    return sString.substring(iIndex);
  }


  return {
    //Function to call open ai api
    call: async function (context, prompt, sOptionsKey) {


      const apiKey = "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";

      const model = "text-davinci-003";

      const apiUrl = `https://api.openai.com/v1/engines/${model}/completions`;

      const oOptions= {
        outline: { temperature : 0.3, max_tokens : 300, top_p: 1, frequency_penalty : 0.0, presence_penalty: 0.0},
        generation: { temperature : 0.6, max_tokens : 2000, top_p: 1, frequency_penalty : 1, presence_penalty: 1},
        summarize: { temperature : 0.7, max_tokens : 1500, top_p: 1, frequency_penalty : 0.0, presence_penalty: 0.0},
        };
        

      const request = {
        prompt: sOptionsKey === "summarize" ? "Summarize this: " + context : context + prompt,
        temperature: oOptions[sOptionsKey].temperature,
        max_tokens: oOptions[sOptionsKey].max_tokens,
        top_p: oOptions[sOptionsKey].top_p,
        frequency_penalty: oOptions[sOptionsKey].frequency_penalty,
        presence_penalty: oOptions[sOptionsKey].presence_penalty
      };

      const options = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(request),
      };


      let apiResponse = await fetch(apiUrl, options);
      if(!apiResponse.ok) {
        throw new Error(apiResponse.statusText);
      }else{
        let jsonRes = await apiResponse.json();
        const response = { text: jsonRes.choices[0].text, total_tokens: jsonRes.usage.total_tokens }
        return  response
      }

      }
     


  };
});
