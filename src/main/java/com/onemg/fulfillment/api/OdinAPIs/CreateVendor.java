package com.onemg.fulfillment.api.OdinAPIs;

import com.onemg.automation.core.AbstractAPI;
import com.onemg.automation.enums.ConfigHandler;
import com.onemg.automation.enums.HttpMethodType;
import com.onemg.automation.enums.MimeType;
import com.onemg.fulfillment.constants.ApisPath;

public class CreateVendor extends AbstractAPI {
    public CreateVendor(){
        super(MimeType.APPLICATION_JSON, "${base_url}"+ ApisPath.CreateVendor, HttpMethodType.POST, true);
        replaceUrlPlaceholder("base_url", ConfigHandler.API.get("odinHostUrl"));
        setHeader("cookie","jwt="+ConfigHandler.COMMON.get("odinUserAuthorizationKey"));
        setHeader("referer",ConfigHandler.COMMON.get("odinAdminReferer"));
    }
}
