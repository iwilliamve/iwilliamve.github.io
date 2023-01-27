sap.ui.define([], function () {
    "use strict";

    return {
        //Recursively loop trough array and remove any undefined values
        removeUndefined: function (array) {
            
            var newArray = [];
            array.forEach(function (item) {
                if (item !== undefined && item !== "" && item?.text !== "") {
                    newArray.push(item);
                }
            });
            return newArray;
        },

        //Loop trough all levels of the array and remove any undefined values
        removeUndefinedDeep: function (array) {
            if(!array?.length){return};
            var newArray = this.removeUndefined(array);
            newArray.forEach(function (item) {
                if (Array.isArray(item)) {
                    this.removeUndefinedDeep(item);
                }
            });
            return newArray;
        }

    }
});




