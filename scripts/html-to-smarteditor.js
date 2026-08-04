// scripts/html-to-smarteditor.js
// Utilities to convert HTML content into Naver SmartEditor JSON format (CommonJS from egdesk-scratch)

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function parseInlineStyleString(styleString) {
  const styles = {};
  if (!styleString) return styles;

  const stylePairs = styleString.split(';');
  for (const pair of stylePairs) {
    const [property, value] = pair.split(':').map(s => s.trim());
    if (property && value) {
      switch (property) {
        case 'font-weight':
          if (value === 'bold' || parseInt(value) >= 700) styles.bold = true; break;
        case 'font-style':
          if (value === 'italic') styles.italic = true; break;
        case 'text-decoration':
          if (value.includes('underline')) styles.underline = true;
          if (value.includes('line-through')) styles.strikeThrough = true;
          break;
        case 'color':
          styles.color = value; styles.fontColor = value; break;
        case 'background-color':
          styles.backgroundColor = value; break;
        case 'font-size':
          const fontSize = parseInt(value);
          if (fontSize > 20) styles.fontSize = 'large'; else if (fontSize < 12) styles.fontSize = 'small';
          break;
        case 'line-height':
          styles.lineHeight = value; break;
        case 'margin-left':
          styles.marginLeft = value; break;
        case 'margin-right':
          styles.marginRight = value; break;
        case 'margin-top':
          styles.marginTop = value; break;
        case 'margin-bottom':
          styles.marginBottom = value; break;
        case 'font-family':
          styles.fontFamily = value; break;
        case 'text-align':
          styles.textAlign = value; break;
        case 'list-style-type':
          styles.listStyleType = value; break;
      }
    }
  }
  return styles;
}

function createTextNode(text, tagName, inlineStyles) {
  const node = {
    id: `SE-${generateUUID()}`,
    value: text,
    style: { bold: false, italic: false, underline: false, strikeThrough: false, "@ctype": "nodeStyle" },
    "@ctype": "textNode"
  };

  if (tagName === 'strong' || tagName === 'b') node.style.bold = true;
  else if (tagName === 'em' || tagName === 'i') node.style.italic = true;
  else if (tagName === 'u') node.style.underline = true;
  else if (tagName === 'h1' || tagName === 'h2' || tagName === 'h3' || tagName === 'h4' || tagName === 'h5' || tagName === 'h6') node.style.bold = true;

  if (inlineStyles) {
    if (inlineStyles.bold !== undefined) node.style.bold = inlineStyles.bold;
    if (inlineStyles.italic !== undefined) node.style.italic = inlineStyles.italic;
    if (inlineStyles.underline !== undefined) node.style.underline = inlineStyles.underline;
    if (inlineStyles.strikeThrough !== undefined) node.style.strikeThrough = inlineStyles.strikeThrough;
    if (inlineStyles.fontColor) node.style.fontColor = inlineStyles.fontColor;
    if (inlineStyles.backgroundColor) node.style.backgroundColor = inlineStyles.backgroundColor;
    if (inlineStyles.fontSize) node.style.fontSize = inlineStyles.fontSize;
  }

  return node;
}

function parseInlineStyles(htmlContent) {
  const nodes = [];
  let remainingContent = htmlContent;

  while (remainingContent.length > 0) {
    const tagMatch = remainingContent.match(/<(\w+)(?:\s+[^>]*)?>(.*?)<\/\1>/);
    if (!tagMatch) {
      if (remainingContent.trim()) nodes.push(createTextNode(remainingContent.trim()));
      break;
    }

    const fullTag = tagMatch[0];
    const tagName = tagMatch[1];
    const tagContent = tagMatch[2];
    const tagIndex = remainingContent.indexOf(fullTag);

    if (tagIndex > 0) {
      const beforeText = remainingContent.substring(0, tagIndex).trim();
      if (beforeText) nodes.push(createTextNode(beforeText));
    }

    const styleMatch = fullTag.match(/style="([^"]*)"/);
    let inlineStyles = {};
    if (styleMatch) inlineStyles = parseInlineStyleString(styleMatch[1]);

    if (tagContent.includes('<') && tagContent.includes('>')) {
      const nestedNodes = parseInlineStyles(tagContent);
      nestedNodes.forEach(nestedNode => {
        if (nestedNode.style) {
          if (tagName === 'strong' || tagName === 'b') nestedNode.style.bold = true;
          else if (tagName === 'em' || tagName === 'i') nestedNode.style.italic = true;
          else if (tagName === 'u') nestedNode.style.underline = true;

          if (inlineStyles.bold !== undefined) nestedNode.style.bold = inlineStyles.bold;
          if (inlineStyles.italic !== undefined) nestedNode.style.italic = inlineStyles.italic;
          if (inlineStyles.underline !== undefined) nestedNode.style.underline = inlineStyles.underline;
          if (inlineStyles.strikeThrough !== undefined) nestedNode.style.strikeThrough = inlineStyles.strikeThrough;
          if (inlineStyles.fontColor) nestedNode.style.fontColor = inlineStyles.fontColor;
          if (inlineStyles.backgroundColor) nestedNode.style.backgroundColor = inlineStyles.backgroundColor;
          if (inlineStyles.fontSize) nestedNode.style.fontSize = inlineStyles.fontSize;
        }
      });
      nodes.push(...nestedNodes);
    } else {
      nodes.push(createTextNode(tagContent, tagName, inlineStyles));
    }

    remainingContent = remainingContent.substring(tagIndex + fullTag.length);
  }

  return nodes;
}

