# WordPress Form Deployment Guide

## Prerequisites
- WordPress admin access
- FTP/sFTP access to server
- VPS IP address for automation API
root@dokploy:/var/lib/docker/volumes/b7ceba9e223b48315a6982cef57d0b21ee857cbd4d14b1a84b07d25bb1287d5a/_data/wordpress-themes/royal-elementor-kit-child#
## Step 1: Update Configuration

Edit `page-preventivo.php` and update the API URL:

```php
const API_URL = 'http://YOUR_VPS_IP:3000/api/quote';
```

## Step 2: Upload to WordPress

1. Connect to your WordPress site via FTP
2. Navigate to: `wp-content/themes/`
3. Create folder: `preventivo/`
4. Upload files:
   - `functions.php`
   - `style.css`
   - `page-preventivo.php`

## Step 4: Create the Page

1. Go to Pages → Add New
2. Title: "Richiedi Preventivo Evento"
3. Page Attributes → Template: select "Preventivo Evento"
4. Publish the page
5. URL must match the file name (e.g., `/preventivo/` or `/richiedi-preventivo/` if you change the file name to `page-richiedi-preventivo.php`)

## Step 5: Add Link to Main Site

1. Edit the page where you want the button
2. Add a button linking to the new page
3. Button text: "Richiedi Preventivo"

## Step 6: Test

1. Visit the new page
2. Fill the form with test data
3. Submit and verify quote is generated
4. Check all error states work

## Troubleshooting

### CORS Errors
If you see CORS errors in browser console:
- Ensure your Express API has CORS enabled for golinucci.it
- Add to your Express app:
  ```javascript
  app.use(cors({ origin: 'https://golinucci.it' }));
  ```

### Form Not Styled
- Verify child theme is activated
- Clear browser cache
- Check that style.css is in the correct folder

### API Timeout
Adjust timeout in `page-preventivo.php`:
```php
const API_TIMEOUT_MS = 60000; // 60 seconds
```

### Page Template Not Showing
- Ensure file is named exactly `page-preventivo.php`
- Check that the PHP comment header is present
- Try re-uploading the file

## Maintenance

### Updating API URL
If your VPS IP changes, edit:
```php
const API_URL = 'http://NEW_IP:3000/api/quote';
```

### Adjusting Timeout
If quotes take longer to generate, increase:
```php
const API_TIMEOUT_MS = 45000; // 45 seconds
```

### Styling Changes
Modify `style.css` and re-upload. Changes are immediate.

---

## Local Testing (Optional)

You can test the form locally without connecting to the automation API.

### Enable Test Mode

Add this at the top of `page-preventivo.php` (after the opening `<?php` tag):

```php
// TEST MODE - Uncomment for local testing without API
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Check if this is an AJAX request
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    if (strpos($contentType, 'json') !== false) {
        header('Content-Type: application/json');
        echo json_encode([
            'success' => true,
            'quoteKey' => 'TEST-' . uniqid(),
            'proposalUrl' => 'https://example.com/proposal',
            'duration' => '5000ms'
        ]);
        exit;
    }
}
```

### Form Validation Test Checklist

1. **Empty Form Submission**
   - Click submit without filling any fields
   - Verify HTML5 validation prevents submission
   - Required fields should be highlighted

2. **Invalid Email**
   - Enter "not-an-email" in email field
   - Submit should show email validation error

3. **Past Date**
   - Select yesterday's date
   - Verify min date validation works

4. **Privacy Checkbox**
   - Try submitting without checking privacy
   - Verify browser prevents submission

5. **Complete Form**
   - Fill all required fields correctly
   - Submit should show success message
   - Verify quote reference is displayed

6. **Reset Form**
   - Click "Richiedi Nuovo Preventivo"
   - Form should reset and be visible again

### Remove Test Code Before Deploy

Delete the test mode block before uploading to production.
