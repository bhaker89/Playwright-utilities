package com.onemg.fulfillment.api.OdinAdminAPIs;

import com.onemg.automation.core.AbstractAPI;
import com.onemg.automation.enums.ConfigHandler;
import com.onemg.automation.enums.HttpMethodType;
import com.onemg.automation.enums.MimeType;
import com.onemg.fulfillment.constants.ApisPath;

public class MapGroupToUser extends AbstractAPI {
    public MapGroupToUser() {
        super(MimeType.APPLICATION_JSON, "${base_url}"+ ApisPath.MapGroupToUser, HttpMethodType.POST, true);
        replaceUrlPlaceholder("base_url", ConfigHandler.API.get("odinHostUrl"));
        replaceUrlPlaceholder("user_id",ConfigHandler.COMMON.get("odinAdminUser"));
        setHeader("cookie","jwt="+ConfigHandler.COMMON.get("odinUserAuthorizationKey"));
        setHeader("referer",ConfigHandler.COMMON.get("odinAdminReferer"));
    }
}

