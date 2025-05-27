package com.onemg.fulfillment.utils;

import org.json.JSONObject;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;

public class GenerateJWT {

    public static String convertAuthTokenToJWT(String secretkey, String algoType, JSONObject payload, long expTimeMillis) {
        String SECRET = secretkey;
        String ALGORITHM = algoType;
        long ttlMillis=expTimeMillis;
        try {
            // header
            JSONObject header=new JSONObject();
            header.put("typ", "JWT");
            header.put("alg", ALGORITHM);
            String encodedHeader = Base64.getUrlEncoder().encodeToString(
                    header.toString().getBytes(StandardCharsets.UTF_8));

            //payload
            payload.put("exp", Instant.now().getEpochSecond() + ttlMillis);
            String encodedPayload = Base64.getUrlEncoder().encodeToString(
                    payload.toString().getBytes(StandardCharsets.UTF_8));

            // signature
            Mac sha256HMAC = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKey = new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            sha256HMAC.init(secretKey);
            byte[] signatureBytes = sha256HMAC.doFinal((encodedHeader + "." + encodedPayload).getBytes(StandardCharsets.UTF_8));
            String encodedSignature = Base64.getUrlEncoder().encodeToString(signatureBytes);

            // return JWT
            return encodedHeader + "." + encodedPayload + "." + encodedSignature;
        }
        catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}

