/**
 * User Resolver
 * 
 * Resolves test user based on:
 * - Order type
 * - Corporate flag
 * - Environment
 * - User type
 * 
 * Resolution Priority:
 * 1. Explicit user override
 * 2. Order type-specific user
 * 3. Corporate user
 * 4. Environment-specific user
 * 5. Default test user
 * 
 * Usage:
 *   const user = await resolveUser({
 *     orderType: 'rx',
 *     isCorporate: false,
 *     environment: 'staging'
 *   });
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Resolve user for order
 * 
 * @param {Object} params - Resolution parameters
 * @param {string} params.orderType - Order type (rx, otc, mixed, b2b, corporate)
 * @param {string} params.userType - User type override
 * @param {boolean} params.isCorporate - Corporate flag
 * @param {string} params.environment - Environment name
 * @param {Object} params.userOverride - Explicit user object
 * @param {string} params.datasetPath - Custom dataset path
 * 
 * @returns {Promise<Object>} Resolved user
 */
async function resolveUser(params) {
  const {
    orderType,
    userType,
    isCorporate = false,
    environment = 'test',
    userOverride,
    datasetPath
  } = params;

  console.log(`[USER_RESOLVER] Resolving user for orderType="${orderType}", userType="${userType}", corporate=${isCorporate}`);

  // Priority 1: Explicit override
  if (userOverride) {
    console.log(`[USER_RESOLVER] Using user override`);
    return validateUser(userOverride);
  }

  // Load user dataset
  const userDataset = await loadUserDataset('default', datasetPath);

  // Priority 2: User type-specific user
  if (userType && userDataset.userTypes && userDataset.userTypes[userType]) {
    const user = userDataset.userTypes[userType];
    console.log(`[USER_RESOLVER] Using user type-specific user`);
    return validateUser(user);
  }

  // Priority 3: Corporate user
  if (isCorporate && userDataset.corporate) {
    console.log(`[USER_RESOLVER] Using corporate user`);
    return validateUser(userDataset.corporate);
  }

  // Priority 4: Order type-specific user
  if (orderType && userDataset.orderTypes && userDataset.orderTypes[orderType]) {
    const user = userDataset.orderTypes[orderType];
    console.log(`[USER_RESOLVER] Using order type-specific user`);
    return validateUser(user);
  }

  // Priority 5: Environment-specific user
  if (userDataset.environments && userDataset.environments[environment]) {
    const user = userDataset.environments[environment];
    console.log(`[USER_RESOLVER] Using environment-specific user`);
    return validateUser(user);
  }

  // Priority 6: Default user
  if (userDataset.default) {
    console.log(`[USER_RESOLVER] Using default user`);
    return validateUser(userDataset.default);
  }

  // Fallback: Generate test user
  const fallbackUser = {
    userId: `test_user_${Date.now()}`,
    email: `test${Date.now()}@example.com`,
    phone: '9999999999',
    name: 'Test User',
    type: orderType || 'test'
  };
  console.warn(`[USER_RESOLVER] No user found, using fallback`);
  return fallbackUser;
}

/**
 * Load user dataset
 * 
 * @param {string} type - User dataset type
 * @param {string} customPath - Custom dataset path
 * @returns {Promise<Object>} User dataset
 */
async function loadUserDataset(type, customPath) {
  const datasetFileName = `${type}.json`;
  
  // Try custom path first (child repo override)
  if (customPath) {
    const customFilePath = path.join(customPath, 'users', datasetFileName);
    try {
      const content = await fs.readFile(customFilePath, 'utf8');
      console.log(`[USER_RESOLVER] Loaded user dataset from custom path: ${customFilePath}`);
      return JSON.parse(content);
    } catch (error) {
      console.log(`[USER_RESOLVER] Custom dataset not found: ${customFilePath}`);
    }
  }

  // Try core dataset
  const coreDatasetPath = path.join(__dirname, '../../datasets/users', datasetFileName);
  try {
    const content = await fs.readFile(coreDatasetPath, 'utf8');
    console.log(`[USER_RESOLVER] Loaded user dataset from core: ${coreDatasetPath}`);
    return JSON.parse(content);
  } catch (error) {
    console.warn(`[USER_RESOLVER] Core dataset not found: ${coreDatasetPath}`);
    return {};
  }
}

/**
 * Validate user object
 * 
 * @param {Object} user - User object to validate
 * @returns {Object} Validated user object
 */
function validateUser(user) {
  if (!user || typeof user !== 'object') {
    throw new Error('Invalid user object');
  }

  // Ensure required fields
  return {
    userId: user.userId || user.id || `user_${Date.now()}`,
    email: user.email || `test@example.com`,
    phone: user.phone || user.mobile || '9999999999',
    name: user.name || 'Test User',
    type: user.type || 'test',
    ...user // Preserve any additional fields
  };
}

/**
 * Get user credentials
 * 
 * @param {Object} user - User object
 * @returns {Object} User credentials
 */
function getUserCredentials(user) {
  return {
    email: user.email,
    phone: user.phone,
    password: user.password || 'Test@123',
    otp: user.otp || '123456'
  };
}

module.exports = {
  resolveUser,
  loadUserDataset,
  validateUser,
  getUserCredentials
};