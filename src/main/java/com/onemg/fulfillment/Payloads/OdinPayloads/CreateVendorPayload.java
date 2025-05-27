package com.onemg.fulfillment.Payloads.OdinPayloads;

import com.onemg.automation.enums.ConfigHandler;
import org.apache.commons.lang.RandomStringUtils;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class CreateVendorPayload {
    static String Lfc_randomVendorNameString = RandomStringUtils.random(12,true,false);
    public static String Lfc_randomVendorName =  Lfc_randomVendorNameString;
    private String Lfc_newPanNumber = RandomStringUtils.random(10,true,true).toUpperCase();
    private String Lfc_newGstNumber = "06"+Lfc_newPanNumber+"1ZW";
    static String Lfc_randomUserEmail = Lfc_randomVendorName + "@gmail.com";
    private String Lfc_newDLNumber ="DL"+RandomStringUtils.random(13,true,true).toUpperCase();
    private String Lfc_newFssianumber ="FS"+RandomStringUtils.random(10,true,true).toUpperCase();
    private String Lfc_vendor_reference_id = Lfc_randomVendorName;
    static String Fc_randomVendorNameString = RandomStringUtils.random(12,true,false);
    public static String Fc_randomVendorName =  Fc_randomVendorNameString;
    private String Fc_newPanNumber = RandomStringUtils.random(10,true,true).toUpperCase();
    private String Fc_newGstNumber = "06"+Fc_newPanNumber+"1ZW";
    static String Fc_randomUserEmail = Fc_randomVendorName + "@gmail.com";
    private String Fc_newDLNumber ="DL"+RandomStringUtils.random(13,true,true).toUpperCase();
    private String Fc_newFssianumber ="FS"+RandomStringUtils.random(10,true,true).toUpperCase();
    private String Fc_vendor_reference_id = Fc_randomVendorName;
    static String MP_randomVendorNameString = RandomStringUtils.random(12,true,false);
    public static String MP_randomVendorName =  MP_randomVendorNameString;
    private String MP_newPanNumber = RandomStringUtils.random(10,true,true).toUpperCase();
    private String MP_newGstNumber = "06"+MP_newPanNumber+"1ZW";
    static String MP_randomUserEmail = MP_randomVendorName + "@gmail.com";
    private String MP_newDLNumber ="DL"+RandomStringUtils.random(13,true,true).toUpperCase();
    private String MP_newFssianumber ="FS"+RandomStringUtils.random(10,true,true).toUpperCase();
    private String MP_vendor_reference_id = MP_randomVendorName;
    public String createNewWarehouseLfcVendorPayload() throws JSONException {
        JSONObject createGroupPayload = new JSONObject();
        JSONObject vendor=new JSONObject();

        JSONArray vendor_reference_ids = new JSONArray();
        vendor_reference_ids.put(Lfc_vendor_reference_id);

        JSONArray emails = new JSONArray();
        emails.put(Lfc_randomUserEmail);

        JSONObject address=new JSONObject();
        address.put("city","Gurugram");
        address.put("street_1","street 1");
        address.put("street_2","street 2");
        address.put("state","Haryana");
        address.put("country",ConfigHandler.COMMON.get("country"));
        address.put("pincode",ConfigHandler.COMMON.get("odinGurgaonPinCode"));

        vendor.put("name",Lfc_randomVendorName);
        vendor.put("type","warehouse");
        vendor.put("sub_type","lfc");
        vendor.put("poc_name","abc");
        vendor.put("poc_number","1234567888");
        vendor.put("cin_number","87123123");
        vendor.put("gstin",Lfc_newGstNumber);
        vendor.put("drug_licence_number",Lfc_newDLNumber);
        vendor.put("fssai_number",Lfc_newFssianumber);
        vendor.put("pan",Lfc_newPanNumber);
        vendor.put("emails",Lfc_randomUserEmail);
        vendor.put("vendor_reference_ids",Lfc_vendor_reference_id);
        vendor.put("address",address);
        createGroupPayload.put("vendor",vendor);
        return createGroupPayload.toString();
    }

    public String createNewWarehouseFcVendorPayload() throws JSONException {
        JSONObject createGroupPayload = new JSONObject();
        JSONObject vendor=new JSONObject();

        JSONArray vendor_reference_ids = new JSONArray();
        vendor_reference_ids.put(Fc_vendor_reference_id);

        JSONArray emails = new JSONArray();
        emails.put(Fc_randomUserEmail);

        JSONObject address=new JSONObject();
        address.put("city","Gurugram");
        address.put("street_1","street 1");
        address.put("street_2","street 2");
        address.put("state","Haryana");
        address.put("country",ConfigHandler.COMMON.get("country"));
        address.put("pincode",ConfigHandler.COMMON.get("odinGurgaonPinCode"));

        vendor.put("name",Fc_randomVendorName);
        vendor.put("type","warehouse");
        vendor.put("sub_type","fc");
        vendor.put("poc_name","abc");
        vendor.put("poc_number","1234567888");
        vendor.put("cin_number","87123123");
        vendor.put("gstin",Fc_newGstNumber);
        vendor.put("drug_licence_number",Fc_newDLNumber);
        vendor.put("fssai_number",Fc_newFssianumber);
        vendor.put("pan",Fc_newPanNumber);
        vendor.put("emails",emails);
        vendor.put("vendor_reference_ids",vendor_reference_ids);
        vendor.put("address",address);
        createGroupPayload.put("vendor",vendor);
        return createGroupPayload.toString();
    }

    public String createNewMarketplaceSellerPayload() throws JSONException {
        JSONObject createGroupPayload = new JSONObject();
        JSONObject vendor=new JSONObject();

        JSONArray vendor_reference_ids = new JSONArray();
        vendor_reference_ids.put(MP_vendor_reference_id);

        JSONArray emails = new JSONArray();
        emails.put(MP_randomUserEmail);

        JSONObject address=new JSONObject();
        address.put("city","Gurugram");
        address.put("street_1","street 1");
        address.put("street_2","street 2");
        address.put("state","Haryana");
        address.put("country",ConfigHandler.COMMON.get("country"));
        address.put("pincode",ConfigHandler.COMMON.get("odinGurgaonPinCode"));

        vendor.put("name",MP_randomVendorName);
        vendor.put("type","marketplace_seller");
        vendor.put("sub_type","pharmacy_partner");
        vendor.put("poc_name","abc");
        vendor.put("poc_number","1234567888");
        vendor.put("cin_number","87123123");
        vendor.put("gstin",MP_newGstNumber);
        vendor.put("drug_licence_number",MP_newDLNumber);
        vendor.put("fssai_number",MP_newFssianumber);
        vendor.put("pan",MP_newPanNumber);
        vendor.put("emails",emails);
        vendor.put("vendor_reference_ids",vendor_reference_ids);
        vendor.put("address",address);
        createGroupPayload.put("vendor",vendor);
        return createGroupPayload.toString();
    }

    public String createDuplicateVendorPayload() throws JSONException {
        JSONObject createGroupPayload = new JSONObject();
        JSONObject vendor=new JSONObject();

        JSONObject address=new JSONObject();
        address.put("city","gurugram");
        address.put("street_1","dfgxf");
        address.put("street_2","fgdxg");
        address.put("state","Haryana");
        address.put("country",ConfigHandler.COMMON.get("country"));
        address.put("pincode",ConfigHandler.COMMON.get("odinGurgaonPinCode"));

        vendor.put("name","6decMP");
        vendor.put("type","marketplace_seller");
        vendor.put("sub_type","pharmacy_partner");
        vendor.put("poc_name","abc");
        vendor.put("poc_number","1234567888");
        vendor.put("cin_number","87123123");
        vendor.put("gstin","06FGSDG78689321");
        vendor.put("drug_licence_number","dsfvsdg");
        vendor.put("fssai_number","dfd");
        vendor.put("pan","FGSDG78689");
        vendor.put("emails","wercsrfs43@gmail.com");
        vendor.put("vendor_reference_ids","dfsafq34");
        vendor.put("address",address);
        createGroupPayload.put("vendor",vendor);
        return createGroupPayload.toString();
    }
}
