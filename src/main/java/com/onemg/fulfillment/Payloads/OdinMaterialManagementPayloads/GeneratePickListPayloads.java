package com.onemg.fulfillment.Payloads.OdinMaterialManagementPayloads;

import com.onemg.automation.enums.ConfigHandler;
import com.onemg.fulfillment.Tests.Base;
import org.json.JSONException;
import org.json.JSONObject;
import java.util.*;

public class GeneratePickListPayloads {
    static String digital = "false";

    public static String GeneratePickListPayloads(String odinSalesOrderId) throws JSONException{

        JSONObject PickListPayload = new JSONObject();
        PickListPayload.put("picker_name", ConfigHandler.COMMON.get("pickerName"));
        PickListPayload.put("picker_id", ConfigHandler.COMMON.get("pickerID"));
        PickListPayload.put("digital", digital);
        PickListPayload.put("ids", odinSalesOrderId);
        return PickListPayload.toString();
    }
}
