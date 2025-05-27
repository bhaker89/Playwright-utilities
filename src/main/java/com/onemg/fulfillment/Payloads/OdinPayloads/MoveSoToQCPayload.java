package com.onemg.fulfillment.Payloads.OdinPayloads;

import com.onemg.automation.enums.ConfigHandler;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class MoveSoToQCPayload {
    public static String moveSoToQCPayload(String odinSalesOrderId)throws JSONException {
        JSONObject moveSoToQC = new JSONObject();
        JSONArray sales_order_ids=new JSONArray();
        sales_order_ids.put(odinSalesOrderId);
        moveSoToQC.put("sales_order_ids",sales_order_ids);
        return moveSoToQC.toString();
    }
}
