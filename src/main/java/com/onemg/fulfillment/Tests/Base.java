package com.onemg.fulfillment.Tests;

import com.onemg.automation.assertions.CustomSoftAssert;
import com.onemg.automation.enums.ConfigHandler;
import com.onemg.automation.util.sql.DBBase;
import com.onemg.common.dbutils.OdinDBUtils;
import com.onemg.common.functions.fulfillment.OFOdinIntegration;
import com.onemg.fulfillment.utils.DatabaseUtil;
import org.testng.annotations.AfterSuite;
import org.testng.annotations.BeforeMethod;
import org.testng.annotations.BeforeSuite;


public abstract class Base {
    protected CustomSoftAssert softAssert;
    protected static DBBase odinDs;
    @BeforeSuite(alwaysRun = true)
    public void preSuite() throws Exception {
        odinDs = OdinDBUtils.getInstance().getDb();
        setJWTTokenInPropertyFile();
    }

    @BeforeMethod
    public void beforeMethod(){
        softAssert = new CustomSoftAssert();
    }

    @AfterSuite(alwaysRun = true)
    public void postSuite() throws Exception {
        DatabaseUtil.closeDBConnections();
        OdinDBUtils.getInstance().closeDBConnections();
    }

    /* Generates the JWT token for the APIs for odin and odin admin and sets up the value in common property file*/
    private void setJWTTokenInPropertyFile() throws Exception {
        ConfigHandler.COMMON.put("odinUserAuthorizationKey",OFOdinIntegration.setJWTToken());
    }
}
