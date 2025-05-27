package com.onemg.fulfillment.Tests.APITests.OdinTestScenarios;

import com.onemg.automation.enums.ConfigHandler;
import com.onemg.automation.global.Constants;
import com.onemg.automation.util.misc.CSVReader;
import com.onemg.fulfillment.Payloads.OdinPayloads.CreateOdinSupplierPayload;
import com.onemg.fulfillment.Tests.Base;
import com.onemg.fulfillment.api.OdinAPIs.CreateOdinSupplier;
import io.restassured.response.Response;
import org.json.JSONException;
import org.testng.annotations.Test;

import java.util.ArrayList;
import java.util.Collections;

public class OdinSupplierTests extends Base {
    private final String directSupplyType = "direct";
    private final String indirectSupplyType = "indirect";
    private final String pharmaStockType = "pharma";
    private final String nonPharmaStockType = "non_pharma";

    public void createSupplierSkuMappingCSV() {
        String[] header = {"SKU ID", "Supplier SKU ID", "Margin"};
        ArrayList<String[]> data = new ArrayList<>();
        ArrayList<String> skus = new ArrayList<>();
        String[] skusList = ConfigHandler.COMMON.get("skusList").split(Constants.REGEX_SPLIT_WITH_COMMA);
        Collections.addAll(skus, skusList);
        for (String skuId : skus) {
            String[] skuDataRow = {skuId, "A" + skuId, "10"};
            data.add(skuDataRow);
        }

        CSVReader.writeDataLineByLine(System.getProperty("user.dir") + "/src/main/resources/supplierSkuMapper.csv", header, data);
    }

    @Test(description = "Verify that user should be able to create New Direct Odin Supplier.", groups = {"Sanity", "Regression", "Odin", "NewDataGenerate"})
    /* Running test for creating Supplier of type Direct */
    public void C112965_createOdinSupplier_TC001() throws JSONException {
        createSupplierSkuMappingCSV();
        CreateOdinSupplier createOdinSupplier = new CreateOdinSupplier(); /* Add Create Odin Supplier API Object */
        CreateOdinSupplierPayload directOdinSupplier = new CreateOdinSupplierPayload(); /* Add  Create Odin Supplier API Payload Object*/
        createOdinSupplier.setRequestBody(directOdinSupplier.createNewOdinSupplier(directSupplyType, pharmaStockType, "credit", true, "delivery"));
        String expectedOdinSupplierName = directOdinSupplier.randomSupplierName;
        Response response = createOdinSupplier.callAPI();
        String actualOdinSupplierName = response.getBody().jsonPath().getString("data.name"); // getting user name from response for assertion value from response
        String actualOdinSupplierType = response.getBody().jsonPath().getString("data.supply_type"); // getting user name from response for assertion value from response
        String actualOdinSupplierStock = response.getBody().jsonPath().getString("data.stock_type"); // getting user name from response for assertion value from response
        softAssert.assertEquals(response.getStatusCode(), 200, "Failed: API failed with status code : " + response.getStatusCode() + ":: " + response.getBody());
        softAssert.assertEquals(expectedOdinSupplierName, actualOdinSupplierName, "Supplier names doesn't match :: " + " Supplier name: " + actualOdinSupplierName + " !!! ");
        softAssert.assertEquals(actualOdinSupplierType, directSupplyType, "Supplier tyoe doesn't match :: " + " Supplier Type: " + actualOdinSupplierType + " !!! ");
        softAssert.assertEquals(actualOdinSupplierStock, pharmaStockType, "Supplier names doesn't match :: " + " Stock type: " + actualOdinSupplierStock + " !!! ");
        softAssert.assertAll();
    }

    @Test(description = "Verify that user should be able to create New Indirect Odin Supplier.", groups = {"Sanity", "Regression", "Odin", "NewDataGenerate"})
    /* Running test for creating Supplier of type Indirect */
    public void C112966_createOdinSupplier_TC002() throws JSONException {
        CreateOdinSupplier createOdinSupplier = new CreateOdinSupplier(); /* Add Create Odin Supplier API Object */
        CreateOdinSupplierPayload directOdinSupplier = new CreateOdinSupplierPayload(); /* Add  Create Odin Supplier API Payload Object*/
        createOdinSupplier.setRequestBody(directOdinSupplier.createNewOdinSupplier(indirectSupplyType, nonPharmaStockType, "cash", false, "invoice"));
        String expectedOdinSupplierName = directOdinSupplier.randomSupplierName;
        Response response = createOdinSupplier.callAPI();
        String actualOdinSupplierName = response.getBody().jsonPath().getString("data.name"); // getting user name from response for assertion value from response
        String actualOdinSupplierType = response.getBody().jsonPath().getString("data.supply_type"); // getting user name from response for assertion value from response
        String actualOdinSupplierStock = response.getBody().jsonPath().getString("data.stock_type"); // getting user name from response for assertion value from response
        softAssert.assertEquals(response.getStatusCode(), 200, "Failed: API failed with status code : " + response.getStatusCode() + ":: " + response.getBody());
        softAssert.assertEquals(expectedOdinSupplierName, actualOdinSupplierName, "Supplier names doesn't match :: " + " Supplier name: " + actualOdinSupplierName + " !!! ");
        softAssert.assertEquals(actualOdinSupplierType, indirectSupplyType, "Supplier tyoe doesn't match :: " + " Supplier Type: " + actualOdinSupplierType + " !!! ");
        softAssert.assertEquals(actualOdinSupplierStock, nonPharmaStockType, "Supplier names doesn't match :: " + " Stock type: " + actualOdinSupplierStock + " !!! ");
        softAssert.assertAll();
    }
}