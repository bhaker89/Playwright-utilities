package com.onemg.fulfillment.Tests.APITests.OdinAdminTestScenarios;
import com.onemg.fulfillment.Payloads.OdinAdminPayloads.CreateGroupPayload;
import com.onemg.fulfillment.Tests.Base;

import com.onemg.fulfillment.api.OdinAdminAPIs.CreateGroup;
import io.restassured.response.Response;
import org.apache.commons.lang.RandomStringUtils;
import org.json.JSONException;
import org.testng.annotations.Test;
import java.sql.SQLException;

public class CreateGroupTests extends Base {
    Response res;
    CreateGroup createGroup;
    @Test(description = "Verify that a permission group for ODIN can be created",groups = {"Sanity", "Odin","Regression"})
    public void C112899_CreateGroup_TC001() throws JSONException, SQLException {
        createGroup = new CreateGroup();
        CreateGroupPayload createGroupPayload=new CreateGroupPayload();
        String randomLabel = "AUTEST-"+RandomStringUtils.randomAlphabetic(6).toUpperCase();
        //Fetching random permission to add in group
        String dbPermissionQuery = "select id from permissions order by random() limit 1;";
        String dbGroupQuery = "select label from groups where label ='"+randomLabel+"';";
        String dbPermissionId = odinDs.executeSelectQuery(dbPermissionQuery).getJSONObject(0).getString( "id");
        String dbGroupName= odinDs.executeSelectQuery(dbGroupQuery).isNull(0)? "":odinDs.executeSelectQuery(dbGroupQuery).getJSONObject(0).getString( "label");
        createGroup.setRequestBody(createGroupPayload.createGroupPayload(randomLabel,dbPermissionId,"odin"));
        res = createGroup.callAPI();
        //If Random Group label already exists in Database
        if (dbGroupName==randomLabel){
            softAssert.assertEquals(res.getStatusCode(), 400, "Passed: API failed with status code : " + res.getStatusCode());
            softAssert.assertEquals(res.jsonPath().getString("errors[0].message"), "Group already exist with label "+randomLabel, "Random Group label exists in Database");
            softAssert.assertAll();
        }else {
            softAssert.assertEquals(res.getStatusCode(), 200, "Passed: API passed with status code : " + res.getStatusCode());
        //Veryfying if the group is added
            dbGroupName=odinDs.executeSelectQuery(dbGroupQuery).getJSONObject(0).getString( "label");
            softAssert.assertEquals(dbGroupName, randomLabel, "Passed: Group Added to Db");
            softAssert.assertAll();
        }
    }

    @Test(description = "Verify that an error is thrown if same label is used to create a group.", groups = {"Sanity", "Odin","Regression"})
    public void C112900_CreateGroup_TC002() throws JSONException, SQLException {
        createGroup = new CreateGroup();
        CreateGroupPayload createGroupPayload=new CreateGroupPayload();
        //Fetching random group to map to user
        String dbGroupQuery = "select label from groups  order by random() limit 1;";
        String dbGroupLabel = odinDs.executeSelectQuery(dbGroupQuery).getJSONObject(0).getString( "label");
        createGroup.setRequestBody(createGroupPayload.createExistingGroupPayload(dbGroupLabel));
        res = createGroup.callAPI();
        softAssert.assertEquals(res.getStatusCode(), 400, "Passed: API failed with status code : " + res.getStatusCode());
        softAssert.assertEquals(res.jsonPath().getString("errors[0].message"), "Group already exist with label "+dbGroupLabel, "Group label should be unique");
        softAssert.assertAll();
    }

    @Test(description = "Verify that a permission group for ODIN Admin can be created", groups = {"Sanity", "Odin","Regression"})
    public void C112902_CreateGroup_TC003() throws JSONException, SQLException {
        createGroup = new CreateGroup();
        CreateGroupPayload createGroupPayload=new CreateGroupPayload();
        String randomLabel = "AUTEST-"+RandomStringUtils.randomAlphabetic(6).toUpperCase();
        //Fetching random permission to add in group
        String dbPermissionQuery = "select id from permissions order by random() limit 1;";
        String dbGroupQuery = "select label from groups where label='"+randomLabel+"';";
        String dbPermissionId = odinDs.executeSelectQuery(dbPermissionQuery).getJSONObject(0).getString("id");
        String dbGroupName= odinDs.executeSelectQuery(dbGroupQuery).isNull(0)? "":odinDs.executeSelectQuery(dbGroupQuery).getJSONObject(0).getString( "label");
        createGroup.setRequestBody(createGroupPayload.createGroupPayload(randomLabel,dbPermissionId,"odin_admin"));
        res = createGroup.callAPI();
        //If Random Group label already exists in Database
        if (dbGroupName==randomLabel){
            softAssert.assertEquals(res.getStatusCode(), 400, "Passed: API failed with status code : " + res.getStatusCode());
            softAssert.assertEquals(res.jsonPath().getString("errors[0].message"), "Group already exist with label "+randomLabel, "Random Group label exists in Database");
            softAssert.assertAll();
        }else {
            softAssert.assertEquals(res.getStatusCode(), 200, "Passed: API passed with status code : " + res.getStatusCode());
            //Verifying if the group is added
            dbGroupName=odinDs.executeSelectQuery(dbGroupQuery).getJSONObject(0).getString("label");
            softAssert.assertEquals(dbGroupName,randomLabel, "Passed: Group Added to Db");
            softAssert.assertAll();
        }
    }
}
