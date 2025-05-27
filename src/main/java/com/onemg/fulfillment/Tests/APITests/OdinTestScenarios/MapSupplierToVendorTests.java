package com.onemg.fulfillment.Tests.APITests.OdinTestScenarios;

import com.onemg.automation.enums.ConfigHandler;
import com.onemg.automation.global.Constants;
import com.onemg.automation.testng.customreporter.CustomLogger;
import com.onemg.fulfillment.Payloads.OdinPayloads.CreateMapSupplierToVendorPayload;
import com.onemg.fulfillment.Payloads.OdinPayloads.CreateOdinSupplierPayload;
import com.onemg.fulfillment.Tests.Base;
import com.onemg.fulfillment.api.OdinAPIs.ChangeOdinUserCurrentVendor;
import com.onemg.fulfillment.api.OdinAPIs.CreateOdinSupplier;
import com.onemg.fulfillment.api.OdinAPIs.MapSupplierToVendor;
import io.restassured.response.Response;
import org.json.JSONException;
import org.testng.annotations.BeforeClass;
import org.testng.annotations.Test;
import org.testng.asserts.SoftAssert;

import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Collections;

public class MapSupplierToVendorTests extends Base{
    /*Added Before Class method to change the current user's vendor to the vendor defined in the common properties
    * when no vendor id is passed.
    * Also if another vendor id is passes it will change the user's vendor to that vendor also */
    @BeforeClass
    public void changeOdinUserVendor() throws JSONException {
        SoftAssert softAssert = new SoftAssert();
        ChangeOdinUserCurrentVendor changeOdinVendorObj = new ChangeOdinUserCurrentVendor();
        changeOdinVendorObj.setRequestBody("{\"vendor_id\":"+ ConfigHandler.COMMON.get("odinUserCurrentVendor") +"}");
        Response response = changeOdinVendorObj.callAPI();
        softAssert.assertEquals(response.getStatusCode(), 200, "Failed: API failed with status code : "+ response.getStatusCode() +":: " + response.getBody());
        softAssert.assertAll();
    }

    /*Using 2 different approaches to run the main Map Supplier to vendor test:
    * First Approach: Creating a single new supplier to be mapped to the vendor.*/
    private ArrayList<String> getNewSupplierId() throws JSONException {
        CreateOdinSupplier singleSupplierObj = new CreateOdinSupplier();
        CreateOdinSupplierPayload supplierPayload = new CreateOdinSupplierPayload();
        singleSupplierObj.setRequestBody(supplierPayload.createNewOdinSupplier("direct","pharma","credit",true,"grn"));
        Response response = singleSupplierObj.callAPI();
        softAssert.assertEquals(response.getStatusCode(), 200, "Failed: API failed with status code : "+ response.getStatusCode() +":: " + response.getBody());
        String responseSupplierId = response.getBody().jsonPath().getString("data.id");
        ArrayList<String> supplierId = new ArrayList<String>();
        supplierId.add(responseSupplierId);
        return supplierId;
    }
    /* Second Approach: Added this function to remove the existing contracts and mapping multiple suppliers to the vendor again.*/
    private void removeExistingSupplierContract(ArrayList<String> supplier_ids) throws SQLException, JSONException {
        for (String supId : supplier_ids) {
            String checkContractAvailable = "Select id from vendor_supplier_contracts " +
                    "where supplier_id = " + supId + " and vendor_id = " + ConfigHandler.COMMON.get("odinVendorId")
                    + " and status = 'active';";
            String isContractIdPresent = null;
            try {
                isContractIdPresent = odinDs.executeSelectQuery(checkContractAvailable).getJSONObject(0).getString("id");
                if (isContractIdPresent != null) {
                    String contractDeleteQuery = "Delete from vendor_supplier_contracts " +
                            "where supplier_id = " + supId + " and vendor_id = " + ConfigHandler.COMMON.get("odinVendorId")
                            + " and status = 'active' ;";
                    odinDs.executeUpdate(contractDeleteQuery);
                }
            } catch (Exception e) {
                alert(e);
            }
        }
    }

