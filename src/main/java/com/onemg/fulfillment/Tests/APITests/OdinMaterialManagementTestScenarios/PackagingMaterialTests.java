package com.onemg.fulfillment.Tests.APITests.OdinMaterialManagementTestScenarios;

import com.onemg.fulfillment.Payloads.OdinMaterialManagementPayloads.CreatePackagingMaterialPayload;
import com.onemg.fulfillment.Tests.Base;
import com.onemg.fulfillment.api.OdinMaterialManagement.CreatePackagingMaterial;
import io.restassured.response.Response;
import org.json.JSONException;
import org.testng.annotations.Test;

import java.sql.SQLException;

public class PackagingMaterialTests extends Base {
    Response response;

    //Verify that Packaging Material is created successfully
    @Test(description = "Verify that packaging material is created successfully.", groups = {"Sanity", "Odin","Regression"})
    public void C112968_PackagingMaterialTests_TC001() throws JSONException, SQLException {
        CreatePackagingMaterial createPackagingMaterial= new CreatePackagingMaterial();
        CreatePackagingMaterialPayload payload= new CreatePackagingMaterialPayload();
        createPackagingMaterial.setRequestBody(payload.createPackagingMaterialPayload());
        response = createPackagingMaterial.callAPI();
        String responseBarcode = response.getBody().jsonPath().getString("data.barcode");
        String responseId=response.getBody().jsonPath().getString("data.id");
        String dbBarcodeQuery = "select barcode from packaging_materials where id="+responseId+";";
        String dbBarcode = odinDs.executeSelectQuery(dbBarcodeQuery).getJSONObject(0).getString("barcode");
        softAssert.assertEquals(response.getStatusCode(), 200, "Passed: API passed with status code : " + response.getStatusCode());
        softAssert.assertEquals(responseBarcode,dbBarcode,"Different barcode in DB and response",
                "Validating barcode from DB");
        softAssert.assertAll();
    }
    //Verify that error should be given if previously used barcode is sent
    @Test(description = "Verify that error should be given if previously used barcode is sent while creating packaging material.", groups = {"Sanity", "Odin","Regression"})
    public void C112968_PackagingMaterialTests_TC002() throws JSONException, SQLException {
        CreatePackagingMaterial createPackagingMaterial= new CreatePackagingMaterial();
        CreatePackagingMaterialPayload payload= new CreatePackagingMaterialPayload();
        String dbBarcodeQuery = "select barcode from packaging_materials where barcode != '';"; //If only PackagingMaterialTests_TC002 is run, this value will be used
        String dbBarcode = odinDs.executeSelectQuery(dbBarcodeQuery).getJSONObject(0).getString("barcode");
        createPackagingMaterial.setRequestBody(payload.createPackagingMaterialPayload(dbBarcode));
        response = createPackagingMaterial.callAPI();
        softAssert.assertEquals(response.getStatusCode(), 400, "Passed: API Failed with status code : " + response.getStatusCode());
        //Comparing Error Message
        softAssert.assertEquals(response.jsonPath().getString("errors[0].message"),"Packaging Material with this barcode already exists","Message validated");
        softAssert.assertAll();
    }

}

