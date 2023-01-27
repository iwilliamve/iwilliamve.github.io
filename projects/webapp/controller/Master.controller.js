sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "../utils/openAI",
    "../utils/commonFuncs",
    "sap/m/VBox",
    "sap/m/Text",
    "sap/m/Title",
    "sap/m/TextArea",
    "sap/m/Panel",
    "sap/m/Toolbar",
    "sap/m/OverflowToolbar",
    "sap/m/Button",
    "sap/m/ToolbarSpacer",
  ],
  function (
    Controller,
    JSONModel,
    MessageToast,
    openAI,
    commonFuncs,
    VBox,
    Title,
    Text,
    TextArea,
    Panel,
    Toolbar,
    OverflowToolbar,
    Button,
    ToolbarSpacer
  ) {
    "use strict";

    return Controller.extend("docgenie.controller.Master", {
      onInit: async function () {
        const oOutlineModel = new JSONModel();
        this.getView().setModel(oOutlineModel, "outlineModel");
        this.outlineViewModel = this.getView().getModel("outlineModel");

        const oDocumentTypeModel = new JSONModel(
          "https://iwilliamve.github.io/projects/webapp/config/documentTypes.json"
        );
        this.getView().setModel(oDocumentTypeModel, "DocumentTypeModel");

        const oDocumentModel = new JSONModel({ doctitle: "", chapter: [] });

        sap.ui.getCore().setModel(oDocumentModel, "DocumentModel");
        this.documentModel = sap.ui.getCore().getModel("DocumentModel");

        this.EventBus = sap.ui.getCore().getEventBus();

        const oTableSetings = {
          accpetBtnEnabled: false,
          tableVisible: false,
        };
        const oTableSettingsModel = new JSONModel();
        oTableSettingsModel.setData(oTableSetings);
        this.getView().setModel(oTableSettingsModel, "TableSettingsModel");

        this._aClipboardData = [];
      },

      //Function to return prompt based on document type
      getPromptForDocType: function (documentType) {
        switch (documentType) {
          case "subsidy_application":
            prompt = "Create an outline for a document requesting Subsidy:";
            break;
          case "annual_plan":
            prompt = "Create an outline for a Annual Plan Document:";
            break;
          case "project_documentation":
            prompt = "Create an outline for Project Documentation:";
            break;
          case "functional_requirements_document":
            prompt =
              "Create an outline for a Functional Requirements Document:";
            break;
          case "technical_requirements_document":
            prompt =
              "Create an outline for a Technical Requirements Document:";
            break;
          case "business_plan":
            prompt = "Create an outline for a Business Plan Document:";
            break;
          default:
        }

        return prompt;
      },

      //Function to remove all empty strings from array
      removeEmptyStringsFromArray: function (array) {
        let newArray = [];
        array.forEach((item) => {
          if (item !== "") {
            newArray.push(item);
          }
        });
        return newArray;
      },

      //function to get array of lines from textarea
      getLinesFromText: function (text) {
        let lines = text.split("\n");
        lines = this.removeEmptyStringsFromArray(lines);
        return lines;
      },

      //Create object from Outline lines
      createOutlineObject: function (aLines) {
        let object = {};
        object.sections = aLines.map((line) => {
          return { text: line, sections: [] };
        });
        return object;
      },

      onGenerateOutline: async function (oEvent) {
        //Get Selected Document
        const sDocType = this.byId("ComboDocSelectId").getSelectedKey();

        if (!sDocType) {
          alert("Please select a document type");
          return;
        }

        //Get Prompt
        const sPrompt = this.getPromptForDocType(sDocType);
        //Perform openAI Api call
        try {
          this.setBusy(true);
          const response = await openAI.call("", sPrompt, "outline");
          this.setBusy(false);

          //Get lines from response
          const aLines = this.getLinesFromText(response.text);
          //Create data Object
          const oData = this.createOutlineObject(aLines);
          //Set Liens to outline viewModel
          this.outlineViewModel.setData(oData);
          //Show table
          this.getView()
            .getModel("TableSettingsModel")
            .setProperty("/tableVisible", true);
        } catch (e) {
          this.setBusy(false);
          alert(e);
          return;
        }
      },

      onCollapseAll: function () {
        var oTreeTable = this.byId("TreeTable");
        oTreeTable.collapseAll();
      },

      onExpandFirstLevel: function () {
        var oTreeTable = this.byId("TreeTable");
        oTreeTable.expandToLevel(1);
      },

      onDragStart: function (oEvent) {
        var oTreeTable = this.byId("TreeTable");
        var oDragSession = oEvent.getParameter("dragSession");
        var oDraggedRow = oEvent.getParameter("target");
        var iDraggedRowIndex = oDraggedRow.getIndex();
        var aSelectedIndices = oTreeTable.getSelectedIndices();
        var aDraggedRowContexts = [];

        if (aSelectedIndices.length > 0) {
          // If rows are selected, do not allow to start dragging from a row which is not selected.
          if (aSelectedIndices.indexOf(iDraggedRowIndex) === -1) {
            oEvent.preventDefault();
          } else {
            for (var i = 0; i < aSelectedIndices.length; i++) {
              aDraggedRowContexts.push(
                oTreeTable.getContextByIndex(aSelectedIndices[i])
              );
            }
          }
        } else {
          aDraggedRowContexts.push(
            oTreeTable.getContextByIndex(iDraggedRowIndex)
          );
        }

        oDragSession.setComplexData("hierarchymaintenance", {
          draggedRowContexts: aDraggedRowContexts,
        });
      },

      onDrop: function (oEvent) {
        var oTreeTable = this.byId("TreeTable");
        var oDragSession = oEvent.getParameter("dragSession");
        var oDroppedRow = oEvent.getParameter("droppedControl");
        var aDraggedRowContexts = oDragSession.getComplexData(
          "hierarchymaintenance"
        ).draggedRowContexts;
        var oNewParentContext = oTreeTable.getContextByIndex(
          oDroppedRow.getIndex()
        );

        if (aDraggedRowContexts.length === 0 || !oNewParentContext) {
          return;
        }

        var oModel = oTreeTable.getBinding().getModel();
        var oNewParent = oNewParentContext.getProperty();

        // In the JSON data of this example the children of a node are inside an array with the name "sections".
        if (!oNewParent.sections) {
          oNewParent.sections = []; // Initialize the children array.
        }

        for (var i = 0; i < aDraggedRowContexts.length; i++) {
          if (
            oNewParentContext
              .getPath()
              .indexOf(aDraggedRowContexts[i].getPath()) === 0
          ) {
            // Avoid moving a node into one of its child nodes.
            continue;
          }

          // Copy the data to the new parent.
          oNewParent.sections.push(aDraggedRowContexts[i].getProperty());

          // Remove the data. The property is simply set to undefined to preserve the tree state (expand/collapse states of nodes).
          oModel.setProperty(
            aDraggedRowContexts[i].getPath(),
            undefined,
            aDraggedRowContexts[i],
            true
          );
        }
      },

      onCut: function (oEvent) {
        var oTreeTable = this.byId("TreeTable");
        var aSelectedIndices = oTreeTable.getSelectedIndices();
        var oModel = oTreeTable.getBinding().getModel();

        if (aSelectedIndices.length === 0) {
          MessageToast.show("Select at least one row first.");
          return;
        }

        // Cut the data.
        for (var i = 0; i < aSelectedIndices.length; i++) {
          var oContext = oTreeTable.getContextByIndex(aSelectedIndices[i]);
          var oData = oContext.getProperty();

          if (oData) {
            this._aClipboardData.push(oContext.getProperty());

            // The property is simply set to undefined to preserve the tree state (expand/collapse states of nodes).
            oModel.setProperty(oContext.getPath(), undefined, oContext, true);
          }
        }

        if (this._aClipboardData.length > 0) {
          this.byId("paste").setEnabled(true);
        }
      },

      onPaste: function (oEvent) {
        var oTreeTable = this.byId("TreeTable");
        var aSelectedIndices = oTreeTable.getSelectedIndices();
        var oModel = oTreeTable.getBinding().getModel();

        if (aSelectedIndices.length !== 1) {
          MessageToast.show("Select exactly one row first.");
          return;
        }

        var oNewParentContext = oTreeTable.getContextByIndex(
          aSelectedIndices[0]
        );
        var oNewParent = oNewParentContext.getProperty();

        // In the JSON data of this example the children of a node are inside an array with the name "sections".
        if (!oNewParent.sections) {
          oNewParent.sections = []; // Initialize the children array.
        }

        // Paste the data to the new parent.
        oNewParent.sections = oNewParent.sections.concat(this._aClipboardData);

        this._aClipboardData = [];
        this.byId("paste").setEnabled(false);
        oModel.refresh();
      },

      onAddEmptyRow: function () {
        //Get Outline Model Data
        if (this.outlineViewModel.getData().sections === undefined) {
          alert("Please genarte draft outline first");
        } else {
          this.outlineViewModel
            .getData()
            .sections.push({ text: "", sections: [] });
          this.outlineViewModel.refresh();
        }
        //Add empty array member
        //set model data
      },
      onAcceptOutline: function () {
        //Get Model Data & Remove undefined
        const aOutline = commonFuncs.removeUndefinedDeep(
          this.outlineViewModel.getData().sections
        );

        //Create Input field for each section
        if (sap.ui.getCore().byId("idMainPanel")) {
          const oMainPanel = sap.ui.getCore().byId("idMainPanel");
          oMainPanel.destroy();
        }

        this.createDocSectionsElement(aOutline);
      },

      createDocSectionsElement: function (aSections) {
        const oContianerVBox = this.getView().byId("idVboxContainer");
        const oMainPanel = this.getMainDocSectionsPanel();
        this.documentModel.setProperty("/chapter", []); //Reset Model Data
        this.contextString = ""; //Reset Context String
        let iChapterCount = 0;

        aSections.forEach((chapter) => {
          iChapterCount++;

          let iSectionCount = 0;
          this.documentModel
            .getData()
            .chapter.push({ chapterTitle: chapter.text, section: [] });
          let oChapterPanel = this.getChapterPanel(iChapterCount);

          //Add Default introduction section
          this.documentModel.getData().chapter[iChapterCount - 1].section.push({
            title: "Introduction",
            content: "",
          });
          const subPanel = this.getSubSectionPanel(
            iChapterCount,
            iSectionCount
          );
          oChapterPanel.addContent(subPanel);

          //Check for sub sections and handle if any
          if (chapter.sections.length > 0) {
            chapter.sections.forEach((section) => {
              iSectionCount++;
              this.documentModel
                .getData()
                .chapter[iChapterCount - 1].section.push({
                  title: section.text,
                  content: "",
                });
              const subPanel = this.getSubSectionPanel(
                iChapterCount,
                iSectionCount
              );

              oChapterPanel.addContent(subPanel);
            });
          }
          oMainPanel.addContent(oChapterPanel);
        });

        oContianerVBox.addItem(oMainPanel);
      },

      getSubSectionPanel: function (iChapterCount, iSectionCount) {
        const oPanel = new Panel({
          width: "auto",
          headerText: `{/chapter/${
            iChapterCount - 1
          }/section/${iSectionCount}/title}`,
        });
        oPanel.setModel(this.documentModel);
        oPanel.addStyleClass("sapUiMediumMarginTop");
        const oTextArea = new TextArea({
          width: "100%",
          rows: 3,
          value: `{/chapter/${
            iChapterCount - 1
          }/section/${iSectionCount}/content}`,
          growing: true,
        });
        oTextArea.attachLiveChange(this.handleSectionChange, this);
        oTextArea.setModel(this.documentModel);
        const oPanelToolBar = new Toolbar();
        const oToolbarSpacer = new ToolbarSpacer();
        const oButton = new Button({ text: "Generate" });
        oButton.attachPress(this.handleSectionGeneration, this);

        oPanel.addContent(oTextArea);
        oPanelToolBar.addContent(oToolbarSpacer);
        oPanelToolBar.addContent(oButton);
        oPanel.addContent(oPanelToolBar);

        return oPanel;
      },

      getChapterPanel: function (iChapterCount) {
        const oPanel = new Panel({
          width: "100%",
          headerText: `{/chapter/${iChapterCount - 1}/chapterTitle}`,
          expandable: true,
        });
        // const oPanel = new Panel({ width: "100%", expandable: true });
        oPanel.setModel(this.documentModel);
        oPanel.addStyleClass("sapUiSmallMarginTop");
        return oPanel;
      },

      getMainDocSectionsPanel: function () {
        const oMainPanel = new Panel({
          width: "auto",
          headerText: "Document Sections",
          id: "idMainPanel",
        });
        oMainPanel.addStyleClass("sapUiMediumMarginTop");

        return oMainPanel;
      },

      handleSectionGeneration: async function (oEvent) {
        const oTextArea = oEvent
          .getSource()
          .getParent()
          .getParent()
          .getContent()[0];
        const sInput = oTextArea.getValue();
        const sChapterTitle = oEvent
          .getSource()
          .getParent()
          .getParent()
          .getParent()
          .getHeaderText();
        const sSectionTitle = oEvent
          .getSource()
          .getParent()
          .getParent()
          .getHeaderText();
        let sPrompt = `Please write a draft for chapter ${sChapterTitle}, section ${sSectionTitle} using "${sInput}":`;
        this.buildContextString();

        oTextArea.setBusy(true);
        const response = await openAI.call(
          this.contextString,
          sPrompt,
          "generation"
        );
        oTextArea.setBusy(false);
        //Check if total tokens is 2000 or more
        if (response.total_tokens >= 2000) {
          //create summary
          this.summary = await openAI.call(response.text, sPrompt, "summarize");
        }

        oTextArea.setValue(response.text);

        this.EventBus.publish("docPreview", "contentChanged");
      },

      handleSectionChange: function (oEvent) {
        this.EventBus.publish("docPreview", "contentChanged");
      },

      //Get context form document model
      buildContextString: function () {
        if (this.summary !== "") {
          this.contextString = this.summary; //Add summary to context (if any
          this.summary = ""; //Reset summary
        } else {
          this.contextString = ""; //Reset Context String
          this.documentModel.getData().chapter.forEach((chapter) => {
            this.contextString += chapter.chapterTitle;
            chapter.section.forEach((section) => {
              this.contextString += section.title;
              this.contextString += section.content;
            });
          });
        }
      },

      setBusy: function (bIsBusy) {
        this.getView().setBusy(bIsBusy);
      },
    });
  }
);
