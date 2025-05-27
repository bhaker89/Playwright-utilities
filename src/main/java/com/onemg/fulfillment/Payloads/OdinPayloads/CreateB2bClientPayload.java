package com.onemg.fulfillment.Payloads.OdinPayloads;

import com.onemg.automation.enums.ConfigHandler;
import com.onemg.fulfillment.Tests.Base;
import org.apache.commons.lang.RandomStringUtils;
import org.json.JSONException;
import org.json.JSONObject;
import java.sql.SQLException;
import java.util.Random;

public class CreateB2bClientPayload extends Base {

    private String randomUserNameString = RandomStringUtils.random(8,true,false);
    public String randomUserName = "Auto_B2b_" + randomUserNameString;
    private String randomUserEmail = randomUserName + "@gmail.com";
    private String newGstNumber = "06T"+RandomStringUtils.random(12,true,true).toUpperCase();
    private String newDoctorRegisterationNumber ="DR"+RandomStringUtils.random(10,true,true).toUpperCase();
    private String newWlNumber ="WL"+RandomStringUtils.random(13,true,true).toUpperCase();
    private String newRlNumber = "RL"+RandomStringUtils.random(13,true,true).toUpperCase();
    private String newPhoneNumer = RandomStringUtils.randomNumeric(10);
    public static String vendorToMap; /* Warehouse vendor to be mapped */

    private static String getWarehouseId(boolean isWarehouseIdAvailable, String warehouseId) throws SQLException {
        int map_vendor_id = 332;
        String update_vendor_mapping = "update vendor_mappings set status = 'inactive' where vendor_id =" + map_vendor_id + " and entity_type = 'B2bClient';";
        if (isWarehouseIdAvailable){
            map_vendor_id = Integer.parseInt(warehouseId); //390
            update_vendor_mapping = "update vendor_mappings set status = 'inactive' where vendor_id =" + map_vendor_id + " and entity_type = 'B2bClient';";
            odinDs.executeUpdate(update_vendor_mapping);
            return warehouseId;}
        else {
            odinDs.executeUpdate(update_vendor_mapping);
            return String.valueOf(map_vendor_id);
        }
    }

    public String createNewB2bClient(String b2bClientTypeParam, boolean warehouseIdAvailable, String warehouseId) throws JSONException, SQLException {
        /* function accepts b2b client type in first param, checks if hardcoded warehouse id is available in second param,
         if second param is true, warehouseId will be placed inside warehouse_id key else warehouseId will be taken from DB*/
        JSONObject payload = new JSONObject();
        JSONObject b2bClientObj = new JSONObject(); /* Creating external b2b_client payload */
        JSONObject addressObj = new JSONObject();   /* creating internal address object for b2b client */
        addressObj.put("street_1","H. No 700");
        addressObj.put("street_2","St. No. 12");
        addressObj.put("locality","Sector 7");
        addressObj.put("city","Gurugram");
        addressObj.put("state","Haryana");
        addressObj.put("country",ConfigHandler.COMMON.get("country"));
        addressObj.put("pincode",ConfigHandler.COMMON.get("odinGurgaonPinCode"));
        b2bClientObj.put("name", randomUserName);
        b2bClientObj.put("payment_type", "credit");
        b2bClientObj.put("gst_number", newGstNumber);
        b2bClientObj.put("wholesale_license", newWlNumber);
        b2bClientObj.put("retail_license", newRlNumber);
        b2bClientObj.put("address", addressObj);
        b2bClientObj.put("poc_name", randomUserName);
        b2bClientObj.put("email", randomUserEmail);
        b2bClientObj.put("phone_number", newPhoneNumer);
        b2bClientObj.put("credit_period", "10");

        vendorToMap = getWarehouseId(warehouseIdAvailable,warehouseId);
        /* Conditional key values for the payload body depending on the basis of client type */
        switch(b2bClientTypeParam) {
            case "doctor":
                b2bClientObj.put("client_type", b2bClientTypeParam);
                b2bClientObj.put("onemg_warehouse_id", JSONObject.NULL);
                b2bClientObj.put("registration_number", newDoctorRegisterationNumber);
                b2bClientObj.put("gst_number", JSONObject.NULL);
                b2bClientObj.put("wholesale_license", JSONObject.NULL);
                b2bClientObj.put("retail_license", JSONObject.NULL);
                break;
            case "1mg_retail_store":
                b2bClientObj.put("client_type", b2bClientTypeParam);
                b2bClientObj.put("onemg_warehouse_id", JSONObject.NULL);
                b2bClientObj.put("registration_number", JSONObject.NULL);
                b2bClientObj.put("gst_number", newGstNumber);
                b2bClientObj.put("wholesale_license", newWlNumber);
                b2bClientObj.put("retail_license", newRlNumber);
                break;
            case "1mg_warehouse":
                b2bClientObj.put("client_type", b2bClientTypeParam);
                b2bClientObj.put("onemg_warehouse_id", vendorToMap);/**/
                b2bClientObj.put("registration_number", JSONObject.NULL);
                b2bClientObj.put("gst_number", newGstNumber);
                b2bClientObj.put("wholesale_license", newWlNumber);
                b2bClientObj.put("retail_license", newRlNumber);
                break;
            default:
                /*By Default retailer client will be created.*/
                b2bClientObj.put("client_type", "retailer");
                b2bClientObj.put("onemg_warehouse_id", JSONObject.NULL);
                b2bClientObj.put("registration_number", JSONObject.NULL);
                b2bClientObj.put("gst_number", newGstNumber);
                b2bClientObj.put("wholesale_license", newWlNumber);
                b2bClientObj.put("retail_license", newRlNumber);
        }
        b2bClientObj.put("margin", JSONObject.NULL);
        b2bClientObj.put("margin_type", JSONObject.NULL);
        payload.put("b2b_client",b2bClientObj);
        return payload.toString();
    }
}