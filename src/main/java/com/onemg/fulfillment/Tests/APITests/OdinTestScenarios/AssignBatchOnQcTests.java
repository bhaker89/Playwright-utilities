package com.onemg.fulfillment.Tests.APITests.OdinTestScenarios;

import com.onemg.automation.enums.ConfigHandler;
import com.onemg.fulfillment.Payloads.OdinPayloads.AssignBatchOnQcPayload;
import com.onemg.fulfillment.Tests.Base;
import com.onemg.fulfillment.api.OdinAPIs.AssignBatchOnQc;
import io.restassured.response.Response;
import org.json.JSONException;
import org.testng.annotations.Test;
import org.testng.asserts.SoftAssert;

import java.sql.SQLException;

public class AssignBatchOnQcTests extends Base {

    //"Assign batch on quality check listing screen"
    public void AssignBatchOnQc(String salesOrderId) throws JSONException, SQLException {
        SoftAssert softAssert=new SoftAssert();
        String dbOrderSkuQtyQuery="select count(id) from sales_order_items soi group by sales_order_id having sales_order_id='"+salesOrderId+"';";
        String dbOrderSkuQty=odinDs.executeSelectQuery(dbOrderSkuQtyQuery).getJSONObject(0).getString("count");
        for(int orderItem=0;orderItem<Integer.parseInt(dbOrderSkuQty);orderItem++){
            String dbOrderDetailFromSalesOrderItemsQuery = "select id, sku_id, base_qty from sales_order_items where sales_order_id='"+salesOrderId+"' limit 1 offset "+orderItem+";";
            String dbIdFromSalesOrderItemId = odinDs.executeSelectQuery(dbOrderDetailFromSalesOrderItemsQuery).getJSONObject(0).getString("id");
            String dbSkuIdFromSalesOrderItemId = odinDs.executeSelectQuery(dbOrderDetailFromSalesOrderItemsQuery).getJSONObject(0).getString("sku_id");
            String dbQtyFromSalesOrderItems = odinDs.executeSelectQuery(dbOrderDetailFromSalesOrderItemsQuery).getJSONObject(0).getString("base_qty");
            String dbBatchDetailFromInventoriesQuery = "select batch_id from inventories where sku_id='"+dbSkuIdFromSalesOrderItemId+"' and base_qty>=10 order by updated_at desc limit 1;";
            String dbBatchIdFromInventories = odinDs.executeSelectQuery(dbBatchDetailFromInventoriesQuery).getJSONObject(0).getString("batch_id");
            String dbPickupUpdatedAtFromBatchesQuery = "Select updated_at from batches where id = "+ "'" + dbBatchIdFromInventories+"';";
            String dbPickupUpdatedAtFromBatches = odinDs.executeSelectQuery(dbPickupUpdatedAtFromBatchesQuery).getJSONObject(0).getString("updated_at");
            AssignBatchOnQc assignBatchOnQc = new AssignBatchOnQc(salesOrderId,dbIdFromSalesOrderItemId);
            assignBatchOnQc.setRequestBody(AssignBatchOnQcPayload.AssignBatchOnQcPayload(dbBatchIdFromInventories,dbPickupUpdatedAtFromBatches, dbQtyFromSalesOrderItems));
            Response response = assignBatchOnQc.callAPI();
            softAssert.assertEquals(response.getStatusCode(), 200, "Passed: API passed with status code : "+ response.getStatusCode() +":: " + response.getBody());
            String dbBatchVerify="select batch_id from inventories i where id in (select inventory_id from inventory_pickups ip WHERE sales_order_item_id ='"+dbIdFromSalesOrderItemId+"');";
            softAssert.assertEquals(dbBatchIdFromInventories, odinDs.executeSelectQuery(dbBatchVerify).getJSONObject(0).getString("batch_id"), "Correct Batch Id is saved in Db for SO_Item");
            softAssert.assertAll();
        }
    }

    //"Assign invalid batch on quality check listing screen"
    public void AssignInvalidBatchOnQc(String salesOrderId) throws JSONException, SQLException, InterruptedException {
        SoftAssert softAssert=new SoftAssert();
        String dbOrderDetailFromSalesOrderItemsQuery = "select id, sku_id, base_qty from sales_order_items where sales_order_id='"+salesOrderId+"';";
        String dbIdFromSalesOrderItemId = odinDs.executeSelectQuery(dbOrderDetailFromSalesOrderItemsQuery).getJSONObject(0).getString("id");
        String dbQtyFromSalesOrderItems = odinDs.executeSelectQuery(dbOrderDetailFromSalesOrderItemsQuery).getJSONObject(0).getString("base_qty");
        String invalidBatchId = ConfigHandler.COMMON.get("invalidBatchId");
        String dbPickupUpdatedAtFromBatchesQuery = "Select updated_at from batches order by id desc limit 1";
        String dbPickupUpdatedAtFromBatches = odinDs.executeSelectQuery(dbPickupUpdatedAtFromBatchesQuery).getJSONObject(0).getString("updated_at");
        AssignBatchOnQc assignBatchOnQc = new AssignBatchOnQc(salesOrderId,dbIdFromSalesOrderItemId);
        Thread.sleep(3000); //Applying this because there is locking mechanism on this api
        assignBatchOnQc.setRequestBody(AssignBatchOnQcPayload.AssignBatchOnQcPayload(invalidBatchId, dbPickupUpdatedAtFromBatches, dbQtyFromSalesOrderItems));
        Response response = assignBatchOnQc.callAPI();
        softAssert.assertEquals(response.getStatusCode(), 422, "Failed: API failed with status code : "+ response.getStatusCode() +":: " + response.getBody());
        softAssert.assertAll();
    }
}