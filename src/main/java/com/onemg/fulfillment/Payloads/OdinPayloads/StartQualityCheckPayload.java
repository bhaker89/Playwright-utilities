package com.onemg.fulfillment.Payloads.OdinPayloads;

import org.json.JSONException;
import org.json.JSONObject;

public class StartQualityCheckPayload {
    public static String StartQualityCheckPayload() throws JSONException {
        JSONObject odinPayload = new JSONObject();
        odinPayload.put("is_scanned", "false");
        return odinPayload.toString();
    }
}
