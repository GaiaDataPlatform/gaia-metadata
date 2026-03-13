import csv
import json
import io
from typing import List
from ..models.task import Task

def tasks_to_csv(tasks: List[Task]) -> str:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "task_id", "cruise_code", "instrument", "task_type", "status",
        "started_at", "ended_at", "lat_start", "lon_start",
        "lat_end", "lon_end", "notes", "created_by",
        "operation_name", "operation_time", "op_lat", "op_lon",
        "op_extra_data", "nmea_sentence"
    ])
    for task in tasks:
        cruise_code = task.cruise.code if task.cruise else ""
        instrument = task.category.name if task.category else ""
        task_type = task.category.task_type if task.category else ""
        if not task.operations:
            writer.writerow([
                task.id, cruise_code, instrument, task_type, task.status.value,
                task.started_at, task.ended_at,
                task.lat_start, task.lon_start, task.lat_end, task.lon_end,
                task.notes, task.created_by,
                "", "", "", "", "", ""
            ])
        else:
            for op in task.operations:
                writer.writerow([
                    task.id, cruise_code, instrument, task_type, task.status.value,
                    task.started_at, task.ended_at,
                    task.lat_start, task.lon_start, task.lat_end, task.lon_end,
                    task.notes, task.created_by,
                    op.operation_template.name if op.operation_template else "",
                    op.event_time,
                    op.lat, op.lon,
                    json.dumps(op.extra_data) if op.extra_data else "",
                    op.nmea_sentence or ""
                ])
    return output.getvalue()

def cruise_to_json(cruise, tasks: List[Task]) -> dict:
    def serialize_task(t):
        return {
            "id": t.id,
            "instrument": t.category.name if t.category else None,
            "instrument_display": t.category.display_name if t.category else None,
            "task_type": t.category.task_type if t.category else None,
            "status": t.status.value,
            "started_at": t.started_at.isoformat() if t.started_at else None,
            "ended_at": t.ended_at.isoformat() if t.ended_at else None,
            "lat_start": t.lat_start, "lon_start": t.lon_start,
            "lat_end": t.lat_end, "lon_end": t.lon_end,
            "extra_data": t.extra_data,
            "notes": t.notes,
            "created_by": t.created_by,
            "operations": [
                {
                    "id": op.id,
                    "name": op.operation_template.name if op.operation_template else None,
                    "display_name": op.operation_template.display_name if op.operation_template else None,
                    "event_time": op.event_time.isoformat() if op.event_time else None,
                    "lat": op.lat, "lon": op.lon,
                    "extra_data": op.extra_data,
                    "operator": op.operator,
                    "nmea_sentence": op.nmea_sentence,
                }
                for op in t.operations
            ]
        }

    return {
        "version": "2.1.0",
        "cruise": {
            "id": cruise.id,
            "code": cruise.code,
            "name": cruise.name,
            "status": cruise.status.value,
            "start_date": cruise.start_date.isoformat() if cruise.start_date else None,
            "end_date": cruise.end_date.isoformat() if cruise.end_date else None,
            "port_departure": cruise.port_departure,
            "port_arrival": cruise.port_arrival,
            "chief_scientist": cruise.chief_scientist,
            "chief_scientist_email": cruise.chief_scientist_email,
            "description": cruise.description,
            "study_area": cruise.study_area,
            "num_participants": cruise.num_participants,
            "participants": cruise.participants,
        },
        "tasks": [serialize_task(t) for t in tasks]
    }
