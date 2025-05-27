package com.onemg.fulfillment.Payloads.OdinPayloads;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class AssignBatchOnQcPayload {
    public static String AssignBatchOnQcPayload(String BatchId, String batchUpdatedAt, String dbQtyFromSalesOrderItems) throws JSONException {
        JSONObject odinPayload = new JSONObject();
        JSONArray batchesObj = new JSONArray();
        JSONObject batchData = new JSONObject();
        batchData.put("batch_id", BatchId);
        batchData.put("pickup_updated_at",batchUpdatedAt);
        batchData.put("quantity", dbQtyFromSalesOrderItems);
        batchesObj.put(batchData);
        odinPayload.put("batches",batchesObj);
        return odinPayload.toString();
    }
}
