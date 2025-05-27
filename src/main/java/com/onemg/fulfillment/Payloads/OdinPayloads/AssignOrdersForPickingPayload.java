package com.onemg.fulfillment.Payloads.OdinPayloads;

import com.onemg.automation.enums.ConfigHandler;
import org.json.JSONException;
import org.json.JSONObject;

public class AssignOrdersForPickingPayload{
    public static String AssignOrdersForPickingPayload(String sourceOrderId) throws JSONException{
    JSONObject AssignOrders = new JSONObject();
    JSONObject sales_order = new JSONObject();
    sales_order.put("source_order_ids",sourceOrderId);
    JSONObject job = new JSONObject();
    job.put("type",  "picklist_generate");
    sales_order.put("job", job);
    String[] status = {"picking", "picklist_generated"};
    sales_order.put("status", status);
    sales_order.put("rapid", false);
    AssignOrders.putOpt("sales_order", sales_order);
        return AssignOrders.toString();
    }
}
