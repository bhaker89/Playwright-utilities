package com.onemg.fulfillment.Payloads.OdinAdminPayloads;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class MapGroupToUserPayload {
    public static String mapGroupToUserPayload(String add_id,String remove_id) throws JSONException {
        JSONObject mapGroupToUserPayload = new JSONObject();
        JSONArray remove_ids = new JSONArray();
        JSONArray add_ids = new JSONArray();
        add_ids.put(add_id);
        remove_ids.put(remove_id);
        mapGroupToUserPayload.put("remove_ids",remove_ids);
        mapGroupToUserPayload.put("add_ids",add_ids);
        return mapGroupToUserPayload.toString();
    }
    public static String addOnlyGroupToUserPayload(String add_id) throws JSONException {
        JSONObject mapGroupToUserPayload = new JSONObject();
        JSONArray remove_ids = new JSONArray();
        JSONArray add_ids = new JSONArray();
        add_ids.put(add_id);
        mapGroupToUserPayload.put("remove_ids",remove_ids);
        mapGroupToUserPayload.put("add_ids",add_ids);
        return mapGroupToUserPayload.toString();
    }
    public static String removeOnlyGroupToUserPayload(String remove_id) throws JSONException {
        JSONObject mapGroupToUserPayload = new JSONObject();
        JSONArray remove_ids = new JSONArray();
        JSONArray add_ids = new JSONArray();
        remove_ids.put(remove_id);
        mapGroupToUserPayload.put("remove_ids",remove_ids);
        mapGroupToUserPayload.put("add_ids",add_ids);
        return mapGroupToUserPayload.toString();
    }
}
