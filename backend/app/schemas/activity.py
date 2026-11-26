"""Response models for ``GET /api/activity`` (ACS activity console feed)."""

from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, Field

ActivityEventKind = Literal[
    "deployment_observed",
    "deployment_removed",
    "deployment_images_changed",
    "image_scanned",
    "image_scan_updated",
]
CollectorStatus = Literal["waiting", "live", "stale"]


class ActivityImageRef(BaseModel):
    image_id_v2: str | None
    image_digest: str | None
    image_name: str | None


class DeploymentActivityDetails(BaseModel):
    deployment_id: str
    deployment_name: str | None


class DeploymentImagesActivityDetails(DeploymentActivityDetails):
    added_images: list[ActivityImageRef]
    removed_images: list[ActivityImageRef]


class ImageScanActivityDetails(BaseModel):
    image_id_v2: str
    image_digest: str | None
    image_name: str | None
    component_count: int | None
    cve_count: int | None
    fixable_cve_count: int | None


class _ActivityEventBase(BaseModel):
    # Decimal string: event ids are bigints and exceed JavaScript's safe integers.
    id: str
    observed_at: datetime
    # ACS scan timestamp for scan events; null for inventory observations.
    source_at: datetime | None
    cluster_name: str
    namespace: str


class DeploymentObservedEvent(_ActivityEventBase):
    kind: Literal["deployment_observed"]
    details: DeploymentActivityDetails


class DeploymentRemovedEvent(_ActivityEventBase):
    kind: Literal["deployment_removed"]
    details: DeploymentActivityDetails


class DeploymentImagesChangedEvent(_ActivityEventBase):
    kind: Literal["deployment_images_changed"]
    details: DeploymentImagesActivityDetails


class ImageScannedEvent(_ActivityEventBase):
    kind: Literal["image_scanned"]
    details: ImageScanActivityDetails


class ImageScanUpdatedEvent(_ActivityEventBase):
    kind: Literal["image_scan_updated"]
    details: ImageScanActivityDetails


ActivityEventItem = Annotated[
    DeploymentObservedEvent
    | DeploymentRemovedEvent
    | DeploymentImagesChangedEvent
    | ImageScannedEvent
    | ImageScanUpdatedEvent,
    Field(discriminator="kind"),
]


class ActivityFeed(BaseModel):
    items: list[ActivityEventItem]
    next_cursor: str
    has_more: bool
    reset: bool
    scope_key: str
    last_success_at: datetime | None
    collector_status: CollectorStatus
