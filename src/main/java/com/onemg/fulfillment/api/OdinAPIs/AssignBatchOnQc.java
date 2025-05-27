package com.onemg.fulfillment.api.OdinAPIs;

import com.onemg.automation.core.AbstractAPI;
import com.onemg.automation.enums.ConfigHandler;
import com.onemg.automation.enums.HttpMethodType;
import com.onemg.automation.enums.MimeType;
import com.onemg.fulfillment.constants.ApisPath;

public class AssignBatchOnQc extends AbstractAPI {
    public AssignBatchOnQc(String salesOrderId,String soItemId){
        super(MimeType.APPLICATION_JSON, "${base_url}"+ ApisPath.AssignBatchOnQc, HttpMethodType.PUT, true);
        replaceUrlPlaceholder("base_url", ConfigHandler.API.get("odinHostUrl"));
        replaceUrlPlaceholder("order_id",salesOrderId);
        replaceUrlPlaceholder("so_item_id",soItemId);
        setHeader("Authorization",ConfigHandler.COMMON.get("odinUserAuthorizationKey"));
    }
}
