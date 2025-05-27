package com.onemg.fulfillment.api.OdinAPIs;

import com.onemg.automation.core.AbstractAPI;
import com.onemg.automation.enums.ConfigHandler;
import com.onemg.automation.enums.HttpMethodType;
import com.onemg.automation.enums.MimeType;
import com.onemg.fulfillment.constants.ApisPath;

public class CreateB2CClient extends AbstractAPI {
    public CreateB2CClient(){
        super(MimeType.APPLICATION_JSON, "${base_url}"+ ApisPath.CreateB2CClient, HttpMethodType.POST, true);
        replaceUrlPlaceholder("base_url", ConfigHandler.API.get("odinHostUrl"));
        setHeader("Authorization",ConfigHandler.COMMON.get("odinUserAuthorizationKey"));
    }
}
