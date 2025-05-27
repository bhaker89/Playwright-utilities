package com.onemg.fulfillment.api.OdinAPIs;

import com.onemg.automation.core.AbstractAPI;
import com.onemg.automation.enums.ConfigHandler;
import com.onemg.automation.enums.HttpMethodType;
import com.onemg.automation.enums.MimeType;
import com.onemg.fulfillment.constants.ApisPath;

public class StartQualityCheck extends AbstractAPI {
    public StartQualityCheck(String orderId){
        super(MimeType.APPLICATION_JSON, "${base_url}"+ ApisPath.StartQualityCheck, HttpMethodType.POST, true);
        replaceUrlPlaceholder("base_url", ConfigHandler.API.get("odinHostUrl"));
        replaceUrlPlaceholder("order_id",orderId);
        setHeader("Authorization",ConfigHandler.COMMON.get("odinUserAuthorizationKey"));
    }
}
