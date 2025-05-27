package com.onemg.fulfillment.Tests.APITests.OdinTestScenarios;

import com.onemg.automation.enums.ConfigHandler;
import com.onemg.common.dataprovider.user.UserContext;
import com.onemg.common.dataprovider.user.UserContextManager;
import com.onemg.common.functions.fulfillment.InventoryFunctions;
import com.onemg.common.functions.fulfillment.OFOdinIntegration;
import com.onemg.common.functions.orderplacement.CreateOrder;
import com.onemg.common.models.common.CreateOrderResponse;
import com.onemg.fulfillment.Payloads.OdinPayloads.AdjustInventoryOnInventoryMasterPayload;
import com.onemg.fulfillment.Payloads.OdinPayloads.AssignOrdersForPickingPayload;
import com.onemg.fulfillment.Payloads.OdinPayloads.MoveSoToQCPayload;
import com.onemg.fulfillment.Payloads.OdinPayloads.StartQualityCheckPayload;
import com.onemg.fulfillment.Payloads.OdinPayloads.*;
import com.onemg.fulfillment.Tests.Base;
import com.onemg.fulfillment.api.OdinAPIs.AdjustInventoryOnInventoryMaster;
import com.onemg.fulfillment.api.OdinAPIs.AssignOrdersForPicking;
import com.onemg.fulfillment.api.OdinAPIs.MoveSoToQC;
import com.onemg.fulfillment.api.OdinAPIs.StartQualityCheck;
import com.onemg.fulfillment.api.OdinAPIs.MoveOrderFromQcToPacking;
import io.restassured.response.Response;
import org.json.JSONException;
import org.testng.annotations.Test;
import java.io.IOException;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

public class OrderProcessingTest extends Base {
    public UserContext opsUserContext;
    List<String> skuList = new ArrayList<>();
    List<String> skuQty = new ArrayList<>();
    CreateOrder createOrder;
    String odinSalesOrderId,ofOrderId;
    Response response;
    Response resp;
    AdjustInventoryOnInventoryMaster adjustInventoryOnInventoryMaster;

    String onemgSkuId="685124",odinSkuId;
    public void increaseOdinInventory() throws SQLException, JSONException {
        adjustInventoryOnInventoryMaster=new AdjustInventoryOnInventoryMaster();
        String odinSkuIdDbQuery="select id from skus where onemg_sku_id='"+onemgSkuId+"';";
        odinSkuId = odinDs.executeSelectQuery(odinSkuIdDbQuery).getJSONObject(0).getString( "id");
        String batchLocationIdQuery="select batch_id,location_id from inventories i where sku_id="+odinSkuId+" and vendor_id =9 limit 1;";
        String locationId=odinDs.executeSelectQuery(batchLocationIdQuery).getJSONObject(0).getString( "location_id");
        String batchId=odinDs.executeSelectQuery(batchLocationIdQuery).getJSONObject(0).getString( "batch_id");
        String odinSkuBatchQuery="select name from batches where id="+batchId+";";
        String odinSKULocationQuery="select name from locations where id="+locationId+";";
        String odinSkuBatch=odinDs.executeSelectQuery(odinSkuBatchQuery).getJSONObject(0).getString( "name");
        String odinSkuLocation=odinDs.executeSelectQuery(odinSKULocationQuery).getJSONObject(0).getString( "name");
        String requestBody = AdjustInventoryOnInventoryMasterPayload.PositiveAdjustInventoryPayload(Integer.valueOf(odinSkuId),onemgSkuId,"",odinSkuBatch,odinSkuLocation);
        adjustInventoryOnInventoryMaster.setRequestBody(requestBody);
        adjustInventoryOnInventoryMaster.callAPI();
    }

