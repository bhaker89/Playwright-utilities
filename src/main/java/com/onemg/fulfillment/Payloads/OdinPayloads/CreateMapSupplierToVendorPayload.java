package com.onemg.fulfillment.Payloads.OdinPayloads;

import org.json.JSONException;
import org.json.JSONObject;
import java.util.ArrayList;

public class CreateMapSupplierToVendorPayload {
    public static String mapSkuToLocationPayload(ArrayList<String> supplierIds) throws JSONException {
        JSONObject supplierContractPayload = new JSONObject();
        supplierContractPayload.put("supplier_ids", supplierIds);
        return supplierContractPayload.toString();
    }
}
