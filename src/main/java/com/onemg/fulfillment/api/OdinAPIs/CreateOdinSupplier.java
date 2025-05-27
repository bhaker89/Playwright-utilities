package com.onemg.fulfillment.api.OdinAPIs;

import com.onemg.automation.core.AbstractAPI;
import com.onemg.automation.enums.ConfigHandler;
import com.onemg.automation.enums.HttpMethodType;
import com.onemg.automation.enums.MimeType;
import com.onemg.fulfillment.constants.ApisPath;

public class CreateOdinSupplier extends AbstractAPI {
    public CreateOdinSupplier(){
        super(MimeType.APPLICATION_JSON, "${base_url}"+ ApisPath.CreateOdinSupplier, HttpMethodType.POST, true);
        replaceUrlPlaceholder("base_url", ConfigHandler.API.get("odinHostUrl"));
        setHeader("Authorization",ConfigHandler.COMMON.get("odinUserAuthorizationKey"));
    }
}