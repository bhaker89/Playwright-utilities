package com.onemg.fulfillment.Payloads.OdinPayloads;

import org.json.JSONException;
import org.json.JSONObject;

public class CreateMapSkuToLocationPayload {
    public static String mapSkuToLocationPayload(String locationId,String skuId) throws JSONException {
        JSONObject odinPayload = new JSONObject();
        odinPayload.put("location_id", locationId);
        odinPayload.put("sku_id", skuId);
        return odinPayload.toString();
    }

    public static String mapSkuToAlreadyMappedLocationPayload(String locationId,String skuId) throws JSONException {
        JSONObject odinPayload = new JSONObject();
        odinPayload.put("location_id", locationId);
        odinPayload.put("sku_id", skuId);
        return odinPayload.toString();
    }
}