    /**
     *This function moves the order from Picking State to Shipping stage, performing Quality Checks, Assigning Batch, Generating Invoices and Shipping Label
     */
    public void moveOrderFromPickingToShipped() throws JSONException, SQLException, InterruptedException {
        GeneratePickListForOrderTests generatePickListForOrderTests = new GeneratePickListForOrderTests();
        MoveSoToQCTests moveSoToQCTests= new MoveSoToQCTests();
        StartQualityCheckTests qualityCheckTests=new StartQualityCheckTests();
        AssignBatchOnQcTests assignBatchOnQcTests=new AssignBatchOnQcTests();
        generatePickListForOrderTests.AssignSalesOrderforPicking(ofOrderId);
        odinSalesOrderId= generatePickListForOrderTests.GenerateNewPicklistForSO(ofOrderId);

        /* Checking negative cases which need to be executed before moving the order to QC. */
        generatePickListForOrderTests.GeneratePicklistWhenPickerIsAlreadyWorkingOnSO(odinSalesOrderId);
        generatePickListForOrderTests.GeneratePicklistWhenSOWithOtherPicker(odinSalesOrderId);

        moveSoToQCTests.moveSalesOrderToQC(odinSalesOrderId);
        qualityCheckTests.startQualityCheck(odinSalesOrderId);
        assignBatchOnQcTests.AssignBatchOnQc(odinSalesOrderId);
        //Checking negative cases which need to be executed before generating invoice
        // assignBatchOnQcTests.AssignInvalidBatchOnQc(odinSalesOrderId);
        // Commenting as bug is raised and will be fixed by dev team

        Response generateInvoiceResponse= OFOdinIntegration.generateInvoice(odinSalesOrderId);
        softAssert.assertEquals(200,generateInvoiceResponse.getStatusCode(),"Invoice Generation Failed","Validating If Invoice got generated successfully");
        Response generateShippingLabelResponse= OFOdinIntegration.generateShippingLabel(odinSalesOrderId);
        softAssert.assertEquals(200,generateShippingLabelResponse.getStatusCode(),"Shipping Label Generation Failed","Validating If Shipping Label got generated successfully");
        String dbLockIdFromSalesOrderQuery = "select resource_lock_id from sales_orders where id='"+odinSalesOrderId+"' order by updated_at desc limit 1;";
        String dbLockIdFromSalesOrder = odinDs.executeSelectQuery(dbLockIdFromSalesOrderQuery).getJSONObject(0).getString("resource_lock_id");
        Response moveSoToPackingStatusResponse = OFOdinIntegration.moveOrderFromQcToPacking(ofOrderId,dbLockIdFromSalesOrder );
        softAssert.assertEquals(200,moveSoToPackingStatusResponse.getStatusCode(),"Sales Order not moved to Packing Status",
                "Validating If SalesOrder is moved to Shipping status successfully");
        Response moveSoToShippingResponse = OFOdinIntegration.moveOdinSalesOrderToShippingState(ofOrderId);
        softAssert.assertEquals(200,moveSoToShippingResponse.getStatusCode(),"Sales Order not moved to Shipping Status",
                "Validating If SalesOrder is moved to Shipping status successfully");
        Response moveSoToShippedResponse = OFOdinIntegration.moveOdinSalesOrderToShippedStatusFromShippingStatus(ofOrderId);
        softAssert.assertEquals(200,moveSoToShippedResponse.getStatusCode(),"Sales Order not moved to Shipped Status",
                "Validating If SalesOrder is moved to Shipped status successfully");
        softAssert.assertAll();
    }
    @Test(priority = 1,description = "Validating a successful order processing till invoice generation", groups={"Sanity","Regression","Odin","NewDataGenerate"})
    public void C112484_orderProcessing_TC001() throws JSONException, SQLException, IOException, InterruptedException {
        createOrder = new CreateOrder();
        increaseOdinInventory();
        skuList.add(onemgSkuId);
        skuQty.add("1");
        opsUserContext = UserContextManager.getOpsUser();
        InventoryFunctions.createUpdateInventory(onemgSkuId, "3", 29.5, 10, "yes", true, false, 1);
        CreateOrderResponse res= createOrder.createPharmacyOrderUsingSkuIdList(opsUserContext.getUserDTO(),skuList,null,skuQty,null);
        ofOrderId=res.getOrderId();
        String removeLockQuery="update resource_locks set status ='inactive' where user_id=1225 and status ='active'";
        odinDs.executeUpdate(removeLockQuery);
        Thread.sleep(2000);
        String removeJobLockQuery="update jobs set status ='inactive' where assignee_id =1225 and status ='active'";
        odinDs.executeUpdate(removeJobLockQuery);
        Thread.sleep(2000);
        moveOrderFromPickingToShipped();
    }
    @Test(priority = 2,description = "Verify that error should come when user tries to move order with invalid status to QC.", groups={"Sanity","Regression","Odin"})
    public void C112970_MoveInvalidSalesOrderToQC_TC002() throws JSONException {
        MoveSoToQC moveSoToQC=new MoveSoToQC();
        moveSoToQC.setRequestBody(MoveSoToQCPayload.moveSoToQCPayload(odinSalesOrderId));
        response = moveSoToQC.callAPI();
        softAssert.assertEquals(response.getStatusCode(), 400, "Failed: API failed with status code : "+ response.getStatusCode());
        softAssert.assertAll();
    }
    @Test(priority = 3,description = "Verify that error should come when user tries to move Order in Picking State.", groups={"Sanity","Regression","Odin"})
    public void C112971_AssignInvalidSalesOrderforPicking_TC003() throws JSONException, SQLException {
        AssignOrdersForPicking AssignPurchaseOrder = new AssignOrdersForPicking();
        String dbOrderDetailFromSalesOrdersQuery = "select source_order_id from sales_orders where vendor_id='9'and status !='picking' order by id desc limit 1;";
        String dbOrderId = odinDs.executeSelectQuery(dbOrderDetailFromSalesOrdersQuery).getJSONObject(0).getString("source_order_id");
        AssignPurchaseOrder.setRequestBody(AssignOrdersForPickingPayload.AssignOrdersForPickingPayload(dbOrderId));
        response = AssignPurchaseOrder.callAPI();
        softAssert.assertEquals(response.getStatusCode(), 400, "Invalid Orders:" + response.getStatusCode());
        softAssert.assertAll();
    }