    private void alert(Exception e) {
    }

    private void removeExistingSupplierContract(ArrayList<String> supplier_ids, String vendorId) throws SQLException, JSONException {
        for (String supId : supplier_ids) {
            String checkContractAvailable = "Select id from vendor_supplier_contracts " +
                    "where supplier_id = " + supId + " and vendor_id = " + vendorId + " and status = 'active' ;";
            String isContractIdPresent = odinDs.executeSelectQuery(checkContractAvailable).getJSONObject(0).getString("id");
            if (isContractIdPresent != null) {
                String contractDeleteQuery = "Delete from vendor_supplier_contracts " +
                        "where supplier_id = " + supId + " and vendor_id = " + vendorId + " and status = 'active' ;";
                odinDs.executeUpdate(contractDeleteQuery);
            }
        }
    }
    /* Added this method to assert the newly created contracts whether there is a single mapping created or multiple*/
    private void assertContractStatus(ArrayList<String> supplier_ids) throws SQLException, JSONException {
        for (String supId : supplier_ids) {
            String verifySupplierContractQuery = "Select status from vendor_supplier_contracts where vendor_id = " + ConfigHandler.COMMON.get("odinVendorId") +
                    "and supplier_id = " + supId;
            String expectedStatus = odinDs.executeSelectQuery(verifySupplierContractQuery).getJSONObject(0).getString("status");
            softAssert.assertEquals(expectedStatus, ConfigHandler.COMMON.get("activeStatus"), "Status not found or matched for the supplier and vendor. Status Received: " + expectedStatus + " !!!");
            CustomLogger.logDebug("Supplier id: " + supId + ":: Status: " + expectedStatus);
        }
    }

    @Test(description = "Verify single supplier is mapped to the vendor successfully.", groups={"Sanity","Regression","Odin","NewDataGenerate"})
    public void C112958_MapSupplierToVendor_TC001() throws JSONException, SQLException {
        MapSupplierToVendor mapSupplierToVendor = new MapSupplierToVendor();
        CreateMapSupplierToVendorPayload supplierContractPayload = new CreateMapSupplierToVendorPayload();
        ArrayList<String> supplierArray = new ArrayList<String>();
        supplierArray = getNewSupplierId();
        mapSupplierToVendor.setRequestBody(supplierContractPayload.mapSkuToLocationPayload(supplierArray));
        Response response = mapSupplierToVendor.callAPI();
        softAssert.assertEquals(response.getStatusCode(), 200, "Failed: API failed with status code : " + response.getStatusCode() + ":: " + response.getBody());
        assertContractStatus(supplierArray);
        softAssert.assertAll();
    }

    @Test(description = "Verify multiple suppliers are mapped to the vendor successfully.", groups={"Sanity","Regression","Odin"})
    public void C112959_MapSupplierToVendor_TC002() throws JSONException, SQLException {
        ArrayList<String> multipleSupplierIds = new ArrayList<String>();
        String[] multipleSupplierList = ConfigHandler.COMMON.get("odinSupplierForMapping").split(Constants.REGEX_SPLIT_WITH_COMMA);
        Collections.addAll(multipleSupplierIds, multipleSupplierList);
        MapSupplierToVendor mapSupplierToVendor = new MapSupplierToVendor();
        CreateMapSupplierToVendorPayload supplierContractPayload = new CreateMapSupplierToVendorPayload();
        removeExistingSupplierContract(multipleSupplierIds);
        mapSupplierToVendor.setRequestBody(supplierContractPayload.mapSkuToLocationPayload(multipleSupplierIds));
        Response response = mapSupplierToVendor.callAPI();
        softAssert.assertEquals(response.getStatusCode(), 200, "Failed: API failed with status code : " + response.getStatusCode() + ":: " + response.getBody());
        assertContractStatus(multipleSupplierIds);
        softAssert.assertAll();
    }
}