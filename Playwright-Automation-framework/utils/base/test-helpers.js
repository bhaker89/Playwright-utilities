/**
 * ============================================================================
 * TEST HELPERS - Backward Compatibility Layer
 * ============================================================================
 * 
 * This file maintains backward compatibility by re-exporting from the new
 * organized structure (utils/ui/ui-actions.js).
 * 
 * NEW CODE should import directly from:
 * - utils/ui/ui-actions.js (UI helpers)
 * - utils/network/network-actions.js (Network helpers)
 * 
 * This file exists only for existing tests that already import from here.
 * ============================================================================
 */

// Re-export all UI actions for backward compatibility
const {
  waitForPageLoad,
  waitForNetworkIdleSafe,
  takeScreenshot,
  waitForElement,
  scrollToElement,
  clickAndWaitForPopup,
  downloadAfterClick,
  uploadFile,
  expectToast,
  withinFrame,
  grantPermissions,
  generateRandomString,
  generateRandomEmail,
  generateRandomPhone,
  wait,
  retry,
} = require('../ui/ui-actions');

// Re-export everything for backward compatibility
module.exports = {
  // Page Load & Navigation
  waitForPageLoad,
  waitForNetworkIdleSafe,
  
  // Screenshot & Visual
  takeScreenshot,
  
  // Element Interaction
  waitForElement,
  scrollToElement,
  
  // Popup / New Tab
  clickAndWaitForPopup,
  
  // Download
  downloadAfterClick,
  
  // Upload
  uploadFile,
  
  // Toast / Notification
  expectToast,
  
  // Iframe
  withinFrame,
  
  // Permissions
  grantPermissions,
  
  // Utilities
  generateRandomString,
  generateRandomEmail,
  generateRandomPhone,
  wait,
  retry,
};