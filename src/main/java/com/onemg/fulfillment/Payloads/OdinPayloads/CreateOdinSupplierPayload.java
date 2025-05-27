package com.onemg.fulfillment.Payloads.OdinPayloads;

import com.onemg.automation.enums.ConfigHandler;
import com.onemg.fulfillment.Tests.Base;
import org.apache.commons.lang.RandomStringUtils;
import org.json.JSONException;
import org.json.JSONObject;
import java.util.*;

public class CreateOdinSupplierPayload extends Base {

    private String randomUserNameString = RandomStringUtils.random(8,true,false).toUpperCase();
    public String randomSupplierName = "AutoSup " + randomUserNameString;
    private String randomUserEmail = randomSupplierName.replaceAll("\\s+","") + "@gmail.com";
    private String newPanNumber = RandomStringUtils.random(10,true,true);
    /* There is a new validation that PAN should exists in GST number hence have use PAN in GST, for further reference below if the GST format breakout
    Actual GST Format breakout = 2 char State Code + 10 chars PAN of Firm + 13th digit for Entity Code + last two as Check Digits*/
    private String newGstNumber = "06"+ newPanNumber +RandomStringUtils.random(3,true,true).toUpperCase();
    private String newBeneficiartName ="BF"+RandomStringUtils.random(10,true,false).toUpperCase();
    private String newWlNumber ="WL"+RandomStringUtils.random(13,true,true).toUpperCase();
    private String newRlNumber = "RL"+RandomStringUtils.random(13,true,true).toUpperCase();
    private String newPhoneNumer = RandomStringUtils.randomNumeric(10);
    private String newSupplierBankAccountNumber = RandomStringUtils.random(14,false,true).toUpperCase();
    private String newBankMSMENumber = "MSME"+RandomStringUtils.random(12,true,true).toUpperCase();
    private final String supplierBankName = "Kotak Bank";
    private final String supplierBankIFSC = "KKBK260001";
    private final HashMap<String, String> supplierPaymentDueDateFrom = new HashMap<>(); /* Setting up a hashmap for fixed payment due from field*/

    public String createNewOdinSupplier(String supplierType, String supplierStockType, String supplierPaymentType,
                                        Boolean isCompliance, String paymentDueParam ) throws JSONException {
        /* function accepts supplier type, stock type, payment mode and compliant respectively qs parameters */

        supplierPaymentDueDateFrom.put("invoice","invoice_date");
        supplierPaymentDueDateFrom.put("delivery","delivery_date");
        supplierPaymentDueDateFrom.put("grn","grn_date");
        JSONObject supplierObj = new JSONObject(); /* Creating external b2b_client payload */
        JSONObject addressObj = new JSONObject();   /* creating internal address object for b2b client */
        addressObj.put("street_1","H. No 700");
        addressObj.put("street_2","St. No. 12");
        addressObj.put("locality","Sector 7");
        addressObj.put("city","Gurugram");
        addressObj.put("state","Haryana");
        addressObj.put("country",ConfigHandler.COMMON.get("country"));
        addressObj.put("pincode",ConfigHandler.COMMON.get("odinGurgaonPinCode"));
        supplierObj.put("name", randomSupplierName);
        supplierObj.put("payment_type", supplierPaymentType);
        supplierObj.put("gst_number", newGstNumber);
        supplierObj.put("wholesale_license", newWlNumber);
        supplierObj.put("retail_license", newRlNumber);
        supplierObj.put("address", addressObj);
        supplierObj.put("poc_name", randomSupplierName);
        supplierObj.put("email", randomUserEmail);
        supplierObj.put("phone_number", newPhoneNumer);
        supplierObj.put("credit_period", "20");
        supplierObj.put("supply_type", supplierType);
        supplierObj.put("status", ConfigHandler.COMMON.get("activeStatus"));
        supplierObj.put("stock_type", supplierStockType);
        supplierObj.put("payment_due_from",supplierPaymentDueDateFrom.get(paymentDueParam));
        supplierObj.put("pan", newPanNumber);
        supplierObj.put("beneficiary_name", newBeneficiartName);
        supplierObj.put("bank_account_number", newSupplierBankAccountNumber);
        supplierObj.put("ifsc_code", supplierBankIFSC);
        supplierObj.put("bank_name", supplierBankName);
        supplierObj.put("msme_registration_number", newBankMSMENumber);
        supplierObj.put("compliant", isCompliance);
        return supplierObj.toString();
    }
}