    @Test(priority = 4,description = "Verify that error should come when user tries to move Order which is not in QC state", groups={"Sanity","Regression","Odin"})
    public void C112972_startQcOfInvvalidOrder_TC004() throws JSONException, SQLException {
        String dbOrderDetailFromSalesOrdersQuery = "select id from sales_orders where vendor_id='9'and status='picking' order by id desc limit 1;";
        String dbSkuIdFromSalesOrders = odinDs.executeSelectQuery(dbOrderDetailFromSalesOrdersQuery).getJSONObject(0).getString("id");
        ConfigHandler.COMMON.put("OrderId", dbSkuIdFromSalesOrders);
        StartQualityCheck startQualityCheck = new StartQualityCheck(dbSkuIdFromSalesOrders);
        StartQualityCheckPayload payload = new StartQualityCheckPayload();
        String requestBody = payload.StartQualityCheckPayload();
        startQualityCheck.setRequestBody(requestBody);
        Response response = startQualityCheck.callAPI();
        softAssert.assertEquals(response.getStatusCode(), 400, "Failed: API failed with status code : "+ response.getStatusCode() +":: " + response.getBody());
        softAssert.assertAll();
    }

    @Test(priority = 5, description = "Verify that error should be raised when order is moved to shipping state when order is not in packing status.", groups={"Sanity", "Regression", "Odin"})
    public void C116707_moveInvalidOrderStatusToShippingStatus_TC005() throws SQLException, JSONException {
        String dbSourceOrderIdQuery = "select * from sales_orders where vendor_id = " + ConfigHandler.COMMON.get("odinVendorId") + " and status !='packing' and source = '1MG' order by id desc limit 1;";
        String dbSalesOrderId = odinDs.executeSelectQuery(dbSourceOrderIdQuery).getJSONObject(0).getString("id");
        String dbSourceOrderId = odinDs.executeSelectQuery(dbSourceOrderIdQuery).getJSONObject(0).getString("source_order_id");
        if (dbSourceOrderId != null){
            Response shippingAPIResponse = OFOdinIntegration.moveOdinSalesOrderToShippingState(dbSourceOrderId);
            softAssert.assertEquals(400,shippingAPIResponse.getStatusCode(),"Sales Order moved to Shipping Status",
                    "Validating If SalesOrder whose status is not in packing status is moved to Shipping status");
            String actualErrorMessage = shippingAPIResponse.jsonPath().getString("errors[0].message");
            softAssert.assertEquals(actualErrorMessage,"Invalid order ids "+dbSalesOrderId , "Error Message Mismatch", "Validating error message!!!");
            softAssert.assertAll();
        }
        else {
            throw new NullPointerException("dbSourceOrderId is null, but it was not expected to be.");
        }
    }

