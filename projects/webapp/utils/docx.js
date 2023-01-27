jQuery.sap.registerModulePath("docx", "https://unpkg.com/docx@7.1.0/build/");
jQuery.sap.registerModulePath(
  "FileSaver",
  "https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/1.3.8/"
);

sap.ui.define(["docx/index", "FileSaver/FileSaver"], function () {
  "use strict";

  function getChapterTitle(chapterTitle) {
    return new docx.Paragraph({
      heading: docx.HeadingLevel.HEADING_1,
      text: chapterTitle,
      break: 1,
    });
  }

  function getParagraphTitle(paragraphTitle) {
    return new docx.Paragraph({
      heading: docx.HeadingLevel.HEADING_2,
      text: paragraphTitle,
      break: 1,
    });
  }

  function getParagraph(paragraph) {
    return new docx.Paragraph({
      text: paragraph,
      break: 1,
    });
  }

  //Builded document children from document model
    function getDocumentChildren(documentData) {
        let documentChildren = [];

        documentData.forEach((chapter) => {
            documentChildren.push(getChapterTitle(chapter.chapterTitle));
            chapter.section.forEach((section) => {
                documentChildren.push(getParagraphTitle(section.title));
                documentChildren.push(getParagraph(section.content));
            });

        }); 

        return documentChildren;
    }

        
  return {
    generate: function (title, documentData) {
      const doc = new docx.Document({
        sections: [
          {
            properties: {},
            children: getDocumentChildren(documentData),
          },
        ],
      });

      docx.Packer.toBlob(doc).then((blob) => {
        console.log(blob);
        saveAs(blob, `${title}.docx`);
        console.log("Document created successfully");
      });
    },
  };
});
