# Standardized UI Test Case Template (CSV/Excel)

To ensure the `UIGenerator` correctly parses your test plans, please use the following header structure and data format.

## 📋 Header Definitions

| Column Name | Description | Example |
| :--- | :--- | :--- |
| **Title** | A short, unique name for the test case. | `Verify Login Success` |
| **Preconditions** | Any steps required before the main test starts (e.g., URL to visit). | `User is on https://stag.example.com` |
| **Steps** | Newline-separated list of actions. Use actionable verbs. | `1. Enter 'admin' into Username` <br> `2. Click Login` |
| **ExpectedResult** | The final validation criteria for the test. | `Dashboard heading is visible` |

## 📝 Example CSV Format

```csv
Title,Preconditions,Steps,ExpectedResult
"Add SKU to Cart","On SKU PDP Page","1. Click 'Add to Cart' button\n2. Wait for success toast\n3. Click 'Cart' icon","SKU ID '123' is visible in cart"
```

## 💡 AI Discovery Tips
- **Be Descriptive**: Instead of "Click button", use "Click 'Add to Cart' button". The AI uses the quoted text to search the Accessibility Tree.
- **Verbs Matter**: Use "Enter", "Click", "Select", "Check" to help the AI map the correct ARIA roles (textbox, button, combobox, checkbox).
