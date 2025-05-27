package com.onemg.fulfillment.Payloads.OdinPayloads;

import org.json.JSONException;
import org.json.JSONObject;

public class AdjustInventoryOnInventoryMasterPayload {
    public static String PositiveAdjustInventoryPayload(Integer dbSkuIdFromInventories, String dbOnemgSkuIdFromSkus,String dbSkuNameFromSkus,String dbBatchNameFromBatches,String dbLocationNameFromLocation) throws JSONException {
        JSONObject odinPayload = new JSONObject();
        JSONObject adjustment = new JSONObject();
        adjustment.put("action", "add");
        adjustment.put("quantity", "10");
        adjustment.put("reason", "available_in_location");
        adjustment.put("sku_id", dbSkuIdFromInventories);
        adjustment.put("onemg_sku_id", dbOnemgSkuIdFromSkus);
        adjustment.put("sku_name", dbSkuNameFromSkus);
        adjustment.put("batch_name", dbBatchNameFromBatches);
        adjustment.put("location_category", "picking");
        adjustment.put("location_name", dbLocationNameFromLocation);
        odinPayload.put("adjustment",adjustment);
        return odinPayload.toString();
    }

    public static String NegativeAdjustInventoryPayload(Integer dbSkuIdFromInventories, String dbOnemgSkuIdFromSkus,String dbSkuNameFromSkus,String dbBatchNameFromBatches,String dbLocationNameFromLocation) throws JSONException {
        JSONObject odinPayload = new JSONObject();
        JSONObject adjustment = new JSONObject();
        adjustment.put("action", "subtract");
        adjustment.put("quantity", "2");
        adjustment.put("reason", "damaged");
        adjustment.put("sku_id", dbSkuIdFromInventories);
        adjustment.put("onemg_sku_id", dbOnemgSkuIdFromSkus);
        adjustment.put("sku_name", dbSkuNameFromSkus);
        adjustment.put("batch_name", dbBatchNameFromBatches);
        adjustment.put("location_category", "picking");
        adjustment.put("location_name", dbLocationNameFromLocation);
        odinPayload.put("adjustment",adjustment);
        return odinPayload.toString();
    }
}
