package com.onemg.fulfillment.api.OdinAdminAPIs;

import com.onemg.automation.core.AbstractAPI;
import com.onemg.automation.enums.ConfigHandler;
import com.onemg.automation.enums.HttpMethodType;
import com.onemg.automation.enums.MimeType;
import com.onemg.fulfillment.constants.ApisPath;

public class MapPermissionsToGroup extends AbstractAPI {
    public MapPermissionsToGroup() {
        super(MimeType.APPLICATION_JSON, "${base_url}"+ ApisPath.MapPermissionsToGroup, HttpMethodType.POST, true);
        replaceUrlPlaceholder("base_url", ConfigHandler.API.get("odinHostUrl"));
        replaceUrlPlaceholder("group_id",ConfigHandler.COMMON.get("odinAdminGroup"));
        setHeader("cookie","jwt="+ConfigHandler.COMMON.get("odinUserAuthorizationKey"));
        setHeader("referer",ConfigHandler.COMMON.get("odinAdminReferer"));
    }
}
