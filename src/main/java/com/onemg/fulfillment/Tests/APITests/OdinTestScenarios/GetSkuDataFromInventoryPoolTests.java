package com.onemg.fulfillment.Tests.APITests.OdinTestScenarios;

import com.onemg.automation.enums.ConfigHandler;
import com.onemg.common.exception.RecordNotFoundException;
import com.onemg.fulfillment.Tests.Base;
import com.onemg.fulfillment.api.OdinAPIs.GetSkuDataFromInventoryPool;
import io.restassured.response.Response;
import org.testng.annotations.Test;

public class GetSkuDataFromInventoryPoolTests extends Base{
    @Test(description = "Verify that user should be able to get SKU data from inventory pool.", groups = {"Sanity"})
    public void C112954_checkInventoryAvailabilityFromInventorypool_TC001() throws Exception{

        String dbSkuDetailFromInventoryPoolQuery = "select sku_id, base_qty from inventory_pools where base_qty >= 10 and vendor_id="+ ConfigHandler.COMMON.get("odinVendorId")+" order by id desc limit 1;";
        String dbSkuIdFromInventoryPool = odinDs.executeSelectQuery(dbSkuDetailFromInventoryPoolQuery).getJSONObject(0).getString("sku_id");
        String dbSkuBaseQtyFromInventoryPool = odinDs.executeSelectQuery(dbSkuDetailFromInventoryPoolQuery).getJSONObject(0).getString("base_qty");
        String dbSkuDetailSkuIdFromSkusQuery = "select onemg_sku_id, pack_size, pack_form from skus where id in("+dbSkuIdFromInventoryPool+");";
        String dbOnemgSkuIdFromSkus = odinDs.executeSelectQuery(dbSkuDetailSkuIdFromSkusQuery).getJSONObject(0).getString("onemg_sku_id");
        String dbPackForm = odinDs.executeSelectQuery(dbSkuDetailSkuIdFromSkusQuery).getJSONObject(0).getString("pack_form");
        int dbPackSize = Integer.parseInt(odinDs.executeSelectQuery(dbSkuDetailSkuIdFromSkusQuery).getJSONObject(0).getString("pack_size"));
        /* Setting Onemg skuid in Common variable for the GET url */
        ConfigHandler.COMMON.put("onemg_sku_id_odin", dbOnemgSkuIdFromSkus);
        GetSkuDataFromInventoryPool getSkuDataFromInventoryPool= new GetSkuDataFromInventoryPool();
        Response response = getSkuDataFromInventoryPool.callAPI();
        String responseSKUQuantity = response.body().jsonPath().getString("data.quantity[0]");
        softAssert.assertEquals(200, response.getStatusCode(), "Failed: API failed with status code :"+response.getStatusCode(),
                "Validate API should return 200 status code");
        softAssert.assertEquals(response.body().jsonPath().getString("data.sku.onemg_sku_id[0]"), dbOnemgSkuIdFromSkus,"Validation Failed: Mismatch in Onemg SKU Id.","Validating If Onemg SKU Id present.");
        if (dbPackForm == null || dbPackForm.isEmpty())
        {
            throw new RecordNotFoundException("SKU Form is not available in the skus table!");
        }
        else if (dbPackForm.equals("strip"))
        {
            dbSkuBaseQtyFromInventoryPool = String.valueOf(Integer.parseInt(dbSkuBaseQtyFromInventoryPool) / (dbPackSize));
            softAssert.assertEquals(responseSKUQuantity, dbSkuBaseQtyFromInventoryPool, "Validation Failed: Mismatch in SKU Base Quantity.", "Validating Base Quantity of SKU.");
        }else
        {
            softAssert.assertEquals(responseSKUQuantity, dbSkuBaseQtyFromInventoryPool, "Validation Failed: Mismatch in SKU Base Quantity.", "Validating Base Quantity of SKU.");
        }
        softAssert.assertAll();
    }
}