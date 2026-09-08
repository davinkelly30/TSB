const {
  PDFDocument,
  StandardFonts,
  rgb
} = require("pdf-lib");

async function buildDocumentPdf(lines) {
  const pdf = await PDFDocument.create();

  const regular = await pdf.embedFont(
    StandardFonts.Helvetica
  );

  const bold = await pdf.embedFont(
    StandardFonts.HelveticaBold
  );

  const navy = rgb(0.043, 0.122, 0.231);
  const gray = rgb(0.25, 0.29, 0.34);

  const pages = [];
  const width = 612;
  const height = 792;
  const margin = 48;
  const contentWidth = width - margin * 2;

  let page;
  let y;

  function newPage() {
    page = pdf.addPage([width, height]);
    pages.push(page);

    page.drawRectangle({
      x: 0,
      y: height - 12,
      width,
      height: 12,
      color: navy
    });

    y = height - margin;

    if (pages.length > 1) {
      page.drawText(
        "Total Services Bahamas - continued",
        {
          x: margin,
          y,
          size: 10,
          font: bold,
          color: navy
        }
      );

      y -= 26;
    }
  }

  function wrap(text, font, size) {
    const result = [];
    let line = "";

    for (const word of text.split(/\s+/)) {
      const candidate = line
        ? `${line} ${word}`
        : word;

      if (
        font.widthOfTextAtSize(candidate, size)
        <= contentWidth
      ) {
        line = candidate;
        continue;
      }

      if (line) result.push(line);
      line = "";

      for (const character of word) {
        if (
          font.widthOfTextAtSize(
            line + character,
            size
          ) > contentWidth
        ) {
          result.push(line);
          line = "";
        }

        line += character;
      }
    }

    if (line) result.push(line);

    return result;
  }

  newPage();

  for (let index = 0; index < lines.length; index++) {
    const text = String(lines[index] ?? "")
      .replace(/\r\n?/g, "\n")
      .replace(/\t/g, " ");

    const emphasized =
      index < 2 ||
      /^(Total:|Remaining balance:|Payment received:|Balance after this payment:|Items:|Notes:|Terms:)/.test(text);

    const font = emphasized ? bold : regular;

    const size =
      index === 0 ? 20 :
      index === 1 ? 13 : 10;

    const lineHeight = size + 5;

    for (const paragraph of text.split("\n")) {
      if (!paragraph.trim()) {
        y -= 8;
        continue;
      }

      for (const line of wrap(paragraph, font, size)) {
        if (y - lineHeight < 58) {
          newPage();
        }

        page.drawText(line, {
          x: margin,
          y,
          size,
          font,
          color: emphasized ? navy : gray
        });

        y -= lineHeight;
      }

      y -= 4;
    }

    if (index === 1) {
      page.drawLine({
        start: {
          x: margin,
          y
        },
        end: {
          x: width - margin,
          y
        },
        thickness: 1,
        color: navy
      });

      y -= 18;
    }
  }

  pages.forEach((documentPage, index) => {
    documentPage.drawText(
      `Total Services Bahamas | Page ${index + 1} of ${pages.length}`,
      {
        x: margin,
        y: 30,
        size: 8,
        font: regular,
        color: gray
      }
    );
  });

  pdf.setTitle(
    String(lines[1] || "Total Services Document")
  );

  pdf.setAuthor("Total Services Bahamas");

  return Buffer.from(await pdf.save());
}

module.exports = { buildDocumentPdf };
