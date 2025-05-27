package com.onemg.fulfillment.Tests.APITests.OdinTestScenarios;

import com.onemg.automation.enums.ConfigHandler;
import com.onemg.fulfillment.Payloads.OdinPayloads.CreateB2bClientPayload;
import com.onemg.fulfillment.Tests.Base;
import com.onemg.fulfillment.api.OdinAPIs.CreateB2bClient;
import com.onemg.fulfillment.utils.GenerateJWT;
import org.json.JSONException;
import org.json.JSONObject;
import org.testng.annotations.BeforeClass;
import org.testng.annotations.Test;
import io.restassured.response.Response;
import java.sql.SQLException;

public class B2bClientTests extends Base {
    @Test(description = "Verify that New Retailer B2b Client is created successfully", groups={"Sanity","Regression","Odin","NewDataGenerate"})
    /* Running test for creating B2b Client for type Retailer */
    public void C112929_createB2bClient_TC001() throws JSONException, SQLException {
        CreateB2bClient createB2bClient = new CreateB2bClient(); /* Add Create B2b Client API Object */
        CreateB2bClientPayload retailerB2bClientPayload = new CreateB2bClientPayload(); /* Add  Create B2b Client API Payload Object*/
        createB2bClient.setRequestBody(retailerB2bClientPayload.createNewB2bClient("retailer",false,"0"));
        String expectedB2bClient = retailerB2bClientPayload.randomUserName;
        Response response = createB2bClient.callAPI();
        String actualB2bClientName = response.getBody().jsonPath().getString("data.name"); // getting user name from response for assertion value from response
        softAssert.assertEquals(response.getStatusCode(), 200, "Failed: API failed with status code : "+ response.getStatusCode() +":: " + response.getBody());
        softAssert.assertEquals(expectedB2bClient,actualB2bClientName,"User names doesn't match :: " + " UserName: "+ actualB2bClientName + " !!! ");
        softAssert.assertAll();
    }

    @Test(description = "Verify that New Doctor B2b Client is created successfully", groups={"Sanity","Regression","Odin","NewDataGenerate"})
    /* Running test for creating B2b Client for type Doctor */
    public void C112930_createB2bClient_TC002() throws JSONException, SQLException {
        CreateB2bClient createB2bClient = new CreateB2bClient(); /* Add Create B2b Client API Object */
        CreateB2bClientPayload doctorB2bClientPayload = new CreateB2bClientPayload(); /* Add  Create B2b Client API Payload Object*/
        createB2bClient.setRequestBody(doctorB2bClientPayload.createNewB2bClient("doctor",false,"0"));
        String expectedB2bClient = doctorB2bClientPayload.randomUserName;
        Response response = createB2bClient.callAPI();
        String actualB2bClientName = response.getBody().jsonPath().getString("data.name"); // getting user name from response for assertion value from response
        softAssert.assertEquals(response.getStatusCode(), 200, "Failed: API failed with status code : "+ response.getStatusCode() +":: " + response.getBody());
        softAssert.assertEquals(expectedB2bClient,actualB2bClientName,"User names doesn't match :: " + " UserName: "+ actualB2bClientName + " !!! ");
        softAssert.assertAll();
    }

    @Test(description = "Validate New Retail Store B2b Client is created successfully", groups={"Sanity","Regression","Odin","NewDataGenerate"})
    /* Running test for creating B2b Client for type Retail Store */
    public void C112931_createB2bClient_TC003() throws JSONException, SQLException {
        CreateB2bClient createB2bClient = new CreateB2bClient(); /* Add Create B2b Client API Object */
        CreateB2bClientPayload retailStoreB2bClientPayload = new CreateB2bClientPayload(); /* Add  Create B2b Client API Payload Object*/
        createB2bClient.setRequestBody(retailStoreB2bClientPayload.createNewB2bClient("1mg_retail_store",false,"0"));
        String expectedB2bClient = retailStoreB2bClientPayload.randomUserName;
        Response response = createB2bClient.callAPI();
        String actualB2bClientName = response.getBody().jsonPath().getString("data.name"); // getting user name from response for assertion value from response
        softAssert.assertEquals(response.getStatusCode(), 200, "Failed: API failed with status code : "+ response.getStatusCode() +":: " + response.getBody());
        softAssert.assertEquals(expectedB2bClient,actualB2bClientName,"User names doesn't match :: " + " UserName: "+ actualB2bClientName + " !!! ");
        softAssert.assertAll();
    }

