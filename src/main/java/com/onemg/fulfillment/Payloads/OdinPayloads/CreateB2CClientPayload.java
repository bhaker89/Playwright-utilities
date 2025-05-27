package com.onemg.fulfillment.Payloads.OdinPayloads;

import org.apache.commons.lang3.RandomStringUtils;
import org.json.JSONException;
import org.json.JSONObject;

public class CreateB2CClientPayload {

    public static String createB2CClientPayload(String name) throws JSONException {
        JSONObject address = new JSONObject(); // creating inside b2c_client payload
        JSONObject b2c_client = new JSONObject(); // Creating inside payload
        JSONObject payload = new JSONObject(); // creating main user payload
        b2c_client.put("name", name);
        b2c_client.put("payment_type", "cash");
        b2c_client.put("email", RandomStringUtils.randomAlphanumeric(6)+"@email.com");
        b2c_client.put("phone_number",RandomStringUtils.randomNumeric(10));
        b2c_client.put("address",address);
        address.put("street_1",RandomStringUtils.randomAlphanumeric(6));
        address.put("street_2",RandomStringUtils.randomAlphanumeric(6));
        address.put("locality",RandomStringUtils.randomAlphabetic(6));
        address.put("city",RandomStringUtils.randomAlphabetic(6));
        address.put("state","Delhi");
        address.put("country","India");
        address.put("pincode","110034");
        payload.put("b2c_client",b2c_client);
        return payload.toString();
    }
}
