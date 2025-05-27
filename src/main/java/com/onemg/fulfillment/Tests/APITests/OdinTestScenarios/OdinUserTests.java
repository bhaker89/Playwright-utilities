package com.onemg.fulfillment.Tests.APITests.OdinTestScenarios;

import com.onemg.fulfillment.Tests.Base;
import com.onemg.fulfillment.api.OdinAPIs.CreateOdinUser;
import com.onemg.fulfillment.Payloads.OdinPayloads.CreateOdinUserPayload;
import org.json.JSONException;
import org.testng.annotations.Test;
import io.restassured.response.Response;

public class OdinUserTests extends Base {

    @Test(description = "Verify that user should be able to create a new user.", groups={"Sanity","Regression","Odin","NewDataGenerate"})
    public void C112756_createOdinUser_TC001() throws JSONException {
        CreateOdinUser createOdinUser = new CreateOdinUser();
        CreateOdinUserPayload payload = new CreateOdinUserPayload();
        String expectedUserName = payload.randomUserName;
        createOdinUser.setRequestBody(payload.createNewOdinUserPayload());
        Response response = createOdinUser.callAPI();
        softAssert.assertEquals(response.getStatusCode(), 200, "Failed: API failed with status code : "+ response.getStatusCode() +":: " + response.getBody());
        String actualUserName = response.getBody().jsonPath().getString("data.name"); // getting user name from response for assertion value from response
        softAssert.assertEquals(expectedUserName,actualUserName,"User names doesn't match :: " + " UserName: "+ actualUserName + " !!! ");
        softAssert.assertAll();
    }

    @Test(description = "Verify that error should be raised while creating existing user.", groups={"Sanity","Regression","Odin"})
    public void createOdinUser_TC002() throws JSONException {
        CreateOdinUser createOdinUser = new CreateOdinUser();
        CreateOdinUserPayload payload = new CreateOdinUserPayload();
        createOdinUser.setRequestBody(payload.createExistingOdinUserPayload());
        Response response = createOdinUser.callAPI();
        softAssert.assertEquals(response.getStatusCode(), 400, "Failed: API failed with status code : "+ response.getStatusCode() +":: " + response.getBody());
        softAssert.assertAll();
    }
}
