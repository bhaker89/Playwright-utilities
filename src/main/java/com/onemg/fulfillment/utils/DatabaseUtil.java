package com.onemg.fulfillment.utils;

import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.Map;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import com.onemg.automation.enums.ConfigHandler;
import com.onemg.automation.enums.DBType;
import com.onemg.automation.util.sql.DBBase;
import com.onemg.automation.util.sql.DBConfig;
import com.onemg.automation.util.sql.SQLManager;

public class DatabaseUtil {
    private static DBBase inventoryDB = null;

    public static DBBase getInventoryDbInstance() throws Exception {
        if (null == inventoryDB) {
            DBConfig inventoryDbConfig = new DBConfig(
                    DBType.PGSQL,
                    ConfigHandler.DATABASE.get("inventory.host"),
                    ConfigHandler.DATABASE.get("inventory.port"),
                    ConfigHandler.DATABASE.get("inventory.username"),
                    ConfigHandler.DATABASE.get("inventory.password"),
                    ConfigHandler.DATABASE.get("inventory.schema")
            );
            inventoryDB = SQLManager.getInstance().getDatabase(inventoryDbConfig);
        }
        return inventoryDB;
    }

    public static void closeDBConnections() {
        if (null != inventoryDB ) {
            inventoryDB.closeDbConnection();
        }
    }
    
    public static JSONArray getResultInJsonArray(ResultSet rs) throws SQLException, JSONException {
    	JSONArray rows = new JSONArray();
    	
    	ResultSetMetaData md = rs.getMetaData();
    	int columns = md.getColumnCount();
    	while (rs.next()){
    		JSONObject row = new JSONObject();
            for(int i = 1; i <= columns; ++i){
                row.put(md.getColumnName(i), rs.getObject(i));
            }
            rows.put(row);
        }
		return rows;
    	
    }
    
    public static JSONObject getResultInJsonObject(ResultSet rs) throws SQLException, JSONException {
    	ResultSetMetaData md = rs.getMetaData();
    	int columns = md.getColumnCount();
    		JSONObject row = new JSONObject();
    		if (rs.next()) {
    			for(int i = 1; i <= columns; ++i){
                    row.put(md.getColumnName(i), rs.getObject(i));
                }
    		}
            
    	return row;
    }

}
