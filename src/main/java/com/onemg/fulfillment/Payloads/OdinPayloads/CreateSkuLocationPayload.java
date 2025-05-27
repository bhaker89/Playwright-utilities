package com.onemg.fulfillment.Payloads.OdinPayloads;

import com.onemg.fulfillment.Tests.Base;
import org.apache.commons.lang.RandomStringUtils;
import org.json.JSONObject;
import org.json.JSONException;

import java.util.Random;

public class CreateSkuLocationPayload extends Base {
    public static String pickingSkuLocationPayload() throws JSONException {
        JSONObject odinPayload = new JSONObject();
        String randomRackString = RandomStringUtils.random(3,true,true).toUpperCase();
        odinPayload.put("rack", randomRackString);
        odinPayload.put("bin", "A1");
        String randomAisleString = RandomStringUtils.random(3,true,true).toUpperCase();
        odinPayload.put("aisle", randomAisleString);
        odinPayload.put("shelf", "B2");
        String randomPartitionString = RandomStringUtils.random(3,true,true).toUpperCase();
        odinPayload.put("partition", randomPartitionString);
        odinPayload.put("category", "picking");
        return odinPayload.toString();
    }
    public static String bulkSkuLocationPayload() throws JSONException {
        JSONObject odinPayload = new JSONObject();
        String randomRackString = RandomStringUtils.random(3,true,true).toUpperCase();
        odinPayload.put("rack", randomRackString);
        odinPayload.put("bin", "A1");
        String randomAisleString = RandomStringUtils.random(3,true,true).toUpperCase();
        odinPayload.put("aisle", randomAisleString);
        odinPayload.put("shelf", "B2");
        String randomPartitionString = RandomStringUtils.random(3,true,true).toUpperCase();
        odinPayload.put("partition", randomPartitionString);
        odinPayload.put("category", "bulk_store");
        return odinPayload.toString();
    }
    public static String nearExpirySkuLocationPayload() throws JSONException {
        JSONObject odinPayload = new JSONObject();
        String randomRackString = RandomStringUtils.random(3,true,true).toUpperCase();
        odinPayload.put("rack", randomRackString);
        odinPayload.put("bin", "A1");
        String randomAisleString = RandomStringUtils.random(3,true,true).toUpperCase();
        odinPayload.put("aisle", randomAisleString);
        odinPayload.put("shelf", "B2");
        String randomPartitionString = RandomStringUtils.random(3,true,true).toUpperCase();
        odinPayload.put("partition", randomPartitionString);
        odinPayload.put("category", "near_expiry");
        return odinPayload.toString();
    }
    public static String jitLocationPayload() throws JSONException {
        JSONObject odinPayload = new JSONObject();
        String randomRackString = RandomStringUtils.random(3,true,true).toUpperCase();
        odinPayload.put("rack", randomRackString);
        odinPayload.put("bin", "A1");
        String randomAisleString = RandomStringUtils.random(3,true,true).toUpperCase();
        odinPayload.put("aisle", randomAisleString);
        odinPayload.put("shelf", "B2");
        String randomPartitionString = RandomStringUtils.random(3,true,true).toUpperCase();
        odinPayload.put("partition", randomPartitionString);
        odinPayload.put("category", "jit_inventory");
        return odinPayload.toString();
    }
    public static String existingLocationPayload() throws JSONException {
        JSONObject odinPayload = new JSONObject();
        odinPayload.put("rack", "0O2");
        odinPayload.put("bin", "A");
        odinPayload.put("aisle", "QDP");
        odinPayload.put("shelf", "B");
        odinPayload.put("partition", "EOU");
        odinPayload.put("category", "picking");
        return odinPayload.toString();
    }
}
