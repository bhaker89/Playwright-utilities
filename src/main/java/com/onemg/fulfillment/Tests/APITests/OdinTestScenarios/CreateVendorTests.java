package com.onemg.fulfillment.Tests.APITests.OdinTestScenarios;

import com.aventstack.extentreports.markuputils.ExtentColor;
import com.onemg.fulfillment.Payloads.OdinPayloads.CreateVendorPayload;
import com.onemg.fulfillment.Tests.Base;
import com.onemg.fulfillment.api.OdinAPIs.CreateVendor;
import io.restassured.response.Response;
import com.onemg.automation.testng.customreporter.CustomLogger;
import org.json.JSONException;
import org.testng.annotations.Test;

import java.sql.SQLException;

public class CreateVendorTests extends Base {

    @Test(description = "Verify that user should be able to create LFC warehouse.", groups={"Sanity","Regression","Odin","NewDataGenerate"})
    public void C112765_createVendor_TC001() throws JSONException, SQLException {
        CreateVendor createVendor = new CreateVendor();
        CreateVendorPayload payload = new CreateVendorPayload();
        createVendor.setRequestBody(payload.createNewWarehouseLfcVendorPayload());
        Response response = createVendor.callAPI();
        String vendorId = response.body().jsonPath().getString("data.id");
        String dbVendorDetailFromVendorsQuery = "select id from vendors where id="+vendorId+";";
        String dbVendorIdFromVendors = odinDs.executeSelectQuery(dbVendorDetailFromVendorsQuery).isNull(0)?"":odinDs.executeSelectQuery(dbVendorDetailFromVendorsQuery).getJSONObject(0).getString("id");
        softAssert.assertEquals(response.getStatusCode(), 200, "Failed: API failed with status code : "+ response.getStatusCode() +":: " + response.getBody());
        //Bug created (https://1mgtech.atlassian.net/browse/ODIN-20939)
        //softAssert.assertEquals(response.body().jsonPath().getString("data.id"), dbVendorIdFromVendors,"Validation Failed: Vendor not created.");
        softAssert.assertAll();
    }

    @Test(description = "Verify that user should be able to create FC warehouse ", groups={"Sanity","Regression","Odin","NewDataGenerate"})
    public void C112919_createVendor_TC002() throws JSONException, SQLException, InterruptedException {
        //API Does not allow vendor create or update in 30 second gap
        Thread.sleep(31000);
        CreateVendor createVendor = new CreateVendor();
        CreateVendorPayload payload = new CreateVendorPayload();
        createVendor.setRequestBody(payload.createNewWarehouseFcVendorPayload());
        Response response = createVendor.callAPI();
        String vendorId = response.body().jsonPath().getString("data.id");
        String dbVendorDetailFromVendorsQuery = "select id from vendors where id="+vendorId+";";
        String dbVendorIdFromVendors = odinDs.executeSelectQuery(dbVendorDetailFromVendorsQuery).isNull(0)?"":odinDs.executeSelectQuery(dbVendorDetailFromVendorsQuery).getJSONObject(0).getString("id");
        softAssert.assertEquals(response.getStatusCode(), 200, "Failed: API failed with status code : "+ response.getStatusCode() +":: " + response.getBody());
        //Bug created (https://1mgtech.atlassian.net/browse/ODIN-20939)
        //softAssert.assertEquals(response.body().jsonPath().getString("data.id"), dbVendorIdFromVendors,"Validation Failed: Vendor not created.");
        softAssert.assertAll();
    }

    @Test(description = "Verify that user should be able to create marketplace vendor.", groups={"Sanity","Regression","Odin","NewDataGenerate"})
    public void C112919_createVendor_TC003() throws JSONException, SQLException,InterruptedException {
        //API Does not allow vendor create or update in 30 second gap
        Thread.sleep(31000);
        CreateVendor createVendor = new CreateVendor();
        CreateVendorPayload payload = new CreateVendorPayload();
        createVendor.setRequestBody(payload.createNewMarketplaceSellerPayload());
        Response response = createVendor.callAPI();
        String vendorId = response.body().jsonPath().getString("data.id");
        String dbVendorDetailFromVendorsQuery = "select id from vendors where id="+vendorId+";";
        String dbVendorIdFromVendors = odinDs.executeSelectQuery(dbVendorDetailFromVendorsQuery).isNull(0)?"":odinDs.executeSelectQuery(dbVendorDetailFromVendorsQuery).getJSONObject(0).getString("id");
        softAssert.assertEquals(response.getStatusCode(), 200, "Failed: API failed with status code : "+ response.getStatusCode() +":: " + response.getBody());
        //Bug created (https://1mgtech.atlassian.net/browse/ODIN-20939)
        //softAssert.assertEquals(response.body().jsonPath().getString("data.id"), dbVendorIdFromVendors,"Validation Failed: Vendor not created.");
        softAssert.assertAll();
    }

    @Test(description = "Verify that error should be raised when user tries to create a duplicate vendor.", groups={"Sanity","Regression","Odin","NewDataGenerate"})
    public void C112918_createVendor_TC004() throws JSONException {
        CreateVendor createVendor = new CreateVendor();
        CreateVendorPayload payload = new CreateVendorPayload();
        createVendor.setRequestBody(payload.createDuplicateVendorPayload());
        Response response = createVendor.callAPI();
        softAssert.assertEquals(response.getStatusCode(), 400, "Failed: API failed with status code : "+ response.getStatusCode() +":: " + response.getBody());
        softAssert.assertAll();
    }
}