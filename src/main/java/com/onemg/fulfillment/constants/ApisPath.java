package com.onemg.fulfillment.constants;

import com.onemg.fulfillment.api.OdinAPIs.MoveOrderFromQcToPacking;

public class ApisPath {
    public static final String AdjustInventoryOnInventoryMaster="/api/v1/adjustments",// POST
            CreateB2bClient="/api/v1/b2b_clients", // POST
            CreateB2CClient="/api/v1/b2c_clients", // POST
            CreateSkuLocation="/api/v1/locations", // POST
            CreateGroup="/auth/v1/groups", // POST
            ChangeOdinUserCurrentVendor="/api/v1/users/change_vendor", // POST
            CreateOdinUser="/auth/v1/users", // POST
            CreateOdinSupplier="/api/v1/suppliers", // POST
            CreatePackagingMaterial="/api/v1/packaging_materials", // POST
            CreateBasket="/api/v1/baskets", // POST
            EditBatch="/api/v1/batches/${batch_id}", // PUT
            GetSkuDataFromInventoryPool="/api/v1/inventory_pools?include=sku&page=1&per_page=25&onemg_sku_id=${onemg_sku_id}", //GET
            MapGroupToUser="/auth/v1/users/${user_id}/manage_groups", // POST
            MapPermissionsToGroup="/auth/v1/groups/${group_id}/manage_permissions", // POST
            MapSkuToLocation="/api/v1/sku_locations", // POST
            MapSupplierToVendor="/api/v1/suppliers/add_contract", // POST
            CreateVendor="/auth/v1/vendors", // POST
            StartQualityCheck="/api/v1/sales_orders/${order_id}/start_quality_check", // POST
            AssignBatchOnQc="/api/v1/sales_orders/${order_id}/sales_order_items/${so_item_id}/package", // PUT
            MoveSoToQC="/api/v1/sales_orders/mark_quality_check", // PUT
            AssignOrdersForPicking="/api/v1/sales_orders/assign_orders",// POST
            GeneratePickList="/api/v1/sales_orders/generate_picklist", // POST
            MoveOrderFromQcToPacking="/api/v1/sales_orders/${order_id}/mark_packing"; // POST
}