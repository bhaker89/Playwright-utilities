package com.onemg.fulfillment.Payloads.OdinPayloads;

import org.json.JSONException;
import org.json.JSONObject;

public class EditBatchPayload {

    public static String editBatchPayload(String id,String newExpiry,String newHSN,String MRP)throws JSONException {

        JSONObject editBatchPayload = new JSONObject();
        editBatchPayload.put("mrp",MRP);
        editBatchPayload.put("expiry_date",newExpiry);
        editBatchPayload.put("hsn_code",newHSN);
        editBatchPayload.put("id",id);
        return editBatchPayload.toString();
    }
}
