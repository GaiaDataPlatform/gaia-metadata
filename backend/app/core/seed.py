from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..models.user import User, UserRole
from ..models.instrument import InstrumentCategory, OperationTemplate, TaskType
from .auth import get_password_hash

SEED_INSTRUMENTS = [
    {
        "name": "CTD",
        "display_name": "CTD / Rosette",
        "task_type": TaskType.point,
        "color": "#0077B6",
        "icon": "anchor",
        "sort_order": 1,
        "extra_fields": [
            {"name": "max_depth_m", "label": "Max depth (m)", "type": "number", "required": False, "unit": "m"},
            {"name": "cast_number", "label": "Cast #", "type": "number", "required": False}
        ],
        "operations": [
            {"name": "START_CAST", "display_name": "Cast start", "sort_order": 1, "is_final": False,
             "extra_fields": [{"name": "depth_target_m", "label": "Target depth (m)", "type": "number", "required": False}]},
            {"name": "MAX_DEPTH", "display_name": "Maximum depth", "sort_order": 2, "is_final": False,
             "extra_fields": [{"name": "depth_reached_m", "label": "Depth reached (m)", "type": "number", "required": True}]},
            {"name": "END_CAST", "display_name": "Cast end", "sort_order": 3, "is_final": True, "extra_fields": None},
        ]
    },
    {
        "name": "MBES",
        "display_name": "Multibeam (MBES)",
        "task_type": TaskType.transect,
        "color": "#0096C7",
        "icon": "waves",
        "sort_order": 2,
        "extra_fields": [
            {"name": "frequency_khz", "label": "Frequency (kHz)", "type": "number", "required": False, "unit": "kHz"},
            {"name": "swath_angle_deg", "label": "Swath angle (°)", "type": "number", "required": False, "unit": "°"},
            {"name": "system", "label": "System (EM2040/EM712/EM304)", "type": "text", "required": False}
        ],
        "operations": [
            {"name": "START_LINE", "display_name": "Line start", "sort_order": 1, "is_final": False,
             "extra_fields": [{"name": "line_id", "label": "Line ID", "type": "text", "required": False}]},
            {"name": "END_LINE", "display_name": "Line end", "sort_order": 2, "is_final": True, "extra_fields": None},
        ]
    },
    {
        "name": "ADCP",
        "display_name": "ADCP (VM-ADCP)",
        "task_type": TaskType.transect,
        "color": "#00B4D8",
        "icon": "activity",
        "sort_order": 3,
        "extra_fields": [
            {"name": "instrument", "label": "Instrument (OS45/WH300)", "type": "text", "required": False}
        ],
        "operations": [
            {"name": "START_TRANSECT", "display_name": "Transect start", "sort_order": 1, "is_final": False, "extra_fields": None},
            {"name": "END_TRANSECT", "display_name": "Transect end", "sort_order": 2, "is_final": True, "extra_fields": None},
        ]
    },
    {
        "name": "ROV",
        "display_name": "ROV",
        "task_type": TaskType.point,
        "color": "#48CAE4",
        "icon": "cpu",
        "sort_order": 4,
        "extra_fields": [
            {"name": "dive_number", "label": "Dive #", "type": "number", "required": False},
            {"name": "max_depth_m", "label": "Max depth (m)", "type": "number", "required": False, "unit": "m"}
        ],
        "operations": [
            {"name": "IN_WATER", "display_name": "ROV in water", "sort_order": 1, "is_final": False, "extra_fields": None},
            {"name": "ON_BOTTOM", "display_name": "ROV on bottom", "sort_order": 2, "is_final": False,
             "extra_fields": [{"name": "depth_m", "label": "Bottom depth (m)", "type": "number", "required": False}]},
            {"name": "OFF_BOTTOM", "display_name": "ROV off bottom", "sort_order": 3, "is_final": False, "extra_fields": None},
            {"name": "ON_DECK", "display_name": "ROV on deck", "sort_order": 4, "is_final": True, "extra_fields": None},
        ]
    },
    {
        "name": "DRIFTER",
        "display_name": "Drifter / Argo Float",
        "task_type": TaskType.point,
        "color": "#90E0EF",
        "icon": "navigation",
        "sort_order": 5,
        "extra_fields": [
            {"name": "serial_number", "label": "Serial number", "type": "text", "required": False},
            {"name": "program", "label": "Program", "type": "text", "required": False}
        ],
        "operations": [
            {"name": "DEPLOY", "display_name": "Deployment", "sort_order": 1, "is_final": True, "extra_fields": None},
        ]
    },
    {
        "name": "FERRYBOX",
        "display_name": "FerryBox",
        "task_type": TaskType.transect,
        "color": "#ADE8F4",
        "icon": "droplet",
        "sort_order": 6,
        "extra_fields": [],
        "operations": [
            {"name": "START_ACQUISITION", "display_name": "Acquisition start", "sort_order": 1, "is_final": False, "extra_fields": None},
            {"name": "STOP_ACQUISITION", "display_name": "Acquisition end", "sort_order": 2, "is_final": True, "extra_fields": None},
        ]
    },
]

async def seed_database(db: AsyncSession):
    result = await db.execute(select(User).where(User.username == "admin"))
    if not result.scalar_one_or_none():
        admin = User(
            username="admin",
            email="admin@gaiablu.cnr.it",
            hashed_password=get_password_hash("gaiaadmin"),
            full_name="Administrator",
            role=UserRole.admin,
            is_active=True
        )
        db.add(admin)
        print("[seed] Created default admin user (admin/gaiaadmin)")

    for inst in SEED_INSTRUMENTS:
        result = await db.execute(
            select(InstrumentCategory).where(InstrumentCategory.name == inst["name"])
        )
        if not result.scalar_one_or_none():
            ops = inst.pop("operations", [])
            cat = InstrumentCategory(**{k: v for k, v in inst.items()})
            db.add(cat)
            await db.flush()
            for op in ops:
                db.add(OperationTemplate(category_id=cat.id, **op))
            print(f"[seed] Created instrument category: {cat.name}")

    await db.commit()
    print("[seed] Database seeded OK")
