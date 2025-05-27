package com.onemg.fulfillment.Tests.APITests.OdinTestScenarios;

import com.onemg.fulfillment.Tests.Base;
import io.restassured.response.Response;
import org.json.JSONException;
import org.testng.annotations.Test;
import com.onemg.fulfillment.api.OdinAPIs.CreateSkuLocation;
import com.onemg.fulfillment.Payloads.OdinPayloads.CreateSkuLocationPayload;
import java.sql.SQLException;

public class CreateSkuLocationOnOdinTests extends Base {
    @Test(description = "Verify that user should be able to create picking SKU location.",groups={"Sanity","Regression","Odin"})
    public void C112935_CreateSkuLocationOnOdinTests_TC001() throws JSONException, SQLException {
        CreateSkuLocation createSkuLocation = new CreateSkuLocation();
        CreateSkuLocationPayload payload = new CreateSkuLocationPayload();
        String requestBody = payload.pickingSkuLocationPayload();
        createSkuLocation.setRequestBody(requestBody);
        Response response = createSkuLocation.callAPI();
        String dbLocationDetailFromLocationQuery = "select name from locations order by id desc limit 1;";
        String dbLocationNameFromLocations = odinDs.executeSelectQuery(dbLocationDetailFromLocationQuery).getJSONObject(0).getString("name");
        softAssert.assertEquals(response.getStatusCode(), 200, "Failed: API failed with status code : "+ response.getStatusCode() +":: " + response.getBody());
        softAssert.assertEquals(response.body().jsonPath().getString("data.name"), dbLocationNameFromLocations,"Validation Failed: Missmatch in location name.");
        softAssert.assertAll();
    }
    @Test(description = "Verify that user should be able to create bulk SKU location.",groups={"Sanity","Regression","Odin"})
    public void C112936_CreateSkuLocationOnOdinTests_TC002() throws JSONException, SQLException {
        CreateSkuLocation createSkuLocation = new CreateSkuLocation();
        CreateSkuLocationPayload payload = new CreateSkuLocationPayload();
        String requestBody = payload.bulkSkuLocationPayload();
        createSkuLocation.setRequestBody(requestBody);
        Response response = createSkuLocation.callAPI();
        String dbLocationDetailFromLocationQuery = "select name from locations order by id desc limit 1;";
        String dbLocationNameFromLocations = odinDs.executeSelectQuery(dbLocationDetailFromLocationQuery).getJSONObject(0).getString("name");
        softAssert.assertEquals(response.getStatusCode(), 200, "Failed: API failed with status code : "+ response.getStatusCode() +":: " + response.getBody());
        softAssert.assertEquals(response.body().jsonPath().getString("data.name"), dbLocationNameFromLocations,"Validation Failed: Missmatch in location name.");
        softAssert.assertAll();
    }
    @Test(description = "Verify that user should be able to create near expiry SKU location.",groups={"Sanity","Regression","Odin"})
    public void C112937_CreateSkuLocationOnOdinTests_TC003() throws JSONException, SQLException {
        CreateSkuLocation createSkuLocation = new CreateSkuLocation();
        CreateSkuLocationPayload payload = new CreateSkuLocationPayload();
        String requestBody = payload.nearExpirySkuLocationPayload();
        createSkuLocation.setRequestBody(requestBody);
        Response response = createSkuLocation.callAPI();
        String dbLocationDetailFromLocationQuery = "select name from locations order by id desc limit 1;";
        String dbLocationNameFromLocations = odinDs.executeSelectQuery(dbLocationDetailFromLocationQuery).getJSONObject(0).getString("name");
        softAssert.assertEquals(response.getStatusCode(), 200, "Failed: API failed with status code : "+ response.getStatusCode() +":: " + response.getBody());
        softAssert.assertEquals(response.body().jsonPath().getString("data.name"), dbLocationNameFromLocations,"Validation Failed: Missmatch in location name.");
        softAssert.assertAll();
    }
    @Test(description = "Verify that user should be able to create JIT SKU location.",groups={"Sanity","Regression","Odin"})
    public void C112938_CreateSkuLocationOnOdinTests_TC004() throws JSONException, SQLException {
        CreateSkuLocation createSkuLocation = new CreateSkuLocation();
        CreateSkuLocationPayload payload = new CreateSkuLocationPayload();
        String requestBody = payload.jitLocationPayload();
        createSkuLocation.setRequestBody(requestBody);
        Response response = createSkuLocation.callAPI();
        String dbLocationDetailFromLocationQuery = "select name from locations order by id desc limit 1;";
        String dbLocationNameFromLocations = odinDs.executeSelectQuery(dbLocationDetailFromLocationQuery).getJSONObject(0).getString("name");
        softAssert.assertEquals(response.getStatusCode(), 200, "Failed: API failed with status code : "+ response.getStatusCode() +":: " + response.getBody());
        softAssert.assertEquals(response.body().jsonPath().getString("data.name"), dbLocationNameFromLocations,"Validation Failed: Missmatch in location name.");
        softAssert.assertAll();
    }

    @Test(description = "Verify that user should be able to create duplicate SKU location.",groups={"Sanity","Regression","Odin"})
    public void C112939_CreateSkuLocationOnOdinTests_TC005() throws JSONException, SQLException {
        CreateSkuLocation createSkuLocation = new CreateSkuLocation();
        CreateSkuLocationPayload payload = new CreateSkuLocationPayload();
        String requestBody = payload.existingLocationPayload();
        createSkuLocation.setRequestBody(requestBody);
        Response response = createSkuLocation.callAPI();
        softAssert.assertEquals(response.getStatusCode(), 422, "Validation failed: Vendor Location is already present on the vendor");
        softAssert.assertAll();
    }
}