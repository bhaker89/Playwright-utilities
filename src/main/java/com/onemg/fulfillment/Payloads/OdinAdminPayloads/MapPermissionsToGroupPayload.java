package com.onemg.fulfillment.Payloads.OdinAdminPayloads;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class MapPermissionsToGroupPayload {
    public static String mapPermissionsToGroupPayload(String add_id,String remove_id) throws JSONException {
        JSONObject mapPermissionsToGroupPayload = new JSONObject();
        JSONArray remove_ids = new JSONArray();
        JSONArray add_ids = new JSONArray();
        add_ids.put(add_id);
        remove_ids.put(remove_id);
        mapPermissionsToGroupPayload.put("remove_ids",remove_ids);
        mapPermissionsToGroupPayload.put("add_ids",add_ids);
        return mapPermissionsToGroupPayload.toString();
    }
    public static String addOnlyPermissionToGroupPayload(String add_id) throws JSONException {
        JSONObject mapPermissionsToGroupPayload = new JSONObject();
        JSONArray remove_ids = new JSONArray();
        JSONArray add_ids = new JSONArray();
        add_ids.put(add_id);
        mapPermissionsToGroupPayload.put("remove_ids",remove_ids);
        mapPermissionsToGroupPayload.put("add_ids",add_ids);
        return mapPermissionsToGroupPayload.toString();
    }
    public static String removeOnlyPermissionToGroupPayload(String remove_id) throws JSONException {
        JSONObject mapPermissionsToGroupPayload = new JSONObject();
        JSONArray remove_ids = new JSONArray();
        JSONArray add_ids = new JSONArray();
        remove_ids.put(remove_id);
        mapPermissionsToGroupPayload.put("remove_ids",remove_ids);
        mapPermissionsToGroupPayload.put("add_ids",add_ids);
        return mapPermissionsToGroupPayload.toString();
    }
}
