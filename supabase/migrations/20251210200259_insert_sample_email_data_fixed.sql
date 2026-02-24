/*
  # Insert Sample Email Data for Testing

  1. Purpose
    - Add sample email data to test the email order parsing system
    - Includes examples of both template types
    - Provides realistic order data for demonstration

  2. Sample Data
    - 3 sample emails with different formats
    - Includes HTML content with order details
    - Covers both template_1 and template_2 formats
*/

-- Sample Email 1: Template 1 format
INSERT INTO raw_emails (
  subject,
  from_address,
  raw_content,
  html_content,
  text_content,
  received_at
) VALUES (
  'New Order #12345 from Restaurant ABC',
  'orders@restaurant-abc.com',
  '<html><body><h2>Order Details</h2><p><strong>Restaurant:</strong> Restaurant ABC</p><p><strong>Order Number:</strong> 12345</p><p><strong>Delivery Address:</strong> 123 Main Street, Suite 100, New York, NY 10001</p><p><strong>Billing Address:</strong> 123 Main Street, Suite 100, New York, NY 10001</p><p><strong>Notes:</strong> Please deliver to back entrance</p></body></html>',
  '<html>
    <body>
      <h2>Order Details</h2>
      <p><strong>Restaurant:</strong> Restaurant ABC</p>
      <p><strong>Order Number:</strong> 12345</p>
      <p><strong>Delivery Address:</strong> 123 Main Street, Suite 100, New York, NY 10001</p>
      <p><strong>Billing Address:</strong> 123 Main Street, Suite 100, New York, NY 10001</p>
      <p><strong>Notes:</strong> Please deliver to back entrance</p>
      <h3>Order Items</h3>
      <table border="1">
        <tr>
          <th>Product Code</th>
          <th>Product Name</th>
          <th>Quantity</th>
          <th>Unit Price</th>
          <th>Total</th>
        </tr>
        <tr>
          <td>SKU-001</td>
          <td>Fresh Tomatoes (5 lbs)</td>
          <td>10</td>
          <td>$12.50</td>
          <td>$125.00</td>
        </tr>
        <tr>
          <td>SKU-002</td>
          <td>Organic Lettuce (case)</td>
          <td>5</td>
          <td>$18.00</td>
          <td>$90.00</td>
        </tr>
        <tr>
          <td>SKU-003</td>
          <td>Premium Olive Oil (1L)</td>
          <td>8</td>
          <td>$25.00</td>
          <td>$200.00</td>
        </tr>
      </table>
    </body>
  </html>',
  'Restaurant: Restaurant ABC
Order Number: 12345
Delivery Address: 123 Main Street, Suite 100, New York, NY 10001
Billing Address: 123 Main Street, Suite 100, New York, NY 10001
Notes: Please deliver to back entrance

Order Items:
Product Code | Product Name | Quantity | Unit Price | Total
SKU-001 | Fresh Tomatoes (5 lbs) | 10 | $12.50 | $125.00
SKU-002 | Organic Lettuce (case) | 5 | $18.00 | $90.00
SKU-003 | Premium Olive Oil (1L) | 8 | $25.00 | $200.00',
  now() - interval '2 days'
);

