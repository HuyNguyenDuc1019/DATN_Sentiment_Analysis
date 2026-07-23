from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime
import uuid

from app.database import supabase

router = APIRouter(prefix="/api/user", tags=["User"])


class UserSettingsUpdate(BaseModel):
    user_id: str
    custom_aspects: Optional[Dict[str, Any]] = None
    custom_sensitive_words: Optional[str] = None
    custom_threshold: Optional[float] = None
    use_custom_threshold: Optional[bool] = None
    alert_email: Optional[bool] = None
    weekly_report: Optional[bool] = None
    retention_days: Optional[int] = None
    feedback_confidence_threshold: Optional[float] = None


@router.get("/settings")
async def get_user_settings(user_id: str):
    """
    Lấy thông tin cài đặt cá nhân của người dùng (như ngưỡng tin cậy custom, từ điển tự định nghĩa, số ngày lưu trữ, v.v.).
    Nếu chưa có trong DB, trả về một cấu hình mặc định.
    """
    try:
        res = (
            supabase
            .table("user_settings")
            .select("*")
            .eq("user_id", user_id)
            .execute()
        )

        if not res.data or len(res.data) == 0:
            return {
                "user_id": user_id,
                "custom_threshold": 50,
                "custom_sensitive_words": "",
                "custom_aspects": {},
                "alert_email": False,
                "weekly_report": True,
                "retention_days": 7,
                "feedback_confidence_threshold": 70,
            }

        return res.data[0]

    except Exception as e:
        print(f"Lỗi API get_user_settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/settings")
