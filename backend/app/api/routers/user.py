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
