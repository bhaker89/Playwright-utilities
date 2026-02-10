const faker = require('faker');

/**
 * Test Data Factory for generating realistic test data
 */
class DataFactory {
  /**
   * Generate user data
   * @returns {Object}
   */
  static generateUser() {
    return {
      firstName: faker.name.firstName(),
      lastName: faker.name.lastName(),
      email: faker.internet.email(),
      phone: faker.phone.phoneNumber(),
      address: {
        street: faker.address.streetAddress(),
        city: faker.address.city(),
        state: faker.address.state(),
        zipCode: faker.address.zipCode(),
        country: faker.address.country(),
      },
      dateOfBirth: faker.date.past(30),
    };
  }

  /**
   * Generate product data
   * @returns {Object}
   */
  static generateProduct() {
    return {
      name: faker.commerce.productName(),
      description: faker.commerce.productDescription(),
      price: parseFloat(faker.commerce.price()),
      category: faker.commerce.department(),
      sku: faker.random.alphaNumeric(10).toUpperCase(),
      inStock: faker.datatype.boolean(),
      quantity: faker.datatype.number({ min: 0, max: 1000 }),
    };
  }

  /**
   * Generate order data
   * @returns {Object}
   */
  static generateOrder() {
    return {
      orderId: faker.datatype.uuid(),
      orderDate: faker.date.recent(),
      status: faker.random.arrayElement(['pending', 'processing', 'shipped', 'delivered']),
      total: parseFloat(faker.commerce.price(10, 500)),
      items: Array.from({ length: faker.datatype.number({ min: 1, max: 5 }) }, () =>
        this.generateProduct()
      ),
    };
  }

  /**
   * Generate company data
   * @returns {Object}
   */
  static generateCompany() {
    return {
      name: faker.company.companyName(),
      catchPhrase: faker.company.catchPhrase(),
      industry: faker.company.bs(),
      website: faker.internet.url(),
      email: faker.internet.email(),
      phone: faker.phone.phoneNumber(),
    };
  }

  /**
   * Generate credit card data (for testing only)
   * @returns {Object}
   */
  static generateCreditCard() {
    return {
      number: faker.finance.creditCardNumber(),
      cvv: faker.finance.creditCardCVV(),
      expiry: `${faker.datatype.number({ min: 1, max: 12 })}/${faker.datatype.number({ min: 24, max: 30 })}`,
      holderName: faker.name.findName(),
    };
  }
}

module.exports = { DataFactory };