package com.onemg.fulfillment.Payloads.OdinPayloads;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class MoveOrderFromQcToPackingPayload {
    public static String moveOrderFromQcToPackingPayload(String lockId)throws JSONException {
        JSONObject moveSoToQC = new JSONObject();
        moveSoToQC.put("lock_id",lockId);
        return moveSoToQC.toString();
    }
}