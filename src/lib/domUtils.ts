export interface SelectorOption {
  selector: string;
  score: number;
  explanation: string;
  matchCount?: number;
}

export function normalizeXPathSelector(selector: string): string {
  const trimmed = selector.trim();
  if (trimmed.startsWith('string(') && trimmed.endsWith(')')) {
    return trimmed.slice(7, -1);
  }
  return trimmed;
}

export function sanitizeHTML(html: string): string {
  const dangerous = ['script', 'iframe', 'object', 'embed', 'link', 'style'];
  let sanitized = html;

  dangerous.forEach(tag => {
    const regex = new RegExp(`<${tag}[^>]*>.*?</${tag}>`, 'gis');
    sanitized = sanitized.replace(regex, '');

    const selfClosing = new RegExp(`<${tag}[^>]*/>`, 'gi');
    sanitized = sanitized.replace(selfClosing, '');
  });

  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=\s*[^\s>]*/gi, '');

  return sanitized;
}

function buildSubPath(fromAncestor: Element, toDescendant: Element): string {
  const parts: string[] = [];
  let current: Element | null = toDescendant;

  while (current && current !== fromAncestor) {
    const tag = current.tagName.toLowerCase();
    const parent = current.parentElement;
    if (parent) {
      const sameTagSiblings = Array.from(parent.children).filter(
        s => s.tagName === current!.tagName
      );
      if (sameTagSiblings.length > 1) {
        const idx = sameTagSiblings.indexOf(current) + 1;
        parts.unshift(`${tag}[${idx}]`);
      } else {
        parts.unshift(tag);
      }
    } else {
      parts.unshift(tag);
    }
    current = parent;
  }

  return parts.length > 0 ? '/' + parts.join('/') : '';
}

function findAncestorRow(element: Element): { row: HTMLTableRowElement; valueCell: Element; subPath: string } | null {
  let current: Element | null = element;
  let valueCell: Element | null = null;

  while (current) {
    if (current.tagName.toLowerCase() === 'tr') {
      const row = current as HTMLTableRowElement;
      const td = valueCell || element;
      const closestTd = element.closest('td');
      const actualCell = closestTd && row.contains(closestTd) ? closestTd : td;
      const sub = actualCell !== element ? buildSubPath(actualCell, element) : '';
      return { row, valueCell: actualCell, subPath: sub };
    }
    if (current.tagName.toLowerCase() === 'td' && !valueCell) {
      valueCell = current;
    }
    current = current.parentElement;
  }
  return null;
}

function findTableSectionHeader(row: HTMLTableRowElement): string | null {
  const table = row.closest('table');
  if (!table) return null;

  const headerCandidates = table.querySelectorAll('b, strong, th');
  const sectionKeywords = [
    'ShipTo', 'Ship To', 'Buyer/Invoice To', 'Buyer', 'Invoice To',
    'Supplier', 'Delivery', 'Billing', 'Vendor', 'Sold To', 'Bill To'
  ];

  for (const el of Array.from(headerCandidates)) {
    const text = el.textContent?.trim() || '';
    for (const keyword of sectionKeywords) {
      if (text === keyword || text.toLowerCase() === keyword.toLowerCase()) {
        return text;
      }
    }
  }
  return null;
}

