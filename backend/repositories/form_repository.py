from sqlalchemy.orm import Session, contains_eager
from db.models import FormSubmission, FormTemplate, User
from schemas.form import FormSubmit
import json
from typing import List

class FormRepository:
    def create_submission(self, db: Session, *, form_in: FormSubmit, user_id: int) -> FormSubmission:
        db_obj = FormSubmission(
            template_id=form_in.template_id,
            datos_json=json.dumps(form_in.form_data),
            enviado_por_id=user_id
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def list_submissions(self, db: Session, *, skip: int = 0, limit: int = 100) -> List[FormSubmission]:
        return (
            db.query(FormSubmission)
            .join(User, FormSubmission.enviado_por_id == User.id)
            .outerjoin(FormTemplate, FormSubmission.template_id == FormTemplate.id)
            .options(
                contains_eager(FormSubmission.enviado_por),
                contains_eager(FormSubmission.template),
            )
            .order_by(FormSubmission.enviado_en.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

form_repository = FormRepository()
