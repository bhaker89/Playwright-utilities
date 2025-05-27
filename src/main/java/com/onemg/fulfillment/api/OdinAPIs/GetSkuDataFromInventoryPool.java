package com.onemg.fulfillment.api.OdinAPIs;
import com.onemg.automation.core.AbstractAPI;
import com.onemg.automation.enums.ConfigHandler;
import com.onemg.automation.enums.HttpMethodType;
import com.onemg.automation.enums.MimeType;
import com.onemg.fulfillment.constants.ApisPath;

public class GetSkuDataFromInventoryPool extends AbstractAPI {
    public GetSkuDataFromInventoryPool(){
        super(MimeType.APPLICATION_JSON, "${base_url}"+ ApisPath.GetSkuDataFromInventoryPool, HttpMethodType.GET, true);
        replaceUrlPlaceholder("base_url", ConfigHandler.API.get("odinHostUrl"));
        setHeader("Authorization",ConfigHandler.COMMON.get("odinUserAuthorizationKey"));
        replaceUrlPlaceholder("onemg_sku_id", ConfigHandler.COMMON.get("onemg_sku_id_odin"));
    }
}