    @Test(priority = 6, description = "Verify that error should be raised when order is moved to scanned for shipping state when order is not in shipping status.", groups={"Sanity", "Regression", "Odin"})
    public void C116708_moveInvalidOrderStatusToScannedForShippingStatus_TC006() throws SQLException, JSONException {
        String dbSourceOrderIdQuery = "select source_order_id,status from sales_orders where vendor_id = " + ConfigHandler.COMMON.get("odinVendorId")
                + " and status not in ('shipping') and source = '1MG' order by id desc limit 1;";
        String dbSourceOrderId = odinDs.executeSelectQuery(dbSourceOrderIdQuery).getJSONObject(0).getString("source_order_id");
        String dbSourceOrderIdStatus = odinDs.executeSelectQuery(dbSourceOrderIdQuery).getJSONObject(0).getString("status");
        if (dbSourceOrderId != null){
            Response scannedForShippedAPIResponse = OFOdinIntegration.moveOdinSalesOrderToScannedForShippingState(dbSourceOrderId);
            softAssert.assertEquals(400,scannedForShippedAPIResponse.getStatusCode(),
                    "Validating If SalesOrder whose status is not in shipping,scanned for shipping status is moved to Shipping status");
            String actualErrorMessage = scannedForShippedAPIResponse.jsonPath().getString("errors[0].message");
            softAssert.assertEquals(actualErrorMessage,"Order Id - "+ dbSourceOrderId + " is not in shipping state. It is in "+dbSourceOrderIdStatus+" state.",
                    "Validating If SalesOrder whose status is not in shipping status, is moved to Scanned to shipping status");
            softAssert.assertAll();
        }
        else {
            throw new NullPointerException("dbSourceOrderId is null, but it was not expected to be.");
        }
    }
    @Test(priority = 7, description = "Verify that error should be raised when order is moved to shipped state when order is not in scanned for shipping status.", groups={"Sanity", "Regression", "Odin"})
    public void C116709_moveInvalidOrderStatusToShippedStatus_TC007() throws SQLException, JSONException {
        String dbSourceOrderIdQuery = "select source_order_id, status from sales_orders where vendor_id = " + ConfigHandler.COMMON.get("odinVendorId")+
                " and status not in ( 'scanned_for_shipping') and source = '1MG' order by id desc limit 1;";
        String dbSourceOrderId = odinDs.executeSelectQuery(dbSourceOrderIdQuery).getJSONObject(0).getString("source_order_id");
        String dbSourceOrderIdStatus = odinDs.executeSelectQuery(dbSourceOrderIdQuery).getJSONObject(0).getString("status");
        if (dbSourceOrderId != null){
            Response shippedAPIResponse = OFOdinIntegration.moveOdinSalesOrderToShippedState(dbSourceOrderId);
            softAssert.assertEquals(400,shippedAPIResponse.getStatusCode(),
                    "Validating If SalesOrder whose status is not in shipping,scanned for shipping status is moved to Shipping status");
            String actualErrorMessage = shippedAPIResponse.jsonPath().getString("errors[0].message");
            softAssert.assertEquals(actualErrorMessage,"Order Id - "+dbSourceOrderId+" has not been scanned for shipping. It is in "+dbSourceOrderIdStatus+" state.",
                    "Validating If SalesOrder whose status is not in shipping status, is moved to Scanned to shipping status");
            softAssert.assertAll();
        }
        else {
            throw new NullPointerException("dbSourceOrderId is null, but it was not expected to be.");
        }
    }

    @Test(priority = 8,description = "Verify that error should come when user tries to move order to packing which is not in QC state", groups={"Sanity","Regression","Odin"})
    public void C116310_MoveInvalidSalesOrderToPacking_TC008() throws JSONException, SQLException {
        String dbResourceLockIdFrom = "select id from resource_locks where vendor_id='" + ConfigHandler.COMMON.get("odinVendorId") +
                "' and resource_type='sales_order' and user_id='" + ConfigHandler.COMMON.get("odinUserId") + "' and status='expired' order by id desc limit 1;";
        String dbLockId = odinDs.executeSelectQuery(dbResourceLockIdFrom).getJSONObject(0).getString("id");
        String dbOrderDetailFromSalesOrdersQuery = "select source_order_id from sales_orders where vendor_id='9'and status !='quality_check' order by id desc limit 1;";
        String dbSourceOrderId = odinDs.executeSelectQuery(dbOrderDetailFromSalesOrdersQuery).getJSONObject(0).getString("source_order_id");
        Response moveToPackingAPIResponse = OFOdinIntegration.moveOrderFromQcToPacking(dbSourceOrderId,dbLockId);
        softAssert.assertEquals(400,moveToPackingAPIResponse.getStatusCode(),
                "Validating If SalesOrder whose status is not in QC status is moved to Packing status");
        String actualErrorMessage = moveToPackingAPIResponse.jsonPath().getString("errors[0].message");
        softAssert.assertEquals(actualErrorMessage,"Sales Order not in quality check state",
                "Validating If SalesOrder whose status is not in quality check status, is moved to Packing status");
        softAssert.assertAll();
    }
}