export function generateXPathSelectors(element: Element): SelectorOption[] {
  const options: SelectorOption[] = [];
  const tagName = element.tagName.toLowerCase();

  if (element.id) {
    options.push({
      selector: `//*[@id="${element.id}"]`,
      score: 95,
      explanation: 'ID-based XPath - highly specific and stable'
    });
  }

  const dataAttrs = Array.from(element.attributes).filter(attr =>
    attr.name.startsWith('data-')
  );

  if (dataAttrs.length > 0) {
    const attr = dataAttrs[0];
    options.push({
      selector: `//${tagName}[@${attr.name}="${attr.value}"]`,
      score: 90,
      explanation: 'Data attribute XPath - very stable'
    });
  }

  const rowInfo = findAncestorRow(element);
  if (rowInfo) {
    const { row, valueCell, subPath } = rowInfo;
    const cells = Array.from(row.children);
    const cellIndex = cells.indexOf(valueCell);

    if (cellIndex > 0) {
      const labelCell = cells[0];

      const boldElements = labelCell?.querySelectorAll('b, strong');
      if (boldElements && boldElements.length > 0) {
        const labelText = boldElements[0].textContent?.trim() || '';
        if (labelText && labelText.length > 0 && labelText.length < 30) {
          const cleanLabel = labelText.replace(/'/g, "&apos;");
          const baseSel = `//td[.//b[text()='${cleanLabel}']]/following-sibling::td[${cellIndex}]`;

          const sectionHeader = findTableSectionHeader(row);
          if (sectionHeader) {
            const cleanHeader = sectionHeader.replace(/'/g, "&apos;");
            options.push({
              selector: `//table[.//b[text()='${cleanHeader}']]//td[.//b[text()='${cleanLabel}']]/following-sibling::td[${cellIndex}]${subPath}`,
              score: 99,
              explanation: `Table "${sectionHeader}" > label "${labelText}" with full path - most specific`
            });
          }

          options.push({
            selector: `${baseSel}${subPath}`,
            score: 98,
            explanation: `Find by bold label "${labelText}"${subPath ? ' with sub-element path' : ''} - very stable`
          });
        }
      }

      const labelText = labelCell?.textContent?.trim() || '';
      if (labelText && labelText.includes(':')) {
        const labelMatch = labelText.match(/^([^:]+):/);
        if (labelMatch) {
          const label = labelMatch[1].trim().replace(/'/g, "&apos;");
          options.push({
            selector: `//tr[td[contains(text(), '${label}')]]/td[${cellIndex + 1}]${subPath}`,
            score: 93,
            explanation: `Find row by label "${label}", column ${cellIndex + 1}${subPath ? ' with sub-path' : ''}`
          });
        }
      }
    }

    if (cellIndex === 0) {
      const firstCellText = valueCell.textContent?.trim() || '';
      if (firstCellText && firstCellText.includes(':')) {
        const labelMatch = firstCellText.match(/^([^:]+):/);
        if (labelMatch) {
          const label = labelMatch[1].trim().replace(/'/g, "&apos;");
          const nextCell = cells[1];
          if (nextCell) {
            options.push({
              selector: `//tr[td[contains(text(), '${label}')]]/td[2]${subPath}`,
              score: 93,
              explanation: `Find row by label "${label}", get value cell`
            });
          }
        }
      }
    }
  }

  const previousSibling = element.previousElementSibling;
  if (previousSibling) {
    const boldElements = previousSibling.querySelectorAll('b, strong');
    if (boldElements.length > 0) {
      const labelText = boldElements[0].textContent?.trim() || '';
      if (labelText && labelText.length > 0 && labelText.length < 30) {
        const cleanLabel = labelText.replace(/'/g, "&apos;");
        options.push({
          selector: `//*[.//b[text()='${cleanLabel}']]/following-sibling::${tagName}[1]`,
          score: 96,
          explanation: `Find by bold label "${labelText}" in previous sibling - very stable`
        });
      }
    }

    const prevText = previousSibling.textContent?.trim() || '';
    if (prevText && prevText.length < 50 && prevText.includes(':')) {
      const labelMatch = prevText.match(/^([^:]+):/);
      if (labelMatch) {
        const label = labelMatch[1].trim().replace(/'/g, "&apos;");
        options.push({
          selector: `//${previousSibling.tagName.toLowerCase()}[contains(text(), '${label}')]/following-sibling::${tagName}[1]`,
          score: 92,
          explanation: `Find by adjacent label "${label}" - very stable for labeled fields`
        });
      }
    }
  }

  if (element.className && typeof element.className === 'string') {
    const classes = element.className.trim().split(/\s+/).filter(c =>
      c && !['element-hover', 'element-breadcrumb'].includes(c)
    );

    if (classes.length > 0) {
      const classConditions = classes.map(c => `contains(@class, '${c}')`).join(' and ');
      options.push({
        selector: `//${tagName}[${classConditions}]`,
        score: 75,
        explanation: 'Class-based XPath - moderately stable'
      });
    }
  }

  let current: Element | null = element;
  const pathParts: string[] = [];
  let depth = 0;
  const maxDepth = 8;

  while (current && current !== document.body && depth < maxDepth) {
    let part = current.tagName.toLowerCase();

    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(s =>
        s.tagName === current!.tagName
      );

      if (siblings.length > 1) {
        const index = siblings.indexOf(current!) + 1;
        part += `[${index}]`;
      }
    }

    pathParts.unshift(part);
    current = parent;
    depth++;
  }

  if (pathParts.length > 0) {
    const fullPath = '//' + pathParts.join('/');
    options.push({
      selector: fullPath,
      score: 50,
      explanation: 'Position-based XPath - fragile, avoid if possible'
    });
  }

  return options.sort((a, b) => b.score - a.score);
}

export interface SelectorTestResult {
  isValid: boolean;
  matchCount: number;
  error?: string;
  extractedValue?: string;
}

export function evaluateXPath(doc: Document, xpath: string): XPathResult | null {
  try {
    return doc.evaluate(xpath, doc, null, XPathResult.ANY_TYPE, null);
  } catch (err) {
    console.error('XPath evaluation error:', err);
    return null;
  }
}

function isXPathStringFunction(xpath: string): boolean {
  const trimmed = xpath.trim();
  return /^(substring-after|substring-before|substring|concat|normalize-space|translate|string-length|contains|starts-with|string|number|sum|count)\s*\(/.test(trimmed);
}

export function testSelector(html: string, selector: string): SelectorTestResult {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const normalized = normalizeXPathSelector(selector);

    if (isXPathStringFunction(normalized)) {
      const result = doc.evaluate(normalized, doc, null, XPathResult.STRING_TYPE, null);
      const val = result.stringValue?.trim() || '';
      return {
        isValid: true,
        matchCount: val ? 1 : 0,
        extractedValue: val || undefined
      };
    }

    const result = evaluateXPath(doc, normalized);
    if (!result) {
      return {
        isValid: false,
        matchCount: 0,
        error: 'Invalid XPath expression'
      };
    }

    const nodes: Node[] = [];
    let node = result.iterateNext();
    while (node) {
      nodes.push(node);
      node = result.iterateNext();
    }

    return {
      isValid: true,
      matchCount: nodes.length,
      extractedValue: nodes.length > 0 ? nodes[0].textContent?.trim() || '' : undefined
    };
  } catch (err) {
    return {
      isValid: false,
      matchCount: 0,
      error: err instanceof Error ? err.message : 'Invalid XPath'
    };
  }
}

export function extractValueWithSelector(
  html: string,
  selector: string,
  attribute?: string
): string | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const normalized = normalizeXPathSelector(selector);

    if (isXPathStringFunction(normalized)) {
      const result = doc.evaluate(normalized, doc, null, XPathResult.STRING_TYPE, null);
      return result.stringValue?.trim() || null;
    }

    const result = evaluateXPath(doc, normalized);
    if (!result) return null;

    const node = result.iterateNext();
    if (!node) return null;

    let value: string;

    if (attribute && node.nodeType === Node.ELEMENT_NODE) {
      value = (node as Element).getAttribute(attribute) || '';
    } else {
      value = node.textContent?.trim() || '';
    }

    return value;
  } catch (err) {
    console.error('Error extracting value:', err);
    return null;
  }
}

export interface TableStructure {
  tableSelector: string;
  rowSelector: string;
  columns: Array<{
    headerText: string;
    cellSelector: string;
  }>;
}

export function detectTableStructure(element: Element): TableStructure | null {
  let table = element.closest('table');

  if (!table) {
    return null;
  }

  const tableOptions = generateXPathSelectors(table);
  const tableSelector = tableOptions.length > 0 ? tableOptions[0].selector : '//table';

  const rows = Array.from(table.querySelectorAll('tr')).filter(row => {
    const cells = row.querySelectorAll('td');
    return cells.length > 0;
  });

  if (rows.length === 0) return null;

  const firstDataRow = rows[0];
  const cells = Array.from(firstDataRow.querySelectorAll('td'));

  const headers = Array.from(table.querySelectorAll('th'));

  const columns = cells.map((cell, index) => {
    const headerText = headers[index]?.textContent?.trim() || `Column ${index + 1}`;
    const cellSelector = `td[${index + 1}]`;

    return {
      headerText,
      cellSelector
    };
  });

  return {
    tableSelector,
    rowSelector: './/tr[td]',
    columns
  };
}

export function scoreSelectorStability(selector: string): number {
  let score = 50;

  if (selector.includes('@id=')) score += 40;
  else if (selector.includes('[data-') || selector.includes('@data-')) score += 35;
  else if (selector.includes('contains(text(),')) score += 30;

  if (selector.includes('following-sibling::') || selector.includes('preceding-sibling::')) {
    score += 20;
  }

  const positionCount = (selector.match(/\[\d+\]/g) || []).length;
  score -= positionCount * 8;

  const slashCount = (selector.match(/\//g) || []).length;
  if (slashCount > 5) {
    score -= (slashCount - 5) * 3;
  }

  if (selector.includes('ancestor::') || selector.includes('descendant::')) {
    score += 5;
  }

  return Math.max(0, Math.min(100, score));
}

export interface FlexibleXPathResult {
  type: 'string' | 'number' | 'node' | 'nodes' | 'boolean';
  stringValue?: string;
  numberValue?: number;
  booleanValue?: boolean;
  node?: Node;
  nodes?: Node[];
}

export function evaluateXPathFlexible(
  doc: Document,
  xpath: string,
  contextNode?: Node
): FlexibleXPathResult | null {
  try {
    const context = contextNode || doc;
    const result = doc.evaluate(xpath, context, null, XPathResult.ANY_TYPE, null);

    switch (result.resultType) {
      case XPathResult.STRING_TYPE:
        return { type: 'string', stringValue: result.stringValue };
      case XPathResult.NUMBER_TYPE:
        return { type: 'number', numberValue: result.numberValue, stringValue: String(result.numberValue) };
      case XPathResult.BOOLEAN_TYPE:
        return { type: 'boolean', booleanValue: result.booleanValue, stringValue: String(result.booleanValue) };
      case XPathResult.UNORDERED_NODE_ITERATOR_TYPE:
      case XPathResult.ORDERED_NODE_ITERATOR_TYPE: {
        const nodes: Node[] = [];
        let node = result.iterateNext();
        while (node) {
          nodes.push(node);
          node = result.iterateNext();
        }
        if (nodes.length === 0) return null;
        return {
          type: nodes.length === 1 ? 'node' : 'nodes',
          node: nodes[0],
          nodes,
          stringValue: nodes[0].textContent?.trim() || ''
        };
      }
      case XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE:
      case XPathResult.ORDERED_NODE_SNAPSHOT_TYPE: {
        const nodes: Node[] = [];
        for (let i = 0; i < result.snapshotLength; i++) {
          const n = result.snapshotItem(i);
          if (n) nodes.push(n);
        }
        if (nodes.length === 0) return null;
        return {
          type: nodes.length === 1 ? 'node' : 'nodes',
          node: nodes[0],
          nodes,
          stringValue: nodes[0].textContent?.trim() || ''
        };
      }
      case XPathResult.ANY_UNORDERED_NODE_TYPE:
      case XPathResult.FIRST_ORDERED_NODE_TYPE: {
        const node = result.singleNodeValue;
        if (!node) return null;
        return {
          type: 'node',
          node,
          nodes: [node],
          stringValue: node.textContent?.trim() || ''
        };
      }
      default:
        return null;
    }
  } catch (err) {
    console.error('Flexible XPath evaluation error:', err);
    return null;
  }
}

export function evaluateXPathAsString(
  doc: Document,
  xpath: string,
  contextNode?: Node
): string | null {
  try {
    const context = contextNode || doc;

    if (isXPathStringFunction(xpath)) {
      const result = doc.evaluate(xpath, context, null, XPathResult.STRING_TYPE, null);
      const val = result.stringValue?.trim();
      return val || null;
    }

    const flexResult = evaluateXPathFlexible(doc, xpath, contextNode);
    if (!flexResult) return null;
    return flexResult.stringValue?.trim() || null;
  } catch {
    try {
      const flexResult = evaluateXPathFlexible(doc, xpath, contextNode);
      if (!flexResult) return null;
      return flexResult.stringValue?.trim() || null;
    } catch {
      return null;
    }
  }
}

export function generalizeRowSelector(element: Element): SelectorOption[] {
  const options: SelectorOption[] = [];

  let row: HTMLTableRowElement | null = null;
  if (element.tagName.toLowerCase() === 'tr') {
    row = element as HTMLTableRowElement;
  } else {
    row = element.closest('tr');
  }

  if (!row) return options;

  const table = row.closest('table');
  if (!table) return options;

  const tbody = row.closest('tbody');
  const rowContainer = tbody || table;

  const allRows = Array.from(rowContainer.querySelectorAll(':scope > tr'));
  const hasThHeader = allRows.length > 0 && allRows[0].querySelectorAll('th').length > 0;
  const hasDataCells = (r: Element) => r.querySelectorAll('td').length > 0;

  const tableXPaths = generateXPathSelectors(table);
  const tablePath = tableXPaths.length > 0 ? tableXPaths[0].selector : '//table';

  const tbodyPart = tbody ? '/tbody' : '';

  if (hasThHeader) {
    options.push({
      selector: `${tablePath}${tbodyPart}/tr[td]`,
      score: 95,
      explanation: 'All data rows (excluding header with <th> elements)'
    });
  }

  const firstDataRowIndex = allRows.findIndex(r => hasDataCells(r));
  if (firstDataRowIndex > 0) {
    options.push({
      selector: `${tablePath}${tbodyPart}/tr[position()>${firstDataRowIndex}]`,
      score: 90,
      explanation: `All rows after row ${firstDataRowIndex} (skipping header)`
    });
  }

  if (!hasThHeader && firstDataRowIndex <= 0) {
    options.push({
      selector: `${tablePath}${tbodyPart}/tr[position()>1]`,
      score: 85,
      explanation: 'All rows except the first (assumed header)'
    });
  }

  options.push({
    selector: `${tablePath}${tbodyPart}/tr`,
    score: 70,
    explanation: 'All rows including header'
  });

  return options;
}

export function generateRelativeColumnSelector(element: Element): SelectorOption[] {
  const options: SelectorOption[] = [];

  let cell: HTMLTableCellElement | null = null;
  if (element.tagName.toLowerCase() === 'td' || element.tagName.toLowerCase() === 'th') {
    cell = element as HTMLTableCellElement;
  } else {
    cell = element.closest('td') || element.closest('th');
  }

  if (!cell) return options;

  const row = cell.closest('tr');
  if (!row) return options;

  const cells = Array.from(row.children).filter(
    c => c.tagName.toLowerCase() === 'td' || c.tagName.toLowerCase() === 'th'
  );
  const cellIndex = cells.indexOf(cell) + 1;
  const cellTag = cell.tagName.toLowerCase();

  const subPath = cell !== element ? buildSubPath(cell, element) : '';

  if (subPath) {
    options.push({
      selector: `${cellTag}[${cellIndex}]${subPath}`,
      score: 90,
      explanation: `Column ${cellIndex}, sub-element path`
    });
  }

  options.push({
    selector: `${cellTag}[${cellIndex}]`,
    score: 85,
    explanation: `Column ${cellIndex} (full cell text)`
  });

  if (cell.children.length === 1) {
    const child = cell.children[0];
    const childTag = child.tagName.toLowerCase();
    options.push({
      selector: `${cellTag}[${cellIndex}]/${childTag}`,
      score: 80,
      explanation: `Column ${cellIndex} > ${childTag}`
    });
  }

  return options;
}
