package com.onemg.fulfillment.Tests.APITests.OdinTestScenarios;

import com.onemg.automation.enums.ConfigHandler;
import com.onemg.fulfillment.Payloads.OdinPayloads.StartQualityCheckPayload;
import com.onemg.fulfillment.Tests.Base;
import com.onemg.fulfillment.api.OdinAPIs.StartQualityCheck;
import io.restassured.response.Response;
import org.json.JSONException;
import org.testng.annotations.Test;
import org.testng.asserts.SoftAssert;

import java.sql.SQLException;

public class StartQualityCheckTests extends Base {
    //"Start QC from quality check listing screen"
    public void startQualityCheck(String salesOrderId) throws JSONException, SQLException {
        SoftAssert softAssert=new SoftAssert();
        StartQualityCheck startQualityCheck = new StartQualityCheck(salesOrderId);
        StartQualityCheckPayload payload = new StartQualityCheckPayload();
        String requestBody = payload.StartQualityCheckPayload();
        startQualityCheck.setRequestBody(requestBody);
        Response response = startQualityCheck.callAPI();
        softAssert.assertEquals(response.getStatusCode(), 200, "Success: API passed with status code : "+ response.getStatusCode() +":: " + response.getBody());
        String dbQcLock="select resource_ids[1] as rid from resource_locks where resource_type='sales_order' and resource_ids[1] ="+salesOrderId+" and status ='active';";
        String dbQCLog="select actionable_id as aid from action_logs where action='start_qc' and actionable_id='"+salesOrderId+"' limit 1;";
        softAssert.assertEquals(salesOrderId, odinDs.executeSelectQuery(dbQcLock).getJSONObject(0).getString("rid"), "Verified lock");
        softAssert.assertEquals(salesOrderId, odinDs.executeSelectQuery(dbQCLog).getJSONObject(0).getString("aid"), "Verified action log");
        softAssert.assertAll();
    }

}