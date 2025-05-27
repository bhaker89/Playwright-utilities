package com.onemg.fulfillment.api.OdinAPIs;
import com.onemg.automation.core.AbstractAPI;
import com.onemg.automation.enums.ConfigHandler;
import com.onemg.automation.enums.HttpMethodType;
import com.onemg.automation.enums.MimeType;
import com.onemg.fulfillment.constants.ApisPath;

public class MapSkuToLocation extends AbstractAPI {
    public MapSkuToLocation(){
        super(MimeType.APPLICATION_JSON, "${base_url}"+ ApisPath.MapSkuToLocation, HttpMethodType.POST, true);
        replaceUrlPlaceholder("base_url", ConfigHandler.API.get("odinHostUrl"));
        setHeader("Authorization",ConfigHandler.COMMON.get("odinUserAuthorizationKey"));
    }
}
