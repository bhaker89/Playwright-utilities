package com.onemg.fulfillment.Tests.APITests.OdinTestScenarios;

import com.onemg.automation.assertions.CustomSoftAssert;
import com.onemg.automation.enums.ConfigHandler;
import com.onemg.fulfillment.Payloads.OdinPayloads.MoveSoToQCPayload;
import com.onemg.fulfillment.Tests.Base;
import com.onemg.fulfillment.api.OdinAPIs.MoveSoToQC;
import io.restassured.response.Response;
import org.json.JSONException;
import org.testng.annotations.Test;

import java.sql.SQLException;

public class MoveSoToQCTests extends Base {
    //Validate salesOrder in 'picklist generated' status should be able to move to quality_check status
    public void moveSalesOrderToQC(String salesOrderId) throws JSONException, SQLException {
        MoveSoToQC moveSoToQC=new MoveSoToQC();
        moveSoToQC.setRequestBody(MoveSoToQCPayload.moveSoToQCPayload(salesOrderId));
        Response response = moveSoToQC.callAPI();
        String soStatusQuery="select status from sales_orders where id="+salesOrderId+";";
        String orderStatus=odinDs.executeSelectQuery(soStatusQuery).getJSONObject(0).getString("status");
        softAssert=new CustomSoftAssert();
        softAssert.assertEquals(response.getStatusCode(), 200, "Passed: API passed with status code : "+ response.getStatusCode());
        softAssert.assertEquals(orderStatus,"quality_check","Order moved to QC state");
        softAssert.assertAll();
    }
}
