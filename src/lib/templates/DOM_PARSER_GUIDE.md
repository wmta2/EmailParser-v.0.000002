# DOM-Based Email Parser Guide

## Overview

The DOM-based parser is an alternative to regex-based parsing that uses CSS selectors and DOM traversal to extract data from HTML emails. It's more reliable for well-structured HTML content.

## Key Benefits

1. **More Reliable**: Works with the actual HTML structure instead of text patterns
2. **Easier to Configure**: Uses CSS selectors instead of complex regex
3. **Better for Tables**: Naturally handles table structures
4. **Maintainable**: Easier to debug and modify selectors

## How It Works

### 1. Template Registration

The DOM test template (`dom-test`) is registered in the database and automatically used when:
- An email has HTML content
- The template detection matches (based on keywords)

### 2. CSS Selectors

Instead of regex patterns like:
```
start: "Order Number:"
end: "\n"
```

You use CSS selectors:
```typescript
orderNumber: {
  selector: 'h1, h2, .order-number',
  transform: (value) => value.match(/\d+/)?.[0]
}
```

### 3. Parsing Process

1. Email HTML is loaded into a DOM parser
2. CSS selectors extract data from specific elements
3. Optional transform functions clean/format the data
4. Results are mapped to the order structure

## Configuration Examples

### Basic Field Extraction

```typescript
// Extract order number from heading
orderNumber: {
  selector: 'h1',
  transform: (value: string) => value.match(/\d+/)?.[0]
}
```

### Table Parsing

```typescript
orderItems: {
  tableSelector: 'table.order-items',
  rowSelector: 'tbody tr',
  columns: {
    productName: { selector: 'td:first-child' },
    quantity: {
      selector: 'td:nth-child(2)',
      transform: (v) => parseFloat(v) || 1
    },
    unitPrice: {
      selector: 'td:nth-child(3)',
      transform: parseCurrency
    }
  }
}
```

### Address Block Parsing

```typescript
deliveryAddress: {
  blockSelector: '.shipping-address',
  blockParser: (text: string) => {
    const lines = text.split('\n').filter(l => l.trim());
    return {
      name: lines[0],
      address1: lines[1],
      town: lines[2],
      postcode: lines[3]
    };
  }
}
```

## Testing the DOM Parser

### 1. Via UI

1. Go to the Email List page
2. Find an email with HTML content
3. The system will automatically try the DOM parser if it's a good match
4. Preview the parsed data before saving

### 2. Via Code

```typescript
import { parseWithDOM } from './templates/domTestTemplate';

const result = parseWithDOM(htmlContent, {
  selectors: {
    orderNumber: {
      selector: 'h1',
      transform: (v) => v.match(/\d+/)?.[0]
    }
  }
});
```

## Customizing for Different Providers

See `configExamples` in `domTestTemplate.ts` for pre-configured examples:

### WooCommerce
```typescript
const config = configExamples.woocommerce;
```

### Shopify
```typescript
const config = configExamples.shopify;
```

### Custom
```typescript
const config = {
  selectors: {
    orderNumber: { selector: '.your-class' },
    orderItems: {
      tableSelector: 'table#your-table',
      rowSelector: 'tr.order-row',
      columns: { /* ... */ }
    }
  }
};
```

## When to Use DOM vs Regex

### Use DOM Parser When:
- ✅ Email has well-structured HTML
- ✅ Data is in tables or consistent elements
- ✅ HTML structure is predictable
- ✅ You need to extract from specific classes/IDs

### Use Regex Parser When:
- ✅ Email is plain text only
- ✅ HTML structure varies significantly
- ✅ Data is in free-form text
- ✅ Simple pattern matching is sufficient

## Debugging

### Check Browser Console
The DOM parser logs helpful information:
```
DOM parser: No order number or items found
DOM parsing error: [error details]
```

### Inspect HTML Structure
1. View the raw email HTML
2. Use browser DevTools to find the right selectors
3. Test selectors in the browser console:
   ```javascript
   document.querySelector('.shipping-address')
   ```

### Test Selectors
You can test CSS selectors directly in the DOM parser:
```typescript
const parser = new DOMEmailParser(htmlContent);
const doc = parser.getDocument();
const element = doc.querySelector('.your-selector');
console.log(element?.textContent);
```

## Helper Functions

### parseCurrency
Extracts numeric value from currency strings:
```typescript
parseCurrency('$123.45') // 123.45
parseCurrency('£1,234.56') // 1234.56
```

### parseDate
Parses various date formats:
```typescript
parseDate('2024-12-25') // '2024-12-25'
parseDate('Dec 25, 2024') // '2024-12-25'
```

### extractEmail
Finds email addresses in text:
```typescript
extractEmail('Contact: john@example.com') // 'john@example.com'
```

### extractPhone
Finds phone numbers in text:
```typescript
extractPhone('Call: +44 20 1234 5678') // '+44 20 1234 5678'
```

## Next Steps

1. **Test with Real Emails**: Try the DOM parser with your actual email formats
2. **Adjust Selectors**: Modify the CSS selectors to match your email structure
3. **Create Custom Configs**: Add new provider configs in `domTestTemplate.ts`
4. **Compare Results**: Test both DOM and regex parsers to see which works better

## File Locations

- **DOM Parser**: `src/lib/domEmailParser.ts`
- **DOM Template**: `src/lib/templates/domTestTemplate.ts`
- **Template Engine**: `src/lib/templateEngine.ts` (integrates both parsers)
- **Database Template**: Added via migration `add_dom_test_template.sql`
