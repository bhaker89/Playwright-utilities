package com.onemg.fulfillment.Tests.APITests.OdinTestScenarios;

import com.onemg.automation.enums.ConfigHandler;
import com.onemg.fulfillment.api.OdinAPIs.CreateB2CClient;
import com.onemg.fulfillment.Payloads.OdinPayloads.CreateB2CClientPayload;
import com.onemg.fulfillment.Tests.Base;
import com.onemg.fulfillment.api.OdinAPIs.CreateBasket;
import io.restassured.response.Response;
import org.apache.commons.lang3.RandomStringUtils;
import org.json.JSONException;
import org.testng.annotations.Test;

import java.sql.SQLException;

public class OdinDataCreationTests extends Base {

    protected static int basketId;

    @Test(description = "Verify that B2C Client is created successfully on Odin", groups={"Sanity","Regression","Odin","NewDataGenerate"})
    public void C112961_createB2CClient_TC001() throws JSONException, SQLException {
        String name= RandomStringUtils.randomAlphabetic(10);
        CreateB2CClient createB2CClient = new CreateB2CClient();
        CreateB2CClientPayload payload = new CreateB2CClientPayload();
        createB2CClient.setRequestBody(payload.createB2CClientPayload(name));
        Response response = createB2CClient.callAPI();
        int b2CClientId=response.jsonPath().get("data.id");
        String b2CClientName=response.jsonPath().get("data.name").toString();
        //DB Query to fetch B2C Client Name based on ID from response
        String b2CClientNameQuery="select * from b2c_clients where id="+b2CClientId+"";
        String getB2CClientNameFromDB=odinDs.executeSelectQuery(b2CClientNameQuery).getJSONObject(0).getString("name");
        softAssert.assertEquals(response.getStatusCode(), 200, "Failed: API failed with status code : "+ response.getStatusCode() +":: " + response.getBody());
        //Comparing B2C Client Name between API Response and DB
        softAssert.assertEquals(b2CClientName,getB2CClientNameFromDB,
                "B2C Client Name are different in API Response and DB",
                "Comparing B2C Client Name between API Response and DB");
        softAssert.assertAll();
    }

    @Test(description = "Verify that user should be able to create basket successfully.", groups={"Sanity","Regression","Odin","NewDataGenerate"})
    public void C112963_createBasket_TC002() throws JSONException, SQLException {
        CreateBasket createBasket = new CreateBasket();
        createBasket.setRequestBody("{\"count\":\"2\"}");
        Response response = createBasket.callAPI();
        //Fetching Basked Id to map it later with OrderId
        basketId=response.jsonPath().get("data[0].id");
        String basketIdQuery="select * from baskets order by created_at desc limit 1";
        int getBasketIdFromDb=Integer.valueOf(odinDs.executeSelectQuery(basketIdQuery).getJSONObject(0).getString("id"));
        softAssert.assertEquals(response.getStatusCode(), 200, "Failed: API failed with status code : "+ response.getStatusCode() +":: " + response.getBody());
        softAssert.assertEquals(basketId,getBasketIdFromDb,
                "Basket ID are different in API Response and DB",
                "Comparing Basket ID between API Response and DB");
        softAssert.assertAll();
    }
}
