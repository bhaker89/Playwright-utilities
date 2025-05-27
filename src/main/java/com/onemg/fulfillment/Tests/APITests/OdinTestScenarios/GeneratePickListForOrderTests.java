package com.onemg.fulfillment.Tests.APITests.OdinTestScenarios;

import com.onemg.automation.assertions.CustomSoftAssert;
import com.onemg.fulfillment.Payloads.OdinPayloads.AssignOrdersForPickingPayload;
import com.onemg.fulfillment.Payloads.OdinMaterialManagementPayloads.GeneratePickListPayloads;
import com.onemg.fulfillment.api.OdinAPIs.AssignOrdersForPicking;
import com.onemg.fulfillment.api.OdinAPIs.GeneratePickList;
import io.restassured.response.Response;
import org.json.JSONException;
import org.testng.annotations.Test;
import com.onemg.fulfillment.Tests.Base;

import java.sql.SQLException;
public class GeneratePickListForOrderTests extends Base {
    Response response;

    // When source Order ID is in Picking state
    public void AssignSalesOrderforPicking(String sourceOrderId) throws JSONException {
        AssignOrdersForPicking AssignSalesOrder = new AssignOrdersForPicking();
        AssignOrdersForPickingPayload AssignPayload = new AssignOrdersForPickingPayload();
        AssignSalesOrder.setRequestBody(AssignPayload.AssignOrdersForPickingPayload(sourceOrderId));
        response = AssignSalesOrder.callAPI();
        softAssert=new CustomSoftAssert();
        softAssert.assertEquals(response.getStatusCode(), 200, "Passed " + response.getStatusCode());
        softAssert.assertAll();
    }

    // when Sales Order ID in Picking State
    public String GenerateNewPicklistForSO(String sourceOrderId ) throws JSONException, SQLException {
        GeneratePickList GeneratePicklistNew = new GeneratePickList();
        GeneratePickListPayloads BulkPicklist = new GeneratePickListPayloads();
        String odinSalesOrderIdQuery="select id from sales_orders where source_order_id='"+ sourceOrderId+"';";
        String odinSalesOrderId=odinDs.executeSelectQuery(odinSalesOrderIdQuery).getJSONObject(0).getString("id");
        GeneratePicklistNew.setRequestBody(BulkPicklist.GeneratePickListPayloads(odinSalesOrderId));
        response = GeneratePicklistNew.callAPI();
        softAssert=new CustomSoftAssert();
        softAssert.assertEquals(response.getStatusCode(), 200, "Passed " + response.getStatusCode());
        softAssert.assertAll();
        return odinSalesOrderId;
    }

    //When Picker is already having other orders assigned on their name
    public void GeneratePicklistWhenPickerIsAlreadyWorkingOnSO(String salesOrderId) throws JSONException, SQLException {
        GeneratePickList GeneratePicklistNew = new GeneratePickList();
        GeneratePicklistNew.setRequestBody(GeneratePickListPayloads.GeneratePickListPayloads(salesOrderId));
        response = GeneratePicklistNew.callAPI();
        softAssert=new CustomSoftAssert();
        softAssert.assertEquals(response.getStatusCode(), 422, "Orders already Assigned on this Picker" + response.getStatusCode());
        softAssert.assertAll();
    }

    //when Some user is already working on this Sales Order / Sales Order assigned to some other picker
    public void GeneratePicklistWhenSOWithOtherPicker(String salesOrderId) throws JSONException {
        GeneratePickList GeneratePicklistNew = new GeneratePickList();
        GeneratePicklistNew.setRequestBody(GeneratePickListPayloads.GeneratePickListPayloads(salesOrderId));
        response = GeneratePicklistNew.callAPI();
        softAssert=new CustomSoftAssert();
        softAssert.assertEquals(response.getStatusCode(), 422, "these orders are not mapped with you" + response.getStatusCode());
        softAssert.assertAll();
    }

}