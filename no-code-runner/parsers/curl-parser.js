/**
 * Parses a cURL command and extracts all relevant information
 * Supports various cURL formats from different tools (Postman, Browser DevTools, etc.)
 */
class CurlParser {
  /**
   * Parse a cURL command string into a structured format
   * @param {string} curlCommand - The cURL command to parse
   * @returns {Object} Parsed command with url, method, headers, body, and queryParams
   */
  parse(curlCommand) {
    try {
      // Clean up the curl command
      const cleanedCurl = this.cleanCurlCommand(curlCommand);
      
      // Use curlconverter library to parse
      const parsed = this.parseCurlString(cleanedCurl);
      
      return {
        url: parsed.url,
        method: parsed.method || 'GET',
        headers: parsed.headers || {},
        body: parsed.body,
        queryParams: parsed.queryParams || {},
      };
    } catch (error) {
      throw new Error(`Failed to parse cURL command: ${error.message}`);
    }
  }

  /**
   * Clean and normalize cURL command
   * @param {string} curl - Raw cURL command
   * @returns {string} Cleaned cURL command
   * @private
   */
  cleanCurlCommand(curl) {
    // Remove line breaks and extra spaces
    let cleaned = curl
      .replace(/\\\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Ensure it starts with 'curl'
    if (!cleaned.toLowerCase().startsWith('curl')) {
      cleaned = 'curl ' + cleaned;
    }

    return cleaned;
  }

  /**
   * Parse cURL string using regex patterns
   * @param {string} curl - Cleaned cURL command
   * @returns {Object} Parsed components
   * @private
   */
  parseCurlString(curl) {
    const result = {
      url: '',
      method: 'GET',
      headers: {},
      body: undefined,
      queryParams: {},
    };

    // Extract URL
    const urlMatch = curl.match(/curl\s+['"]?([^'"\s]+)['"]?/i);
    if (urlMatch) {
      const fullUrl = urlMatch[1];
      const urlObj = this.parseUrl(fullUrl);
      result.url = urlObj.baseUrl;
      result.queryParams = urlObj.queryParams;
    }

    // Extract method (-X or --request)
    const methodMatch = curl.match(/(?:-X|--request)\s+['"]?(\w+)['"]?/i);
    if (methodMatch) {
      result.method = methodMatch[1].toUpperCase();
    }

    // Extract headers (-H or --header)
    const headerRegex = /(?:-H|--header)\s+['"]([^'"]+)['"]/gi;
    let headerMatch;
    while ((headerMatch = headerRegex.exec(curl)) !== null) {
      const [key, value] = headerMatch[1].split(':').map(s => s.trim());
      if (key && value) {
        result.headers[key] = value;
      }
    }

    // Extract body data (--data, --data-raw, --data-binary, -d)
    const dataMatch = curl.match(/(?:--data(?:-raw|-binary)?|-d)\s+['"](.+?)['"]/is);
    if (dataMatch) {
      try {
        // Try to parse as JSON
        result.body = JSON.parse(dataMatch[1]);
      } catch {
        // Keep as string if not JSON
        result.body = dataMatch[1];
      }
    }

    return result;
  }

  /**
   * Parse URL and extract query parameters
   * @param {string} url - Full URL with optional query string
   * @returns {Object} Object with baseUrl and queryParams
   * @private
   */
  parseUrl(url) {
    const [baseUrl, queryString] = url.split('?');
    const queryParams = {};

    if (queryString) {
      queryString.split('&').forEach(param => {
        const [key, value] = param.split('=');
        if (key) {
          queryParams[decodeURIComponent(key)] = value ? decodeURIComponent(value) : '';
        }
      });
    }

    return { baseUrl, queryParams };
  }

  /**
   * Convert structured command back to Playwright request options
   * @param {Object} command - Parsed curl command
   * @returns {Object} Playwright request configuration
   */
  toPlaywrightRequest(command) {
    const request = {
      method: command.method,
      headers: command.headers,
    };

    // Add query parameters to URL
    let url = command.url;
    if (Object.keys(command.queryParams || {}).length > 0) {
      const params = new URLSearchParams(command.queryParams);
      url += (url.includes('?') ? '&' : '?') + params.toString();
    }

    // Add body if present
    if (command.body) {
      if (typeof command.body === 'object') {
        request.data = command.body;
      } else {
        request.data = command.body;
      }
    }

    return { url, ...request };
  }
}

module.exports = { CurlParser };