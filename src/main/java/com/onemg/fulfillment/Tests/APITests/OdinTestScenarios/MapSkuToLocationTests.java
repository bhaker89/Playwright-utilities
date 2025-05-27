package com.onemg.fulfillment.Tests.APITests.OdinTestScenarios;

import com.onemg.fulfillment.Payloads.OdinPayloads.CreateMapSkuToLocationPayload;
import com.onemg.fulfillment.api.OdinAPIs.MapSkuToLocation;
import org.json.JSONException;
import org.testng.annotations.Test;
import com.onemg.fulfillment.Tests.Base;
import io.restassured.response.Response;
import java.sql.SQLException;


public class MapSkuToLocationTests extends Base{
    @Test(description = "Verify that user should be able to map SKU to a location.", groups={"Sanity","Regression","Odin"})
    public void C112956_MapSkuToLocation_TC001() throws JSONException, SQLException {
        String dbLocationDetailFromLocationsQuery = "select id from locations where category='picking' and status='active' and vendor_id='9' order by id desc limit 1;";
        String dbLocationIdFromLocations = odinDs.executeSelectQuery(dbLocationDetailFromLocationsQuery).getJSONObject(0).getString("id");
        String dbSkuDetailFromSkusAndLocationsQuery = "SELECT skus.id FROM skus LEFT JOIN sku_locations ON sku_locations.sku_id = skus.id WHERE sku_locations.sku_id IS NULL order by skus.id desc limit 1;";
        String dbSkuIdFromSkusAndLocations = odinDs.executeSelectQuery(dbSkuDetailFromSkusAndLocationsQuery).getJSONObject(0).getString("id");
        MapSkuToLocation mapSkuToLocation= new MapSkuToLocation();
        CreateMapSkuToLocationPayload payload = new CreateMapSkuToLocationPayload();
        String requestBody = payload.mapSkuToLocationPayload(dbLocationIdFromLocations, dbSkuIdFromSkusAndLocations);
        mapSkuToLocation.setRequestBody(requestBody);
        Response response = mapSkuToLocation.callAPI();
        softAssert.assertEquals(response.getStatusCode(), 200, "Failed: API failed with status code : "+ response.getStatusCode() +":: " + response.getBody());
        softAssert.assertAll();
    }

    @Test(description = "Map SKU to already mapped location", groups={"Sanity","Regression","Odin"})
    public void C112957_MapSkuToLocation_TC002() throws JSONException, SQLException {
        String dbSkuDetailFromSkuLocationsQuery = "select sku_id, location_id from sku_locations where vendor_id='9' and category='picking' order by id desc limit 1;";
        String dbLocationIdFromSkusLocations = odinDs.executeSelectQuery(dbSkuDetailFromSkuLocationsQuery).getJSONObject(0).getString("location_id");
        String dbSkuIdFromSkusLocations = odinDs.executeSelectQuery(dbSkuDetailFromSkuLocationsQuery).getJSONObject(0).getString("sku_id");
        MapSkuToLocation mapSkuToLocation= new MapSkuToLocation();
        CreateMapSkuToLocationPayload payload = new CreateMapSkuToLocationPayload();
        String requestBody = payload.mapSkuToAlreadyMappedLocationPayload(dbLocationIdFromSkusLocations, dbSkuIdFromSkusLocations);
        mapSkuToLocation.setRequestBody(requestBody);
        Response response = mapSkuToLocation.callAPI();
        softAssert.assertEquals(response.getStatusCode(), 400, "Failed: API failed with status code : "+ response.getStatusCode() +":: " + response.getBody());
        softAssert.assertAll();
    }
}