    @Test(description = "Verify that New Warehouse Type B2b Client is created successfully with no warehouseId available", groups={"Sanity","Regression","Odin","NewDataGenerate"})
    /* Running test for creating B2b Client for type warehouse */
    public void C112932_createB2bClient_TC004() throws JSONException, SQLException {
        CreateB2bClient createB2bClient = new CreateB2bClient(); /* Add Create B2b Client API Object */
        CreateB2bClientPayload warehouseB2bClientPayload = new CreateB2bClientPayload(); /* Add  Create B2b Client API Payload Object*/
        createB2bClient.setRequestBody(warehouseB2bClientPayload.createNewB2bClient("1mg_warehouse",false,"0"));
        String expectedB2bClient = warehouseB2bClientPayload.randomUserName;
        String expectedWhId = warehouseB2bClientPayload.vendorToMap; /*expectedWhId = expected Warehouse Id*/
        Response response = createB2bClient.callAPI();
        String actualB2bClientName = response.getBody().jsonPath().getString("data.name"); // getting user name from response for assertion value from response
        String actualWhId = response.getBody().jsonPath().getString("data.onemg_warehouse_id");
        softAssert.assertEquals(response.getStatusCode(), 200, "Failed: API failed with status code : "+ response.getStatusCode() +":: " + response.getBody());
        softAssert.assertEquals(expectedB2bClient,actualB2bClientName,"User names doesn't match :: " + " UserName: "+ actualB2bClientName + " !!! ");
        softAssert.assertEquals(expectedWhId,actualWhId,"Wh Id doesn't match :: " + " UserName: "+ actualWhId + " !!! ");
        softAssert.assertAll();
    }

    @Test(description = "Verify that New Warehouse Type B2b Client is created successfully with warehouseId available", groups={"Sanity","Regression","Odin","NewDataGenerate"})
    /* Running test for creating B2b Client for type warehouse */
    public void C112933_createB2bClient_TC005() throws JSONException, SQLException {
        CreateB2bClient createB2bClient = new CreateB2bClient(); /* Add Create B2b Client API Object */
        CreateB2bClientPayload warehouseB2bClientPayload = new CreateB2bClientPayload(); /* Add  Create B2b Client API Payload Object*/
        createB2bClient.setRequestBody(warehouseB2bClientPayload.createNewB2bClient("1mg_warehouse",true,"390"));
        String expectedB2bClient = warehouseB2bClientPayload.randomUserName;
        String expectedWhId = warehouseB2bClientPayload.vendorToMap;
        Response response = createB2bClient.callAPI();
        String actualB2bClientName = response.getBody().jsonPath().getString("data.name"); // getting user name from response for assertion value from response
        String actualWhId = response.getBody().jsonPath().getString("data.onemg_warehouse_id");
        softAssert.assertEquals(response.getStatusCode(), 200, "Failed: API failed with status code : "+ response.getStatusCode() +":: " + response.getBody());
        softAssert.assertEquals(expectedB2bClient,actualB2bClientName,"User names doesn't match :: " + " UserName: "+ actualB2bClientName + " !!! ");
        softAssert.assertEquals(expectedWhId,actualWhId,"Wh Id doesn't match :: " + " UserName: "+ actualWhId + " !!! ");
        softAssert.assertAll();
    }
}