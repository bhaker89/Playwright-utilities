package com.onemg.fulfillment.Tests.APITests.OdinAdminTestScenarios;

import com.onemg.automation.enums.ConfigHandler;
import com.onemg.fulfillment.Payloads.OdinAdminPayloads.MapPermissionsToGroupPayload;
import com.onemg.fulfillment.Tests.Base;
import com.onemg.fulfillment.api.OdinAdminAPIs.MapPermissionsToGroup;
import io.restassured.response.Response;
import org.json.JSONException;
import org.testng.annotations.Test;

import java.sql.SQLException;

public class MapPermissionsToGroupTests extends Base {
    MapPermissionsToGroup mapPermissionsToGroup;
    Response res;
    //Verify that a permission can be added to a group
    @Test(description = "Verify that a permission can be added to a group", priority = 1,groups = {"Sanity", "Odin","Regression"})
    public void C112915_MapPermissionsToGroup_TC001() throws JSONException, SQLException {
        mapPermissionsToGroup = new MapPermissionsToGroup();
        MapPermissionsToGroupPayload mapPermissionsToGroupPayload=new MapPermissionsToGroupPayload();
        //Fetching random permission to map to group
        String dbPermissionQuery = "select id from permissions order by random() limit 1;";
        String dbPermissionId = odinDs.executeSelectQuery(dbPermissionQuery).getJSONObject(0).getString("id");
        mapPermissionsToGroup.setRequestBody(mapPermissionsToGroupPayload.addOnlyPermissionToGroupPayload(dbPermissionId));
        res = mapPermissionsToGroup.callAPI();
        softAssert.assertEquals(res.getStatusCode(), 200, "Passed: API passed with status code : " + res.getStatusCode());
        softAssert.assertEquals(res.getBody().jsonPath().getString("data.message"),"Permissions updated successfully","Message validated");
        //Verifying if the permission is added to the group
        String dbGroupPermissionQuery = "select permission_id from group_permissions  where group_id ="+ ConfigHandler.COMMON.get("odinAdminGroup")+" and status='active' and permission_id="+dbPermissionId+"; ";
        String dbPermissionGroup = odinDs.executeSelectQuery(dbGroupPermissionQuery).getJSONObject(0).getString("permission_id");
        softAssert.assertEquals(dbPermissionId, dbPermissionGroup, "Passed: Permission mapped to group and active");
        softAssert.assertAll();
    }

    @Test(description = "Verify that add and remove permissions can occur together.", groups = {"Sanity", "Odin","Regression"})
    public void C112916_MapPermissionsToGroup_TC002() throws JSONException, SQLException {
        mapPermissionsToGroup = new MapPermissionsToGroup();
        MapPermissionsToGroupPayload mapPermissionsToGroupPayload=new MapPermissionsToGroupPayload();
        String dbSubPermissionQuery = "select permission_id from group_permissions  where group_id ="+ ConfigHandler.COMMON.get("odinAdminGroup")+" and status='active';";
        String dbSubPermissionId = odinDs.executeSelectQuery(dbSubPermissionQuery).getJSONObject(0).getString("permission_id");
        //Fetching random group to map to user
        String dbAddPermissionQuery = "select id from permissions  order by random() limit 1;";
        String dbAddPermissionId = odinDs.executeSelectQuery(dbAddPermissionQuery).getJSONObject(0).getString("id");
        mapPermissionsToGroup.setRequestBody(mapPermissionsToGroupPayload.mapPermissionsToGroupPayload(dbAddPermissionId,dbSubPermissionId));
        res = mapPermissionsToGroup.callAPI();

        //If Db and Random value fetch same value
        if (dbAddPermissionId==dbSubPermissionId){
            softAssert.assertEquals(res.getStatusCode(), 422, "Passed: API failed with status code : " + res.getStatusCode());
            softAssert.assertEquals(res.jsonPath().getString("errors[0].message"), "Common Ids not allowed: "+dbSubPermissionId, "Common Ids not allowed");
            softAssert.assertAll();
        }else {
            softAssert.assertEquals(res.getStatusCode(), 200, "Passed: API passed with status code : " + res.getStatusCode());
            softAssert.assertEquals(res.getBody().jsonPath().getString("data.message"), "Permissions updated successfully", "Message Validated");
            //Veryfying if the permission is added in the group
            dbAddPermissionQuery = "select permission_id from group_permissions  where group_id ="+ ConfigHandler.COMMON.get("odinAdminGroup")+" and status='active' and permission_id="+dbAddPermissionId+"; ";
            String dbaddNewPermission = odinDs.executeSelectQuery(dbAddPermissionQuery).getJSONObject(0).getString("permission_id");
            softAssert.assertEquals(dbAddPermissionId, dbaddNewPermission, "Passed: Group mapped to user and active");
            //Veryfying if the permission is removed from the group
            dbSubPermissionQuery = "select permission_id from group_permissions  where group_id =" + ConfigHandler.COMMON.get("odinAdminGroup") + " and status='inactive' and permission_id=" + dbSubPermissionId + "; ";
            String dbSubNewPermission = odinDs.executeSelectQuery(dbSubPermissionQuery).getJSONObject(0).getString("permission_id");
            softAssert.assertEquals(dbSubPermissionId, dbSubNewPermission, "Passed: Permission removed from group and inactive");
            softAssert.assertAll();
        }

    }

    @Test(description = "Verify that an existing permission can be removed from a user.", priority = 2,groups = {"Sanity", "Odin","Regression"})
    public void C112917_MapPermissionsToGroup_TC003() throws JSONException, SQLException {
        mapPermissionsToGroup = new MapPermissionsToGroup();
        MapPermissionsToGroupPayload mapPermissionsToGroupPayload=new MapPermissionsToGroupPayload();
        String dbSubPermissionQuery = "select permission_id from group_permissions  where group_id ="+ ConfigHandler.COMMON.get("odinAdminGroup")+" and status='active';";
        String dbSubPermissionId = odinDs.executeSelectQuery(dbSubPermissionQuery).getJSONObject(0).getString("permission_id");
        mapPermissionsToGroup.setRequestBody(mapPermissionsToGroupPayload.removeOnlyPermissionToGroupPayload(dbSubPermissionId));
        res = mapPermissionsToGroup.callAPI();
        softAssert.assertEquals(res.getStatusCode(), 200, "Passed: API passed with status code : " + res.getStatusCode());
        softAssert.assertEquals(res.getBody().jsonPath().getString("data.message"), "Permissions updated successfully", "Message Validated");
        //Verifying if the permission is removed from the user
        dbSubPermissionQuery = "select permission_id from group_permissions  where group_id =" + ConfigHandler.COMMON.get("odinAdminGroup") + " and status='inactive' and permission_id=" + dbSubPermissionId + "; ";
        String dbSubNewPermission = odinDs.executeSelectQuery(dbSubPermissionQuery).getJSONObject(0).getString("permission_id");
        softAssert.assertEquals(dbSubPermissionId, dbSubNewPermission, "Passed: Permission removed from group and inactive");
        softAssert.assertAll();
    }
}
