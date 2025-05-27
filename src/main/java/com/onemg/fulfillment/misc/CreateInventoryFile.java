package com.onemg.fulfillment.misc;

import com.onemg.automation.enums.ConfigHandler;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.*;

public class CreateInventoryFile {

    public static String getFilePath() {
        return filePath;
    }

    public static void setFilePath(String filePath) {
        CreateInventoryFile.filePath = filePath;
    }

    static String filePath=System.getProperty("user.dir")+"/src/main/resources/InventoryUpdate.txt";
    public void writeInventoryFile(String skuId,String availability,boolean stockable,int quantity) throws IOException, JSONException {
        JSONArray dataArray = new JSONArray();
        JSONObject inventoryDetails = new JSONObject();
        inventoryDetails.put("sku_id", skuId);
        inventoryDetails.put("vendor_id", Integer.valueOf(ConfigHandler.COMMON.get("vendorId")));
        inventoryDetails.put("availability", availability);
        inventoryDetails.put("vendor_discount_percent",1.0);
        inventoryDetails.put("stockable",stockable);
        inventoryDetails.put("quantity",quantity);
        inventoryDetails.put("price",50);
        inventoryDetails.put("rapid_delivery", true);
        dataArray.put(inventoryDetails);
        FileWriter  file = new FileWriter( filePath);
        file.write(dataArray.toString());
        file.flush();

    }
}
