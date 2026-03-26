import { test, expect } from '../../../../fixtures/base-test';
import { AddToCartFlowPage } from './pages/addtocartflowpage.page.js';

let addToCartFlowPage;

test.beforeEach(async ({ page }) => {
  addToCartFlowPage = new AddToCartFlowPage(page);
});

test('Add to Cart Flow', async () => {
  await addToCartFlowPage.navigateToLandingPage();
  await addToCartFlowPage.searchForProduct('Paracetamol');
  await addToCartFlowPage.clickOnFirstSearchResult();
  await addToCartFlowPage.clickAddToCartButton();
  await expect(addToCartFlowPage.getCartItem()).toContain('Paracetamol');
});