sap.ui.define(
  ["sap/ui/core/mvc/Controller", "sap/m/Title", "sap/m/Text", "../utils/docx"],
  function (Controller, Title, Text, docx) {
    "use strict";

    return Controller.extend("docgenie.controller.Detail", {
      onInit: function () {
        //Get Docuement Model

        const oEventBus = sap.ui.getCore().getEventBus();
        oEventBus.subscribe(
          "docPreview",
          "contentChanged",
          this.handleDocContentChanged,
          this
        );

        
      },

      handleDocContentChanged: function () {
        const documentModel = sap.ui.getCore().getModel("DocumentModel");
        const aDocumentData = documentModel.getData();
        const docPrevContainer = this.getView().byId("idVboxDocPrev");
        docPrevContainer.destroyItems(); //Remove all items
        const self = this;

        //Set Document Title
        const oChapterTitle = new Title({
          text: documentModel.getProperty("/doctitle"),
          titleStyle: "H2",
        });
        oChapterTitle.addStyleClass("sapUiMediumMarginTop");
        docPrevContainer.addItem(oChapterTitle);

        aDocumentData.chapter.forEach((chapter) => {
          const oChapterTitle = new Title({
            text: chapter.chapterTitle,
            titleStyle: "H3",
          });
          oChapterTitle.addStyleClass("sapUiMediumMarginTop");
          const docPrevContainer = self.getView().byId("idVboxDocPrev");
          docPrevContainer.addItem(oChapterTitle);

          chapter.section.forEach((section) => {
            const oSectionTitle = new Title({
              text: section.title,
              titleStyle: "H5",
            });
            oSectionTitle.addStyleClass("sapUiSmallMarginTop");
            docPrevContainer.addItem(oSectionTitle);
            const oSectionText = new Text({ text: section.content });
            docPrevContainer.addItem(oSectionText);
          });
        }, this);
      },

      onAccept: async function () {
        this.documentModel = await sap.ui.getCore().getModel("DocumentModel");
        docx.generate(this.documentModel.getData().doctitle, this.documentModel.getData().chapter);
      },

      handleClose: function () {},
    });
  }
);
