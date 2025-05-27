package com.onemg.fulfillment.Payloads.OdinMaterialManagementPayloads;

import org.json.JSONException;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Random;

public class CreatePackagingMaterialPayload {
    //Payload for new packaging material
    public static String createPackagingMaterialPayload() throws JSONException {
        JSONObject odinPayload = new JSONObject();
        JSONObject packaging_material = new JSONObject();
        int serialNo = new Random().nextInt(900) + 100;
        String date = new SimpleDateFormat("dd-MM-yyyy").format(new Date());
        packaging_material.put("name", serialNo+" Hard Box "+date);
        packaging_material.put("breadth", "100");
        packaging_material.put("height", "100");
        packaging_material.put("length", "100");
        int randomBarcode = new Random().nextInt(9000000) + 1000000;
        packaging_material.put("barcode", randomBarcode);
        odinPayload.put("packaging_material",packaging_material);
        return odinPayload.toString();
    }
    //Payload for packaging material with existing barcode
    public static String createPackagingMaterialPayload(String barcode) throws JSONException {
        JSONObject odinPayload = new JSONObject();
        JSONObject packaging_material = new JSONObject();
        String date = new SimpleDateFormat("_dd_MM_yyyy").format(new Date());
        packaging_material.put("name", "Hard Box"+date);
        packaging_material.put("breadth", "100");
        packaging_material.put("height", "100");
        packaging_material.put("length", "100");
        packaging_material.put("barcode", barcode);
        odinPayload.put("packaging_material",packaging_material);
        return odinPayload.toString();
    }
}
