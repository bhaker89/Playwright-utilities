package com.onemg.fulfillment.Tests.APITests.OdinTestScenarios;

import com.onemg.automation.app.ActionHelper;
import com.onemg.automation.enums.ConfigHandler;
import com.onemg.fulfillment.Payloads.OdinPayloads.AdjustInventoryOnInventoryMasterPayload;
import com.onemg.fulfillment.api.OdinAPIs.AdjustInventoryOnInventoryMaster;
import org.json.JSONException;
import org.testng.annotations.Test;
import com.onemg.fulfillment.Tests.Base;
import io.restassured.response.Response;
import java.sql.SQLException;

public class AdjustInventoryOnInventoryMasterTests extends Base {
    @Test(description = "Verify that user should be able to add inventory from inventory master screen.", groups={"Sanity","Regression","Odin"})
    public void C112924_adjustInventoryOnInventoryMasterTests_TC001() throws JSONException, SQLException{
        String dbInventoryDetailFromInventoriesQuery = "SELECT inventories.sku_id, inventories.batch_id, inventories.location_id FROM inventories " +
                "INNER JOIN locations ON inventories.location_id = locations.id " +
                "JOIN batches ON batches.id = inventories.batch_id WHERE locations.category='picking' and inventories.vendor_id= "+ ConfigHandler.COMMON.get("odinVendorId") +
                "and inventories.location_id is not null and batches.is_expired is false order by inventories.updated_at desc limit 1;";
        String dbSkuIdFromInventories = odinDs.executeSelectQuery(dbInventoryDetailFromInventoriesQuery).getJSONObject(0).getString("sku_id");
        String dbBatchIdFromInventories = odinDs.executeSelectQuery(dbInventoryDetailFromInventoriesQuery).getJSONObject(0).getString("batch_id");
        String dbLocationIdFromInventories = odinDs.executeSelectQuery(dbInventoryDetailFromInventoriesQuery).getJSONObject(0).getString("location_id");

        String dbSkuDetailFromSkusQuery = "select onemg_sku_id, name from skus where id="+dbSkuIdFromInventories+";";
        String dbOnemgSkuIdFromSkus = odinDs.executeSelectQuery(dbSkuDetailFromSkusQuery).getJSONObject(0).getString("onemg_sku_id");
        String dbSkuNameFromSkus = odinDs.executeSelectQuery(dbSkuDetailFromSkusQuery).getJSONObject(0).getString("name");

        String dbBatchDetailFromBatchQuery = "select name from batches where id='"+dbBatchIdFromInventories+"' order by id desc limit 1;";
        String dbBatchNameFromBatches = odinDs.executeSelectQuery(dbBatchDetailFromBatchQuery).getJSONObject(0).getString("name");
        String dbLocationDetailFromLocationQuery = "select name from locations where id='"+dbLocationIdFromInventories+"';";
        String dbLocationNameFromLocation = odinDs.executeSelectQuery(dbLocationDetailFromLocationQuery).getJSONObject(0).getString("name");

        AdjustInventoryOnInventoryMaster adjustInventoryOnInventoryMaster = new AdjustInventoryOnInventoryMaster();
        AdjustInventoryOnInventoryMasterPayload payload = new AdjustInventoryOnInventoryMasterPayload();
        String requestBody = payload.PositiveAdjustInventoryPayload(Integer.valueOf(dbSkuIdFromInventories),dbOnemgSkuIdFromSkus,dbSkuNameFromSkus,dbBatchNameFromBatches,dbLocationNameFromLocation);
        adjustInventoryOnInventoryMaster.setRequestBody(requestBody);
        Response response = adjustInventoryOnInventoryMaster.callAPI();
        softAssert.assertEquals(response.getStatusCode(), 200, "Failed: API failed with status code : "+ response.getStatusCode() +":: " + response.getBody());
        softAssert.assertAll();
    }

    @Test(description = "Verify that user should be able to subtract inventory from inventory master screen.", groups={"Sanity","Regression","Odin"})
    public void C112924_adjustInventoryOnInventoryMasterTests_TC002() throws JSONException, SQLException, InterruptedException {
        String dbInventoryDetailFromInventoriesQuery = "SELECT inventories.sku_id, inventories.batch_id, inventories.location_id FROM inventories " +
                "INNER JOIN locations ON inventories.location_id = locations.id " +
                "JOIN batches on batches.id=inventories.batch_id WHERE locations.category='picking' and inventories.vendor_id= "+ ConfigHandler.COMMON.get("odinVendorId") +
                " and inventories.location_id is not null and inventories.base_qty >100 and batches.is_expired is false order by inventories.updated_at desc limit 1 offset 3;";
        String dbSkuIdFromInventories = odinDs.executeSelectQuery(dbInventoryDetailFromInventoriesQuery).getJSONObject(0).getString("sku_id");
        String dbBatchIdFromInventories = odinDs.executeSelectQuery(dbInventoryDetailFromInventoriesQuery).getJSONObject(0).getString("batch_id");
        String dbLocationIdFromInventories = odinDs.executeSelectQuery(dbInventoryDetailFromInventoriesQuery).getJSONObject(0).getString("location_id");
        String dbSkuDetailFromSkusQuery = "select onemg_sku_id, name from skus where id="+dbSkuIdFromInventories+";";
        String dbOnemgSkuIdFromSkus = odinDs.executeSelectQuery(dbSkuDetailFromSkusQuery).getJSONObject(0).getString("onemg_sku_id");
        String dbSkuNameFromSkus = odinDs.executeSelectQuery(dbSkuDetailFromSkusQuery).getJSONObject(0).getString("name");
        String dbBatchDetailFromBatchQuery = "select name from batches where id='"+dbBatchIdFromInventories+"' order by id desc limit 1;";
        String dbBatchNameFromBatches = odinDs.executeSelectQuery(dbBatchDetailFromBatchQuery).getJSONObject(0).getString("name");
        String dbLocationDetailFromLocationQuery = "select name from locations where id='"+dbLocationIdFromInventories+"';";
        String dbLocationNameFromLocation = odinDs.executeSelectQuery(dbLocationDetailFromLocationQuery).getJSONObject(0).getString("name");

        AdjustInventoryOnInventoryMaster adjustInventoryOnInventoryMaster = new AdjustInventoryOnInventoryMaster();
        AdjustInventoryOnInventoryMasterPayload payload = new AdjustInventoryOnInventoryMasterPayload();
        String requestBody = payload.NegativeAdjustInventoryPayload(Integer.valueOf(dbSkuIdFromInventories),dbOnemgSkuIdFromSkus,dbSkuNameFromSkus,dbBatchNameFromBatches,dbLocationNameFromLocation);
        adjustInventoryOnInventoryMaster.setRequestBody(requestBody);
        Response response = adjustInventoryOnInventoryMaster.callAPI();
        softAssert.assertEquals(response.getStatusCode(), 200, "Failed: API failed with status code : "+ response.getStatusCode() +":: " + response.getBody());
        softAssert.assertAll();
    }
}
