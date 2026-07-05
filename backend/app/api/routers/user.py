from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime
from app.database import supabase

router = APIRouter(prefix="/api/user", tags=["User"])

class UpgradeRequest(BaseModel):
    user_id: str
    amount: float = 99000

class UserSettingsUpdate(BaseModel):
    user_id: str
    custom_aspects: Optional[Dict[str, Any]] = None
    custom_sensitive_words: Optional[str] = None
    custom_threshold: Optional[float] = None
    use_custom_threshold: Optional[bool] = None
    alert_email: Optional[bool] = None
    weekly_report: Optional[bool] = None
    retention_days: Optional[int] = None

@router.put("/upgrade")
async def upgrade_to_vip(req: UpgradeRequest):
    try:
        update_res = (
            supabase
            .table('profiles')
            .update({'tier': 'vip'})
            .eq('id', req.user_id)
            .execute()
        )

        if not update_res.data:
            raise HTTPException(status_code=400, detail="Không tìm thấy người dùng.")

        transaction_data = {
            "user_id": req.user_id,
            "amount": req.amount,
            "status": "paid",
        }

        try:
            supabase.table('transactions').insert(transaction_data).execute()
        except Exception as transaction_error:
            print(f"⚠️ Không thể ghi giao dịch VIP: {transaction_error}")

        return {
            "status": "success",
            "message": "Nâng cấp VIP thành công!",
            "profile": update_res.data[0],
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/settings")
async def get_user_settings(user_id: str):
    try:
        res = supabase.table('user_settings').select('*').eq('user_id', user_id).execute()
        
        if not res.data or len(res.data) == 0:
            return {
                "user_id": user_id, 
                "custom_threshold": 50,
                "custom_sensitive_words": "",
                "custom_aspects": {},
                "alert_email": False,
                "weekly_report": True,
                "retention_days": 7
            }
            
        return res.data[0]
        
    except Exception as e:
        print(f"Lỗi API get_user_settings: {e}") 
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/settings")
async def update_user_settings(req: UserSettingsUpdate):
    try:
        update_data = {k: v for k, v in req.dict().items() if v is not None and k != "user_id"}
        update_data['updated_at'] = datetime.utcnow().isoformat()
        
        res = supabase.table('user_settings').upsert({**update_data, "user_id": req.user_id}).execute()
        
        return {"status": "success", "message": "Đã lưu cài đặt thành công!"}
    except Exception as e:
        print(f"Lỗi API update_user_settings: {e}") 
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/data/clear")
async def clear_user_data(user_id: str):
    try:
        res_reviews = supabase.table('scraped_reviews').delete().eq('user_id', user_id).execute()
        
        return {"status": "success", "message": "Toàn bộ dữ liệu phân tích đã được dọn dẹp vĩnh viễn."}
    
    except Exception as e:
        print(f"Lỗi API clear_user_data: {e}")
        raise HTTPException(status_code=500, detail="Không thể xóa dữ liệu. Vui lòng thử lại sau.")

# ============================================================
# THÊM CUỐI FILE backend/app/api/routers/user.py
# Không sửa các API cũ.
# ============================================================

def infer_dataset_type(source_url: str):
    source = str(source_url or "").lower()

    if source == "csv_upload":
        return "csv"
    if "foody" in source:
        return "foody"
    if "shopee" in source:
        return "shopee"
    return "url"


@router.get("/datasets")
async def get_user_datasets(user_id: str):
    try:
        res = (
            supabase
            .table("scraped_reviews")
            .select("dataset_id,dataset_name,dataset_type,source_url,created_at")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )

        rows = res.data or []
        groups = {}

        for row in rows:
            dataset_id = row.get("dataset_id")
            source_url = row.get("source_url") or "Không rõ nguồn"
            key = str(dataset_id) if dataset_id else source_url

            if key not in groups:
                groups[key] = {
                    "dataset_id": dataset_id,
                    "dataset_name": row.get("dataset_name") or source_url,
                    "dataset_type": row.get("dataset_type") or infer_dataset_type(source_url),
                    "source_url": source_url,
                    "total_reviews": 0,
                    "created_at": row.get("created_at"),
                }

            groups[key]["total_reviews"] += 1

        return {
            "status": "success",
            "data": list(groups.values()),
        }

    except Exception as e:
        print(f"Lỗi API get_user_datasets: {e}")
        raise HTTPException(status_code=500, detail="Không thể tải danh sách dữ liệu.")


@router.delete("/datasets/{dataset_id}")
async def delete_user_dataset(dataset_id: str, user_id: str):
    try:
        res = (
            supabase
            .table("scraped_reviews")
            .delete()
            .eq("user_id", user_id)
            .eq("dataset_id", dataset_id)
            .execute()
        )

        return {
            "status": "success",
            "message": "Đã xóa dữ liệu đã chọn.",
            "deleted": len(res.data or []),
        }

    except Exception as e:
        print(f"Lỗi API delete_user_dataset: {e}")
        raise HTTPException(status_code=500, detail="Không thể xóa dữ liệu đã chọn.")


@router.delete("/datasets/by-source")
async def delete_user_dataset_by_source(user_id: str, source_url: str):
    try:
        res = (
            supabase
            .table("scraped_reviews")
            .delete()
            .eq("user_id", user_id)
            .eq("source_url", source_url)
            .execute()
        )

        return {
            "status": "success",
            "message": "Đã xóa dữ liệu theo nguồn đã chọn.",
            "deleted": len(res.data or []),
        }

    except Exception as e:
        print(f"Lỗi API delete_user_dataset_by_source: {e}")
        raise HTTPException(status_code=500, detail="Không thể xóa dữ liệu theo nguồn.")
