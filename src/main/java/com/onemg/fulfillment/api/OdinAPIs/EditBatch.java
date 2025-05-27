package com.onemg.fulfillment.api.OdinAPIs;

import com.onemg.automation.core.AbstractAPI;
import com.onemg.automation.enums.ConfigHandler;
import com.onemg.automation.enums.HttpMethodType;
import com.onemg.automation.enums.MimeType;
import com.onemg.fulfillment.constants.ApisPath;

public class EditBatch extends AbstractAPI {

    public EditBatch() {
        super(MimeType.APPLICATION_JSON, "${base_url}"+ ApisPath.EditBatch, HttpMethodType.PUT, true);
        replaceUrlPlaceholder("base_url", ConfigHandler.API.get("odinHostUrl"));
        replaceUrlPlaceholder("batch_id",ConfigHandler.COMMON.get("batchId"));
        setHeader("Authorization",ConfigHandler.COMMON.get("odinUserAuthorizationKey"));
    }
}
