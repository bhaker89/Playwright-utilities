package com.onemg.fulfillment.Tests.APITests.OdinAdminTestScenarios;

import com.onemg.automation.enums.ConfigHandler;
import com.onemg.fulfillment.Payloads.OdinAdminPayloads.MapGroupToUserPayload;
import com.onemg.fulfillment.Tests.Base;
import com.onemg.fulfillment.api.OdinAdminAPIs.MapGroupToUser;
import io.restassured.response.Response;
import org.json.JSONException;
import org.testng.annotations.Test;
import java.sql.SQLException;

public class MapGroupToUserTests extends Base {
    MapGroupToUser MapGroupToUser;
    Response res;
    //
    @Test(description = "Verify that a group can be added on a user.", priority = 5,groups = {"Sanity", "Odin","Regression"})
    public void C112906_MapGroupToUser_TC001() throws JSONException, SQLException {
        MapGroupToUser = new MapGroupToUser();
        MapGroupToUserPayload mapGroupToUserPayload=new MapGroupToUserPayload();
        //Fetching random group to map to user
        String dbGroupQuery = "select id from groups  order by random() limit 1;";
        String dbGroupId = odinDs.executeSelectQuery(dbGroupQuery).getJSONObject(0).getString("id");
        MapGroupToUser.setRequestBody(mapGroupToUserPayload.addOnlyGroupToUserPayload(dbGroupId));
        res = MapGroupToUser.callAPI();
        softAssert.assertEquals(res.getStatusCode(), 200, "Passed: API passed with status code : " + res.getStatusCode());
        softAssert.assertEquals(res.getBody().jsonPath().getString("data.message"),"Groups updated successfully","Message validated");
        //Veryfying if the group is added in the user
        String dbUserGroupQuery = "select group_id from group_users  where user_id ="+ ConfigHandler.COMMON.get("odinAdminUser")+" and status='active' and group_id="+dbGroupId+"; ";
        String dbUserGroup = odinDs.executeSelectQuery(dbUserGroupQuery).getJSONObject(0).getString( "group_id");
        softAssert.assertEquals(dbUserGroup, dbGroupId, "Passed: Group mapped to user and active - " + dbUserGroup);
        softAssert.assertAll();
    }

    @Test(description = "Verify that user should be able to add or delete groups for a user.", groups = {"Sanity", "Odin","Regression"})
    public void C112761_MapGroupToUser_TC002() throws JSONException, SQLException {
        MapGroupToUser = new MapGroupToUser();
        MapGroupToUserPayload mapGroupToUserPayload=new MapGroupToUserPayload();
        String dbUserGroupQuery = "select group_id from group_users  where user_id ="+ ConfigHandler.COMMON.get("odinAdminUser")+" and status='active'; ";
        String dbUserGroup = odinDs.executeSelectQuery(dbUserGroupQuery).getJSONObject(0).getString("group_id");
        //Fetching random group to map to user
        String dbGroupQuery = "select id from groups  order by random() limit 1;";
        String dbGroupId = odinDs.executeSelectQuery(dbGroupQuery).getJSONObject(0).getString("id");
        MapGroupToUser.setRequestBody(mapGroupToUserPayload.mapGroupToUserPayload(dbGroupId,dbUserGroup));
        res = MapGroupToUser.callAPI();

        //If Db and Random value fetch same value
        if (dbGroupId==dbUserGroup){
            softAssert.assertEquals(res.getStatusCode(), 422, "Passed: API failed with status code : " + res.getStatusCode());
            softAssert.assertEquals(res.jsonPath().getString("errors[0].message"), "Common Ids not allowed: "+dbGroupId, "Common Ids not allowed");
            softAssert.assertAll();
        }else {
            softAssert.assertEquals(res.getStatusCode(), 200, "Passed: API passed with status code : " + res.getStatusCode());
            softAssert.assertEquals(res.getBody().jsonPath().getString("data.message"), "Groups updated successfully", "Message Validated");
            //Veryfying if the group is added in the user
            dbUserGroupQuery = "select group_id from group_users  where user_id ="+ ConfigHandler.COMMON.get("odinAdminUser")+" and status='active' and group_id="+dbGroupId+"; ";
            dbUserGroup = odinDs.executeSelectQuery(dbUserGroupQuery).getJSONObject(0).getString("group_id");
            softAssert.assertEquals(dbUserGroup, dbGroupId, "Passed: Group mapped to user and active - " + dbUserGroup);

            //Veryfying if the group is removed from the user
            if(dbUserGroup=="") {
                dbUserGroupQuery = "select group_id from group_users  where user_id =" + ConfigHandler.COMMON.get("odinAdminUser") + " and status='inactive' and group_id=" + dbUserGroup + "; ";
                String newdbUserGroup = odinDs.executeSelectQuery(dbUserGroupQuery).getJSONObject(0).getString("group_id");
                softAssert.assertEquals(dbUserGroup, newdbUserGroup, "Passed: Group removed from user and inactive - " + dbUserGroup);
            }
            softAssert.assertAll();

        }

    }

    @Test(description = "Verify that an existing group can be removed from a user.", priority = 6,groups = {"Sanity", "Odin","Regression"})
    public void C112907_MapGroupToUser_TC003() throws JSONException, SQLException {
        MapGroupToUser = new MapGroupToUser();
        MapGroupToUserPayload mapGroupToUserPayload=new MapGroupToUserPayload();
        String dbUserGroupQuery = "select group_id from group_users  where user_id ="+ ConfigHandler.COMMON.get("odinAdminUser")+" and status='active'; ";
        String dbUserGroup = odinDs.executeSelectQuery(dbUserGroupQuery).getJSONObject(0).getString("group_id");
        MapGroupToUser.setRequestBody(mapGroupToUserPayload.removeOnlyGroupToUserPayload(dbUserGroup));
        res = MapGroupToUser.callAPI();
        softAssert.assertEquals(res.getStatusCode(), 200, "Passed: API passed with status code : " + res.getStatusCode());
        softAssert.assertEquals(res.getBody().jsonPath().getString("data.message"), "Groups updated successfully", "Message Validated");
        //Veryfying if the group is removed from the user
        dbUserGroupQuery = "select group_id from group_users  where user_id ="+ ConfigHandler.COMMON.get("odinAdminUser")+" and status='inactive' and group_id="+dbUserGroup+"; ";
        String newdbUserGroup = odinDs.executeSelectQuery(dbUserGroupQuery).getJSONObject(0).getString("group_id");
        softAssert.assertEquals(dbUserGroup, newdbUserGroup, "Passed: Group removed from user and inactive - " + dbUserGroup);
        softAssert.assertAll();

    }

}