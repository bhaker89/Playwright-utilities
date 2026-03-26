import { BasePage } from '../../../../pages/base.page';

class AddToCartFlowPage extends BasePage {
  constructor(page) {
    super(page);
    this.navigateToLandingPageButton = this.page.getByRole('button', { name: 'element' });
    this.searchForParacetamolButton = this.page.getByRole('button', { name: 'element' });
    this.firstSearchResultButton = this.page.getByRole('button', { name: 'first search result' });
    this.addToCartButton = this.page.getByRole('button', { name: 'element' });
  }

  async clickNavigateToLandingPageButton() {
    await this.click(this.navigateToLandingPageButton, 'Navigate to Landing Page');
  }

  async clickSearchForParacetamolButton() {
    await this.click(this.searchForParacetamolButton, 'Search for Paracetamol');
  }

  async clickFirstSearchResultButton() {
    await this.click(this.firstSearchResultButton, 'Click on the first search result');
  }

  async clickAddToCartButton() {
    await this.click(this.addToCartButton, 'Click Add to Cart button');
  }
}

export { AddToCartFlowPage };