function createTextComponentsWithLineBreaks(htmlContent) {
  if (!htmlContent.trim()) return [];

  const components = [];
  const paragraphs = htmlContent.split(/\n\s*\n/);

  paragraphs.forEach(paragraph => {
    if (paragraph.trim()) {
      const lines = paragraph.split(/\n/);
      lines.forEach((line) => {
        if (line.trim()) {
          const nodes = parseInlineStyles(line.trim());
          if (nodes.length > 0) {
            const component = {
              id: `SE-${generateUUID()}`,
              layout: "default",
              value: [
                {
                  id: `SE-${generateUUID()}`,
                  nodes: nodes,
                  style: { textAlign: "left", "@ctype": "paragraphStyle" },
                  "@ctype": "paragraph"
                }
              ],
              "@ctype": "text"
            };
            components.push(component);
          }
        }
      });
    }
  });

  return components;
}

function parseHtmlToComponents(htmlContent) {
  const components = [];
  let normalizedContent = htmlContent
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/\n\s*\n/g, '\n\n');

  const paragraphs = normalizedContent.split('\n\n');
  paragraphs.forEach(p => {
    if (p.trim()) {
      const textComps = createTextComponentsWithLineBreaks(p);
      components.push(...textComps);
    }
  });

  return components;
}

function processContentWithImagesForJson(htmlContent, imagePath) {
  try {
    const imagePlaceholderRegex = /\[IMAGE:([^:]+):([^\]]+)\]/g;
    const imageMatches = Array.from(htmlContent.matchAll(imagePlaceholderRegex));
    if (imageMatches.length === 0) {
      return { content: htmlContent, imagePlaceholders: [] };
    }

    let processedContent = htmlContent;
    const imagePlaceholders = [];

    for (const match of imageMatches) {
      const placeholder = match[0];
      const description = match[1];
      const imageComponent = {
        id: `SE-${generateUUID()}`,
        layout: "default",
        src: imagePath || "placeholder",
        internalResource: true,
        represent: true,
        path: imagePath || "placeholder",
        domain: "https://blogfiles.pstatic.net",
        fileSize: 0,
        width: 800,
        widthPercentage: 0,
        height: 600,
        originalWidth: 800,
        originalHeight: 600,
        fileName: "placeholder.png",
        caption: description,
        format: "normal",
        displayFormat: "normal",
        imageLoaded: true,
        contentMode: "fit",
        origin: { srcFrom: "local", "@ctype": "imageOrigin" },
        ai: false,
        "@ctype": "image"
      };
      imagePlaceholders.push(imageComponent);
      processedContent = processedContent.replace(placeholder, `[IMAGE_COMPONENT_${imagePlaceholders.length - 1}]`);
    }

    return { content: processedContent, imagePlaceholders };
  } catch (error) {
    return { content: htmlContent, imagePlaceholders: [] };
  }
}

function convertHtmlToSmartEditorJson(title, htmlContent, tags, imagePath, options) {
  const documentId = generateUUID();

  const shouldPreserveMarkers = !!(options && options.preserveImageMarkers);
  const { content: processedContent, imagePlaceholders } = shouldPreserveMarkers
    ? { content: htmlContent, imagePlaceholders: [] }
    : processContentWithImagesForJson(htmlContent, imagePath);

  const document = {
    version: "2.8.10",
    theme: "default",
    language: "ko-KR",
    id: documentId,
    di: {
      dif: false,
      dio: [
        {
          dis: "N",
          dia: { t: 0, p: 0, st: 715, sk: 51 }
        }
      ]
    },
    components: []
  };

  const titleComponent = {
    id: `SE-${generateUUID()}`,
    layout: "default",
    title: [
      {
        id: `SE-${generateUUID()}`,
        nodes: [
          { id: `SE-${generateUUID()}`, value: title, "@ctype": "textNode" }
        ],
        "@ctype": "paragraph"
      }
    ],
    subTitle: null,
    align: "left",
    "@ctype": "documentTitle"
  };
  document.components.push(titleComponent);

  const contentComponents = parseHtmlToComponents(processedContent);
  document.components.push(...contentComponents);

  if (tags) {
    const tagsComponent = {
      id: `SE-${generateUUID()}`,
      layout: "default",
      value: [
        {
          id: `SE-${generateUUID()}`,
          nodes: [
            {
              id: `SE-${generateUUID()}`,
              value: tags,
              style: {
                fontColor: "#666666",
                bold: false,
                italic: true,
                underline: false,
                strikeThrough: false,
                "@ctype": "nodeStyle"
              },
              "@ctype": "textNode"
            }
          ],
          style: { textAlign: "left", "@ctype": "paragraphStyle" },
          "@ctype": "paragraph"
        }
      ],
      "@ctype": "text"
    };
    document.components.push(tagsComponent);
  }

  return { document };
}

module.exports = {
  generateUUID,
  convertHtmlToSmartEditorJson,
  parseHtmlToComponents,
  processContentWithImagesForJson
};
