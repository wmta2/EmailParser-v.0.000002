import React, { useRef, useEffect } from 'react';
import { sanitizeHTML, generateXPathSelectors, generalizeRowSelector, generateRelativeColumnSelector, SelectorOption } from '../lib/domUtils';

type SelectionFieldType = 'field' | 'table-row' | 'table-column';

interface EmailRendererProps {
  html: string;
  selectionMode: boolean;
  selectionFieldType?: SelectionFieldType;
  onElementSelected: (selector: string, value: string, alternatives: SelectorOption[]) => void;
}

export function EmailRenderer({ html, selectionMode, selectionFieldType, onElementSelected }: EmailRendererProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const fieldTypeRef = useRef<SelectionFieldType | undefined>(selectionFieldType);
  fieldTypeRef.current = selectionFieldType;

  useEffect(() => {
    if (!iframeRef.current) return;

    const iframe = iframeRef.current;
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;

    if (!iframeDoc) return;

    const sanitized = sanitizeHTML(html);

    const styledHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              margin: 0;
              padding: 20px;
              font-family: Arial, sans-serif;
            }
            .element-hover {
              outline: 2px solid #3b82f6 !important;
              outline-offset: 2px;
              cursor: pointer !important;
              background-color: rgba(59, 130, 246, 0.05) !important;
            }
            .element-breadcrumb {
              position: fixed;
              bottom: 10px;
              left: 10px;
              background: rgba(0, 0, 0, 0.8);
              color: white;
              padding: 8px 12px;
              border-radius: 4px;
              font-size: 12px;
              font-family: monospace;
              z-index: 10000;
              max-width: 80%;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
          </style>
        </head>
        <body>
          ${sanitized}
        </body>
      </html>
    `;

    iframeDoc.open();
    iframeDoc.write(styledHTML);
    iframeDoc.close();

    if (selectionMode) {
      setupSelectionHandlers(iframeDoc);
    }
  }, [html, selectionMode]);

  const setupSelectionHandlers = (doc: Document) => {
    let currentHovered: Element | null = null;
    let breadcrumbEl: HTMLDivElement | null = null;

    const handleMouseOver = (e: MouseEvent) => {
      e.stopPropagation();
      const target = e.target as Element;

      if (target === currentHovered || target.classList.contains('element-breadcrumb')) {
        return;
      }

      if (currentHovered) {
        currentHovered.classList.remove('element-hover');
      }

      currentHovered = target;
      target.classList.add('element-hover');

      if (!breadcrumbEl) {
        breadcrumbEl = doc.createElement('div');
        breadcrumbEl.className = 'element-breadcrumb';
        doc.body.appendChild(breadcrumbEl);
      }

      const path = getElementPath(target);
      breadcrumbEl.textContent = path;
      breadcrumbEl.style.display = 'block';
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as Element;
      target.classList.remove('element-hover');

      if (breadcrumbEl) {
        breadcrumbEl.style.display = 'none';
      }
    };

    const handleClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const target = e.target as Element;

      if (target.classList.contains('element-breadcrumb')) {
        return;
      }

      target.classList.remove('element-hover');

      const currentFieldType = fieldTypeRef.current;
      let selectors: SelectorOption[];

      if (currentFieldType === 'table-row') {
        selectors = generalizeRowSelector(target);
        if (selectors.length === 0) {
          selectors = generateXPathSelectors(target);
        }
      } else if (currentFieldType === 'table-column') {
        selectors = generateRelativeColumnSelector(target);
        if (selectors.length === 0) {
          selectors = generateXPathSelectors(target);
        }
      } else {
        selectors = generateXPathSelectors(target);
      }

      const value = target.textContent?.trim() || '';

      if (selectors.length > 0) {
        onElementSelected(selectors[0].selector, value, selectors);
      }

      if (breadcrumbEl) {
        breadcrumbEl.remove();
        breadcrumbEl = null;
      }
    };

    doc.body.addEventListener('mouseover', handleMouseOver);
    doc.body.addEventListener('mouseout', handleMouseOut);
    doc.body.addEventListener('click', handleClick);
  };

  const getElementPath = (element: Element): string => {
    const path: string[] = [];
    let current: Element | null = element;
    const temporaryClasses = ['element-hover', 'element-breadcrumb'];

    while (current && current !== document.body && path.length < 4) {
      let part = current.tagName.toLowerCase();

      if (current.id) {
        part += `#${current.id}`;
      } else if (current.className && typeof current.className === 'string') {
        const classes = current.className
          .trim()
          .split(/\s+/)
          .filter(c => c && !temporaryClasses.includes(c))
          .slice(0, 2);
        if (classes.length > 0) {
          part += `.${classes.join('.')}`;
        }
      }

      path.unshift(part);
      current = current.parentElement;
    }

    return path.join(' > ');
  };

  return (
    <div className="w-full h-full bg-white rounded border">
      {selectionMode && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-2 text-sm text-blue-800">
          <strong>Selection Mode:</strong> Click on any element in the email to map it to the field
        </div>
      )}
      <iframe
        ref={iframeRef}
        className="w-full h-full border-0"
        title="Email Preview"
        sandbox="allow-same-origin"
      />
    </div>
  );
}
