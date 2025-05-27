package com.onemg.fulfillment.Tests.APITests.OdinTestScenarios;

import com.onemg.automation.enums.ConfigHandler;
import com.onemg.fulfillment.Payloads.OdinPayloads.EditBatchPayload;
import com.onemg.fulfillment.Tests.Base;
import com.onemg.fulfillment.api.OdinAPIs.EditBatch;
import io.restassured.response.Response;
import org.apache.commons.lang.RandomStringUtils;
import org.json.JSONException;
import org.testng.annotations.Test;
import com.onemg.fulfillment.api.OdinAPIs.ChangeOdinUserCurrentVendor;

import java.sql.SQLException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

public class EditBatchTests extends Base {
    Response res;
    private static final DateTimeFormatter formatter
            = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    //Verify that a batch can be edited on ODIN
    @Test(description = "Verify that user should be able to edit batch on batch master.", priority = 3,groups = {"Sanity", "Odin","Regression"})
    public void C112941_EditBatch_TC001() throws JSONException, SQLException {
        //Fetching random permission to add in group
        String dbBatchQuery = "select id from batches where vendor_id = 1 and status = 'active' order by random() limit 1;";
        String dbBatchId = odinDs.executeSelectQuery(dbBatchQuery).getJSONObject(0).getString("id");
        String dbExpiryQuery = "select expiry_date from batches where id="+dbBatchId+";";
        String dbExpiry = odinDs.executeSelectQuery(dbExpiryQuery).getJSONObject(0).getString("expiry_date");
        String dbMRPQuery = "select mrp from batches where id="+dbBatchId+";";
        String dbMRP = odinDs.executeSelectQuery(dbMRPQuery).getJSONObject(0).getString("mrp");
        ConfigHandler.COMMON.put("batchId",dbBatchId);
        ConfigHandler.COMMON.put("batchMRP",dbMRP);
        //Adding 2 years to current Expiry of batch
        LocalDate newExpiry = LocalDate.parse(dbExpiry, formatter);
        newExpiry=newExpiry.plusYears(5);
        EditBatch editBatch = new EditBatch();
        EditBatchPayload editBatchPayload=new EditBatchPayload();
        String randomHSN = RandomStringUtils.randomNumeric(6);
        editBatch.setRequestBody(editBatchPayload.editBatchPayload(dbBatchId,newExpiry.toString(),randomHSN,dbMRP));
        res = editBatch.callAPI();
        softAssert.assertEquals(res.getStatusCode(), 200, "Passed: API passed with status code : " + res.getStatusCode());
        //Verifying if Expiry and HSN are updated in Db
        String dbHSNQuery="select hsn_code from batches where id="+dbBatchId+";";
        String newDbExpiry=odinDs.executeSelectQuery(dbExpiryQuery).getJSONObject(0).getString("expiry_date");
        String newDbHSN=odinDs.executeSelectQuery(dbHSNQuery).getJSONObject(0).getString("hsn_code");
        softAssert.assertEquals(newDbExpiry,newExpiry.toString(),"Correct Expiry updated");
        softAssert.assertEquals(newDbHSN,randomHSN,"Correct HSN updated");
        softAssert.assertAll();
    }
    //Verify that if Batch is editted again suddenly, error is thrown
    @Test(description = "Verify that user should not be able to re-edit batch within 5 minutes on batch master.", priority = 4,groups = {"Sanity", "Odin","Regression"})
    public void C112942_EditBatch_TC002() throws JSONException, SQLException {
        String dbExpiryQuery = "select expiry_date from batches where id="+ConfigHandler.COMMON.get("batchId")+";";
        String dbExpiry = odinDs.executeSelectQuery(dbExpiryQuery).getJSONObject(0).getString("expiry_date");
        LocalDate newExpiry = LocalDate.parse(dbExpiry, formatter);
        newExpiry=newExpiry.plusYears(2);
        EditBatch editBatch = new EditBatch();
        EditBatchPayload editBatchPayload=new EditBatchPayload();
        String randomHSN = RandomStringUtils.randomNumeric(6);
        editBatch.setRequestBody(editBatchPayload.editBatchPayload(ConfigHandler.COMMON.get("batchId"),newExpiry.toString(),randomHSN,ConfigHandler.COMMON.get("batchMRP")));
        res = editBatch.callAPI();
        softAssert.assertEquals(res.getStatusCode(), 400, "Passed: API failed with status code : " + res.getStatusCode());
        softAssert.assertEquals(res.jsonPath().getString("errors[0].message"), "Re-edit for this batch is not allowed for 5 minutes since last edit", "Batch is not editable again for 5 minutes");
        softAssert.assertAll();
    }
}
