package com.onemg.fulfillment.Tests.APITests;

import com.onemg.fulfillment.Payloads.OdinPayloads.MoveSoToQCPayload;
import com.onemg.fulfillment.Tests.Base;
import com.onemg.fulfillment.api.OdinAPIs.MoveSoToQC;
import io.restassured.response.Response;
import org.json.JSONException;

import java.sql.SQLException;

public class UtilSalesOrderFlowMethods extends Base {

    public void moveSoToQC(String odinSalesOrderId) throws JSONException {
        MoveSoToQC moveSoToQC=new MoveSoToQC();
        moveSoToQC.setRequestBody(MoveSoToQCPayload.moveSoToQCPayload(odinSalesOrderId));
        Response response = moveSoToQC.callAPI();
    }
}