-- Sample Email 2: Template 2 format (Invoice style)
INSERT INTO raw_emails (
  subject,
  from_address,
  raw_content,
  html_content,
  text_content,
  received_at
) VALUES (
  'Invoice #INV-9876 - The Gourmet Kitchen',
  'billing@gourmet-supplies.com',
  '<html><body><h2>INVOICE</h2><p><strong>Customer:</strong> The Gourmet Kitchen</p><p><strong>Invoice Number:</strong> INV-9876</p><p><strong>Ship To:</strong> 456 Oak Avenue, Floor 2, Los Angeles, CA 90012</p></body></html>',
  '<html>
    <body>
      <h2>INVOICE</h2>
      <p><strong>Customer:</strong> The Gourmet Kitchen</p>
      <p><strong>Invoice Number:</strong> INV-9876</p>
      <p><strong>Ship To:</strong> 456 Oak Avenue, Floor 2, Los Angeles, CA 90012</p>
      <p><strong>Bill To:</strong> 456 Oak Avenue, Floor 2, Los Angeles, CA 90012</p>
      <p><strong>Comments:</strong> Rush delivery requested</p>
      <h3>Items</h3>
      <table border="1">
        <tr>
          <th>Item #</th>
          <th>Description</th>
          <th>Qty</th>
          <th>Price</th>
          <th>Amount</th>
        </tr>
        <tr>
          <td>PROD-100</td>
          <td>Angus Beef Ribeye (per lb)</td>
          <td>50</td>
          <td>$22.00</td>
          <td>$1,100.00</td>
        </tr>
        <tr>
          <td>PROD-101</td>
          <td>Fresh Salmon Fillet (per lb)</td>
          <td>30</td>
          <td>$18.50</td>
          <td>$555.00</td>
        </tr>
        <tr>
          <td>PROD-102</td>
          <td>Seasonal Vegetables Mix (case)</td>
          <td>12</td>
          <td>$35.00</td>
          <td>$420.00</td>
        </tr>
      </table>
    </body>
  </html>',
  'INVOICE
Customer: The Gourmet Kitchen
Invoice Number: INV-9876
Ship To: 456 Oak Avenue, Floor 2, Los Angeles, CA 90012
Bill To: 456 Oak Avenue, Floor 2, Los Angeles, CA 90012
Comments: Rush delivery requested

Items:
Item # | Description | Qty | Price | Amount
PROD-100 | Angus Beef Ribeye (per lb) | 50 | $22.00 | $1,100.00
PROD-101 | Fresh Salmon Fillet (per lb) | 30 | $18.50 | $555.00
PROD-102 | Seasonal Vegetables Mix (case) | 12 | $35.00 | $420.00',
  now() - interval '1 day'
);

-- Sample Email 3: Another Template 1 format
INSERT INTO raw_emails (
  subject,
  from_address,
  raw_content,
  html_content,
  text_content,
  received_at
) VALUES (
  'Purchase Order #PO-5544 Confirmation',
  'orders@downtown-bistro.com',
  '<html><body><h2>Purchase Order Confirmation</h2><p><strong>Requester:</strong> Downtown Bistro</p><p><strong>Order Number:</strong> PO-5544</p></body></html>',
  '<html>
    <body>
      <h2>Purchase Order Confirmation</h2>
      <p><strong>Requester:</strong> Downtown Bistro</p>
      <p><strong>Order Number:</strong> PO-5544</p>
      <p><strong>Delivery Address:</strong> 789 Broadway Street, Unit B, Chicago, IL 60601</p>
      <p><strong>Billing Address:</strong> 789 Broadway Street, Unit B, Chicago, IL 60601</p>
      <p><strong>Notes:</strong> Call upon arrival</p>
      <h3>Products</h3>
      <table border="1">
        <tr>
          <th>Product Code</th>
          <th>Product Name</th>
          <th>Quantity</th>
          <th>Unit Price</th>
          <th>Total</th>
        </tr>
        <tr>
          <td>BEV-205</td>
          <td>Sparkling Water (24-pack)</td>
          <td>20</td>
          <td>$8.50</td>
          <td>$170.00</td>
        </tr>
        <tr>
          <td>BEV-206</td>
          <td>Fresh Orange Juice (gallon)</td>
          <td>15</td>
          <td>$12.00</td>
          <td>$180.00</td>
        </tr>
        <tr>
          <td>DRY-301</td>
          <td>All-Purpose Flour (50 lbs)</td>
          <td>6</td>
          <td>$28.00</td>
          <td>$168.00</td>
        </tr>
        <tr>
          <td>DRY-302</td>
          <td>Granulated Sugar (25 lbs)</td>
          <td>8</td>
          <td>$22.00</td>
          <td>$176.00</td>
        </tr>
      </table>
    </body>
  </html>',
  'Purchase Order Confirmation
Requester: Downtown Bistro
Order Number: PO-5544
Delivery Address: 789 Broadway Street, Unit B, Chicago, IL 60601
Billing Address: 789 Broadway Street, Unit B, Chicago, IL 60601
Notes: Call upon arrival

Products:
Product Code | Product Name | Quantity | Unit Price | Total
BEV-205 | Sparkling Water (24-pack) | 20 | $8.50 | $170.00
BEV-206 | Fresh Orange Juice (gallon) | 15 | $12.00 | $180.00
DRY-301 | All-Purpose Flour (50 lbs) | 6 | $28.00 | $168.00
DRY-302 | Granulated Sugar (25 lbs) | 8 | $22.00 | $176.00',
  now()
);