async def update_user_settings(req: UserSettingsUpdate):
    """
    Cập nhật thông tin cài đặt cá nhân của người dùng.
    Dữ liệu được lưu vào bảng 'user_settings' trên Supabase.
    Xác thực các giá trị kiểu số phải nằm trong khoảng hợp lệ.
    """
    try:
        update_data = {
            k: v
            for k, v in req.dict().items()
            if v is not None and k != "user_id"
        }

        integer_fields = (
            "custom_threshold",
            "feedback_confidence_threshold",
            "retention_days",
        )

        for field_name in integer_fields:
            if field_name not in update_data:
                continue

            numeric_value = float(update_data[field_name])

            if field_name != "retention_days" and not 0 <= numeric_value <= 100:
                raise HTTPException(
                    status_code=400,
                    detail=f"{field_name} must be between 0 and 100.",
                )

            if field_name == "retention_days" and numeric_value < 1:
                raise HTTPException(
                    status_code=400,
                    detail="retention_days must be at least 1.",
                )

            update_data[field_name] = int(round(numeric_value))

        update_data["updated_at"] = datetime.utcnow().isoformat()

        supabase.table("user_settings").upsert({
            **update_data,
            "user_id": req.user_id,
        }).execute()

        return {
            "status": "success",
            "message": "Đã lưu cài đặt thành công!",
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Lỗi API update_user_settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/datasets")
async def get_user_datasets(user_id: str):
    """
    Lấy danh sách các bộ dữ liệu (dataset) đã cào và phân tích của người dùng.
    Nhóm các bình luận lại theo dataset_id hoặc source_url để đếm tổng số lượng review, 
    số review tích cực/tiêu cực, và độ tin cậy trung bình của mỗi dataset.
    """
    try:
        res = (
            supabase
            .table("scraped_reviews")
            .select(
                "id, user_id, dataset_id, dataset_name, dataset_type, "
                "source_url, created_at, ai_label, confidence"
            )
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(1000)
            .execute()
        )

        rows = res.data or []
        grouped = {}

        for row in rows:
            dataset_id = row.get("dataset_id") or row.get("source_url") or row.get("id")
            dataset_name = row.get("dataset_name") or row.get("source_url") or "Dữ liệu đã phân tích"
            dataset_type = row.get("dataset_type") or "reviews"

            item = grouped.setdefault(dataset_id, {
                "id": dataset_id,
                "dataset_id": dataset_id,
                "name": dataset_name,
                "dataset_name": dataset_name,
                "type": dataset_type,
                "dataset_type": dataset_type,
                "source_url": row.get("source_url"),
                "review_count": 0,
                "total_reviews": 0,
                "positive_count": 0,
                "negative_count": 0,
                "avg_confidence": 0,
                "created_at": row.get("created_at"),
                "latest_at": row.get("created_at"),
            })

            item["review_count"] += 1
            item["total_reviews"] += 1

            label = row.get("ai_label")

            if label in [1, "1", "positive", "POSITIVE", "tích cực"]:
                item["positive_count"] += 1
            elif label in [0, "0", "negative", "NEGATIVE", "tiêu cực"]:
                item["negative_count"] += 1

            try:
                item["avg_confidence"] += float(row.get("confidence") or 0)
            except Exception:
                item["avg_confidence"] += 0

            if row.get("created_at") and str(row.get("created_at")) > str(item.get("latest_at") or ""):
                item["latest_at"] = row.get("created_at")

        data = []

        for item in grouped.values():
            count = item["review_count"] or 1
            item["avg_confidence"] = round(item["avg_confidence"] / count, 2)
            data.append(item)

        return {
            "status": "success",
            "data": data,
        }

    except Exception as e:
        print(f"Lỗi API get_user_datasets: {e}")
        raise HTTPException(status_code=500, detail="Không thể tải dữ liệu đã phân tích.")


@router.delete("/datasets/remove")
async def delete_user_dataset(
    dataset_id: str = Query(..., description="Tên, URL hoặc ID của dataset"),
    user_id: str = Query(..., description="ID của user"),
):
    """
    Xóa một dataset cụ thể của người dùng.
    Tìm kiếm dataset dựa trên source_url, dataset_name hoặc dataset_id.
    Sau khi tìm thấy, xóa toàn bộ feedback liên quan và sau đó xóa các bản ghi scraped_reviews.
    Sử dụng Batch Processing để tránh lỗi quá tải URL của Supabase.
    """
    try:
        if not user_id:
            raise HTTPException(status_code=400, detail="Thiếu user_id.")

        if not dataset_id:
            raise HTTPException(status_code=400, detail="Thiếu dataset_id.")

        dataset_key = dataset_id.strip()

        if not dataset_key:
            raise HTTPException(status_code=400, detail="Thiếu dataset_id hợp lệ.")

        rows = []

        # 1. Tìm theo source_url
        try:
            res_url = (
                supabase
                .table("scraped_reviews")
                .select("id")
                .eq("user_id", user_id)
                .eq("source_url", dataset_key)
                .execute()
            )
            rows.extend(res_url.data or [])
        except Exception as url_error:
            print(f"Không tìm được theo source_url: {url_error}")

        # 2. Tìm theo dataset_name
        try:
            res_name = (
                supabase
                .table("scraped_reviews")
                .select("id")
                .eq("user_id", user_id)
                .eq("dataset_name", dataset_key)
                .execute()
            )
            rows.extend(res_name.data or [])
        except Exception as name_error:
            print(f"Không tìm được theo dataset_name: {name_error}")

        # 3. Tìm theo dataset_id (UUID)
        try:
            uuid.UUID(dataset_key) # Kiểm tra xem có phải UUID hợp lệ không
            res_dataset_id = (
                supabase
                .table("scraped_reviews")
                .select("id")
                .eq("user_id", user_id)
                .eq("dataset_id", dataset_key)
                .execute()
            )
            rows.extend(res_dataset_id.data or [])
        except ValueError:
            pass # Nếu không phải UUID thì bỏ qua
        except Exception as dataset_error:
            print(f"Không tìm được theo dataset_id: {dataset_error}")

        # 4. Trích xuất danh sách ID duy nhất cần xóa
        review_ids = list({
            row.get("id")
            for row in rows
            if row.get("id")
        })

        # Nếu không có gì để xóa, trả về luôn
        if not review_ids:
            return {
                "status": "success",
                "message": "Không tìm thấy dữ liệu cần xóa.",
                "deleted_count": 0,
            }

        # 5. XÓA DỮ LIỆU THEO LÔ (BATCH PROCESSING)
        # Chia nhỏ danh sách review_ids thành từng cụm 150 ID để tránh lỗi giới hạn URL của Supabase
        batch_size = 150
        for i in range(0, len(review_ids), batch_size):
            batch_ids = review_ids[i : i + batch_size]

            # Xóa bảng con (feedback_data) trước để tránh lỗi khóa ngoại
            (
                supabase
                .table("feedback_data")
                .delete()
                .in_("scraped_review_id", batch_ids)
                .execute()
            )

            # Xóa bảng cha (scraped_reviews) sau
            (
                supabase
                .table("scraped_reviews")
                .delete()
                .in_("id", batch_ids)
                .execute()
            )

        return {
            "status": "success",
            "message": "Đã xóa dữ liệu đã chọn thành công.",
            "deleted_count": len(review_ids),
        }

    except HTTPException:
        raise

    except Exception as e:
        print(f"Lỗi API delete_user_dataset: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Không thể xóa dữ liệu đã chọn: {str(e)}"
        )

@router.delete("/data/clear")
async def clear_user_data(user_id: str):
    """
    Xóa toàn bộ dữ liệu (tất cả dataset và feedback) của một người dùng.
    Thường được gọi khi người dùng muốn reset tài khoản hoặc xóa tài khoản.
    """
    try:
        if not user_id:
            raise HTTPException(status_code=400, detail="Thiếu user_id.")

        # Xóa bảng con trước để không vi phạm
        # feedback_data_scraped_review_id_fkey.
        (
            supabase
            .table("feedback_data")
            .delete()
            .eq("user_id", user_id)
            .execute()
        )

        delete_res = (
            supabase
            .table("scraped_reviews")
            .delete()
            .eq("user_id", user_id)
            .execute()
        )

        return {
            "status": "success",
            "message": "Đã xóa toàn bộ dữ liệu thành công.",
            "deleted_count": len(delete_res.data or []),
        }

    except HTTPException:
        raise

    except Exception as e:
        print(f"Lỗi API clear_user_data: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Không thể xóa toàn bộ dữ liệu: {str(e)}"
        )
