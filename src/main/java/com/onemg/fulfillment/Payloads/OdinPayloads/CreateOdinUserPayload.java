package com.onemg.fulfillment.Payloads.OdinPayloads;

import java.util.ArrayList;
import org.apache.commons.lang.RandomStringUtils;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import com.onemg.automation.enums.ConfigHandler;

public class CreateOdinUserPayload {
    static String odinExistingUserEmail="mayankv1mg@gmail.com";
    static String odinExistingUserName="Mayank1";
    static String randomUserNameString = RandomStringUtils.random(12,true,false);
    public static String randomUserName = "Auto " + randomUserNameString;
    static String randomUserEmail = randomUserNameString + "@gmail.com";

    public static String createNewOdinUserPayload() throws JSONException {
        JSONObject user = new JSONObject(); // Creating inside payload
        JSONObject payload = new JSONObject(); // creating main user payload
        user.put("name", randomUserName);
        user.put("email", randomUserEmail);
        user.put("vendor_id", ConfigHandler.COMMON.get("odinVendorId")); //Giving common vendor id 9 from common properties
        payload.put("user",user);
        return payload.toString();
    }

    public static String createExistingOdinUserPayload() throws JSONException {
        JSONObject user = new JSONObject(); // Creating inside payload
        JSONObject payload = new JSONObject(); // creating main user payload
        user.put("name", odinExistingUserName);
        user.put("email", odinExistingUserEmail);
        user.put("vendor_id", ConfigHandler.COMMON.get("odinVendorId")); //Giving common vendor id 9 from common properties
        payload.put("user",user);
        return payload.toString();
    }

}
