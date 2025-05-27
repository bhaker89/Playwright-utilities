package com.onemg.fulfillment.Payloads.OdinAdminPayloads;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
public class CreateGroupPayload {
    public static String createGroupPayload(String name,String permissionId,String teamName) throws JSONException {
        JSONObject createGroupPayload = new JSONObject();
        JSONObject group=new JSONObject();
        group.put("label",name);
        group.put("description",name);
        group.put("team_name",teamName);
        JSONArray remove_ids = new JSONArray();
        JSONArray add_ids = new JSONArray();
        add_ids.put(permissionId);
        createGroupPayload.put("group",group);
        createGroupPayload.put("remove_ids",remove_ids);
        createGroupPayload.put("add_ids",add_ids);
        return createGroupPayload.toString();
    }
    public static String createExistingGroupPayload(String groupLabel) throws JSONException {
        JSONObject createGroupPayload = new JSONObject();
        JSONObject group=new JSONObject();
        group.put("label",groupLabel);
        group.put("description","Random Group");
        group.put("team_name","odin");
        JSONArray remove_ids = new JSONArray();
        JSONArray add_ids = new JSONArray();
        add_ids.put("10");
        add_ids.put("11");
        createGroupPayload.put("group",group);
        createGroupPayload.put("remove_ids",remove_ids);
        createGroupPayload.put("add_ids",add_ids);
        return createGroupPayload.toString();
    }
}
