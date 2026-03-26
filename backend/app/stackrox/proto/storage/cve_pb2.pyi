import datetime

from google.protobuf import timestamp_pb2 as _timestamp_pb2
from google.protobuf.internal import containers as _containers
from google.protobuf.internal import enum_type_wrapper as _enum_type_wrapper
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Iterable as _Iterable, Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class VulnerabilityState(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
    __slots__ = ()
    OBSERVED: _ClassVar[VulnerabilityState]
    DEFERRED: _ClassVar[VulnerabilityState]
    FALSE_POSITIVE: _ClassVar[VulnerabilityState]

class VulnerabilitySeverity(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
    __slots__ = ()
    UNKNOWN_VULNERABILITY_SEVERITY: _ClassVar[VulnerabilitySeverity]
    LOW_VULNERABILITY_SEVERITY: _ClassVar[VulnerabilitySeverity]
    MODERATE_VULNERABILITY_SEVERITY: _ClassVar[VulnerabilitySeverity]
    IMPORTANT_VULNERABILITY_SEVERITY: _ClassVar[VulnerabilitySeverity]
    CRITICAL_VULNERABILITY_SEVERITY: _ClassVar[VulnerabilitySeverity]

class Source(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
    __slots__ = ()
    SOURCE_UNKNOWN: _ClassVar[Source]
    SOURCE_RED_HAT: _ClassVar[Source]
    SOURCE_OSV: _ClassVar[Source]
    SOURCE_NVD: _ClassVar[Source]

class CvssScoreVersion(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
    __slots__ = ()
    UNKNOWN_VERSION: _ClassVar[CvssScoreVersion]
    V2: _ClassVar[CvssScoreVersion]
    V3: _ClassVar[CvssScoreVersion]

OBSERVED: VulnerabilityState
DEFERRED: VulnerabilityState
FALSE_POSITIVE: VulnerabilityState
UNKNOWN_VULNERABILITY_SEVERITY: VulnerabilitySeverity
LOW_VULNERABILITY_SEVERITY: VulnerabilitySeverity
MODERATE_VULNERABILITY_SEVERITY: VulnerabilitySeverity
IMPORTANT_VULNERABILITY_SEVERITY: VulnerabilitySeverity
CRITICAL_VULNERABILITY_SEVERITY: VulnerabilitySeverity
SOURCE_UNKNOWN: Source
SOURCE_RED_HAT: Source
SOURCE_OSV: Source
SOURCE_NVD: Source
UNKNOWN_VERSION: CvssScoreVersion
V2: CvssScoreVersion
V3: CvssScoreVersion

class EPSS(_message.Message):
    __slots__ = ()
    EPSS_PROBABILITY_FIELD_NUMBER: _ClassVar[int]
    EPSS_PERCENTILE_FIELD_NUMBER: _ClassVar[int]
    epss_probability: float
    epss_percentile: float
    def __init__(self, epss_probability: _Optional[float] = ..., epss_percentile: _Optional[float] = ...) -> None: ...

class CVEInfo(_message.Message):
    __slots__ = ()
    class ScoreVersion(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
        __slots__ = ()
        V2: _ClassVar[CVEInfo.ScoreVersion]
        V3: _ClassVar[CVEInfo.ScoreVersion]
        UNKNOWN: _ClassVar[CVEInfo.ScoreVersion]

    V2: CVEInfo.ScoreVersion
    V3: CVEInfo.ScoreVersion
    UNKNOWN: CVEInfo.ScoreVersion
    class Reference(_message.Message):
        __slots__ = ()
        URI_FIELD_NUMBER: _ClassVar[int]
        TAGS_FIELD_NUMBER: _ClassVar[int]
        URI: str
        tags: _containers.RepeatedScalarFieldContainer[str]
        def __init__(self, URI: _Optional[str] = ..., tags: _Optional[_Iterable[str]] = ...) -> None: ...

    CVE_FIELD_NUMBER: _ClassVar[int]
    SUMMARY_FIELD_NUMBER: _ClassVar[int]
    LINK_FIELD_NUMBER: _ClassVar[int]
    PUBLISHED_ON_FIELD_NUMBER: _ClassVar[int]
    CREATED_AT_FIELD_NUMBER: _ClassVar[int]
    LAST_MODIFIED_FIELD_NUMBER: _ClassVar[int]
    SCORE_VERSION_FIELD_NUMBER: _ClassVar[int]
    CVSS_V2_FIELD_NUMBER: _ClassVar[int]
    CVSS_V3_FIELD_NUMBER: _ClassVar[int]
    REFERENCES_FIELD_NUMBER: _ClassVar[int]
    CVSS_METRICS_FIELD_NUMBER: _ClassVar[int]
    EPSS_FIELD_NUMBER: _ClassVar[int]
    cve: str
    summary: str
    link: str
    published_on: _timestamp_pb2.Timestamp
    created_at: _timestamp_pb2.Timestamp
    last_modified: _timestamp_pb2.Timestamp
    score_version: CVEInfo.ScoreVersion
    cvss_v2: CVSSV2
    cvss_v3: CVSSV3
    references: _containers.RepeatedCompositeFieldContainer[CVEInfo.Reference]
    cvss_metrics: _containers.RepeatedCompositeFieldContainer[CVSSScore]
    epss: EPSS
    def __init__(
        self,
        cve: _Optional[str] = ...,
        summary: _Optional[str] = ...,
        link: _Optional[str] = ...,
        published_on: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ...,
        created_at: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ...,
        last_modified: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ...,
        score_version: _Optional[_Union[CVEInfo.ScoreVersion, str]] = ...,
        cvss_v2: _Optional[_Union[CVSSV2, _Mapping]] = ...,
        cvss_v3: _Optional[_Union[CVSSV3, _Mapping]] = ...,
        references: _Optional[_Iterable[_Union[CVEInfo.Reference, _Mapping]]] = ...,
        cvss_metrics: _Optional[_Iterable[_Union[CVSSScore, _Mapping]]] = ...,
        epss: _Optional[_Union[EPSS, _Mapping]] = ...,
    ) -> None: ...

class Advisory(_message.Message):
    __slots__ = ()
    NAME_FIELD_NUMBER: _ClassVar[int]
    LINK_FIELD_NUMBER: _ClassVar[int]
    name: str
    link: str
    def __init__(self, name: _Optional[str] = ..., link: _Optional[str] = ...) -> None: ...

class ImageCVEV2(_message.Message):
    __slots__ = ()
    ID_FIELD_NUMBER: _ClassVar[int]
    IMAGE_ID_FIELD_NUMBER: _ClassVar[int]
    CVE_BASE_INFO_FIELD_NUMBER: _ClassVar[int]
    CVSS_FIELD_NUMBER: _ClassVar[int]
    SEVERITY_FIELD_NUMBER: _ClassVar[int]
    IMPACT_SCORE_FIELD_NUMBER: _ClassVar[int]
    NVDCVSS_FIELD_NUMBER: _ClassVar[int]
    NVD_SCORE_VERSION_FIELD_NUMBER: _ClassVar[int]
    FIRST_IMAGE_OCCURRENCE_FIELD_NUMBER: _ClassVar[int]
    STATE_FIELD_NUMBER: _ClassVar[int]
    IS_FIXABLE_FIELD_NUMBER: _ClassVar[int]
    FIXED_BY_FIELD_NUMBER: _ClassVar[int]
    COMPONENT_ID_FIELD_NUMBER: _ClassVar[int]
    ADVISORY_FIELD_NUMBER: _ClassVar[int]
    IMAGE_ID_V2_FIELD_NUMBER: _ClassVar[int]
    FIX_AVAILABLE_TIMESTAMP_FIELD_NUMBER: _ClassVar[int]
    DATASOURCE_FIELD_NUMBER: _ClassVar[int]
    id: str
    image_id: str
    cve_base_info: CVEInfo
    cvss: float
    severity: VulnerabilitySeverity
    impact_score: float
    nvdcvss: float
    nvd_score_version: CvssScoreVersion
    first_image_occurrence: _timestamp_pb2.Timestamp
    state: VulnerabilityState
    is_fixable: bool
    fixed_by: str
    component_id: str
    advisory: Advisory
    image_id_v2: str
    fix_available_timestamp: _timestamp_pb2.Timestamp
    datasource: str
    def __init__(
        self,
        id: _Optional[str] = ...,
        image_id: _Optional[str] = ...,
        cve_base_info: _Optional[_Union[CVEInfo, _Mapping]] = ...,
        cvss: _Optional[float] = ...,
        severity: _Optional[_Union[VulnerabilitySeverity, str]] = ...,
        impact_score: _Optional[float] = ...,
        nvdcvss: _Optional[float] = ...,
        nvd_score_version: _Optional[_Union[CvssScoreVersion, str]] = ...,
        first_image_occurrence: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ...,
        state: _Optional[_Union[VulnerabilityState, str]] = ...,
        is_fixable: _Optional[bool] = ...,
        fixed_by: _Optional[str] = ...,
        component_id: _Optional[str] = ...,
        advisory: _Optional[_Union[Advisory, _Mapping]] = ...,
        image_id_v2: _Optional[str] = ...,
        fix_available_timestamp: _Optional[_Union[datetime.datetime, _timestamp_pb2.Timestamp, _Mapping]] = ...,
        datasource: _Optional[str] = ...,
    ) -> None: ...

class CVSSScore(_message.Message):
    __slots__ = ()
    SOURCE_FIELD_NUMBER: _ClassVar[int]
    URL_FIELD_NUMBER: _ClassVar[int]
    CVSSV2_FIELD_NUMBER: _ClassVar[int]
    CVSSV3_FIELD_NUMBER: _ClassVar[int]
    source: Source
    url: str
    cvssv2: CVSSV2
    cvssv3: CVSSV3
    def __init__(
        self,
        source: _Optional[_Union[Source, str]] = ...,
        url: _Optional[str] = ...,
        cvssv2: _Optional[_Union[CVSSV2, _Mapping]] = ...,
        cvssv3: _Optional[_Union[CVSSV3, _Mapping]] = ...,
    ) -> None: ...

class CVSSV2(_message.Message):
    __slots__ = ()
    class Impact(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
        __slots__ = ()
        IMPACT_NONE: _ClassVar[CVSSV2.Impact]
        IMPACT_PARTIAL: _ClassVar[CVSSV2.Impact]
        IMPACT_COMPLETE: _ClassVar[CVSSV2.Impact]

    IMPACT_NONE: CVSSV2.Impact
    IMPACT_PARTIAL: CVSSV2.Impact
    IMPACT_COMPLETE: CVSSV2.Impact
    class AttackVector(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
        __slots__ = ()
        ATTACK_LOCAL: _ClassVar[CVSSV2.AttackVector]
        ATTACK_ADJACENT: _ClassVar[CVSSV2.AttackVector]
        ATTACK_NETWORK: _ClassVar[CVSSV2.AttackVector]

    ATTACK_LOCAL: CVSSV2.AttackVector
    ATTACK_ADJACENT: CVSSV2.AttackVector
    ATTACK_NETWORK: CVSSV2.AttackVector
    class AccessComplexity(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
        __slots__ = ()
        ACCESS_HIGH: _ClassVar[CVSSV2.AccessComplexity]
        ACCESS_MEDIUM: _ClassVar[CVSSV2.AccessComplexity]
        ACCESS_LOW: _ClassVar[CVSSV2.AccessComplexity]

    ACCESS_HIGH: CVSSV2.AccessComplexity
    ACCESS_MEDIUM: CVSSV2.AccessComplexity
    ACCESS_LOW: CVSSV2.AccessComplexity
    class Authentication(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
        __slots__ = ()
        AUTH_MULTIPLE: _ClassVar[CVSSV2.Authentication]
        AUTH_SINGLE: _ClassVar[CVSSV2.Authentication]
        AUTH_NONE: _ClassVar[CVSSV2.Authentication]

    AUTH_MULTIPLE: CVSSV2.Authentication
    AUTH_SINGLE: CVSSV2.Authentication
    AUTH_NONE: CVSSV2.Authentication
    class Severity(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
        __slots__ = ()
        UNKNOWN: _ClassVar[CVSSV2.Severity]
        LOW: _ClassVar[CVSSV2.Severity]
        MEDIUM: _ClassVar[CVSSV2.Severity]
        HIGH: _ClassVar[CVSSV2.Severity]

    UNKNOWN: CVSSV2.Severity
    LOW: CVSSV2.Severity
    MEDIUM: CVSSV2.Severity
    HIGH: CVSSV2.Severity
    VECTOR_FIELD_NUMBER: _ClassVar[int]
    ATTACK_VECTOR_FIELD_NUMBER: _ClassVar[int]
    ACCESS_COMPLEXITY_FIELD_NUMBER: _ClassVar[int]
    AUTHENTICATION_FIELD_NUMBER: _ClassVar[int]
    CONFIDENTIALITY_FIELD_NUMBER: _ClassVar[int]
    INTEGRITY_FIELD_NUMBER: _ClassVar[int]
    AVAILABILITY_FIELD_NUMBER: _ClassVar[int]
    EXPLOITABILITY_SCORE_FIELD_NUMBER: _ClassVar[int]
    IMPACT_SCORE_FIELD_NUMBER: _ClassVar[int]
    SCORE_FIELD_NUMBER: _ClassVar[int]
    SEVERITY_FIELD_NUMBER: _ClassVar[int]
    vector: str
    attack_vector: CVSSV2.AttackVector
    access_complexity: CVSSV2.AccessComplexity
    authentication: CVSSV2.Authentication
    confidentiality: CVSSV2.Impact
    integrity: CVSSV2.Impact
    availability: CVSSV2.Impact
    exploitability_score: float
    impact_score: float
    score: float
    severity: CVSSV2.Severity
    def __init__(
        self,
        vector: _Optional[str] = ...,
        attack_vector: _Optional[_Union[CVSSV2.AttackVector, str]] = ...,
        access_complexity: _Optional[_Union[CVSSV2.AccessComplexity, str]] = ...,
        authentication: _Optional[_Union[CVSSV2.Authentication, str]] = ...,
        confidentiality: _Optional[_Union[CVSSV2.Impact, str]] = ...,
        integrity: _Optional[_Union[CVSSV2.Impact, str]] = ...,
        availability: _Optional[_Union[CVSSV2.Impact, str]] = ...,
        exploitability_score: _Optional[float] = ...,
        impact_score: _Optional[float] = ...,
        score: _Optional[float] = ...,
        severity: _Optional[_Union[CVSSV2.Severity, str]] = ...,
    ) -> None: ...

class CVSSV3(_message.Message):
    __slots__ = ()
    class Impact(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
        __slots__ = ()
        IMPACT_NONE: _ClassVar[CVSSV3.Impact]
        IMPACT_LOW: _ClassVar[CVSSV3.Impact]
        IMPACT_HIGH: _ClassVar[CVSSV3.Impact]

    IMPACT_NONE: CVSSV3.Impact
    IMPACT_LOW: CVSSV3.Impact
    IMPACT_HIGH: CVSSV3.Impact
    class AttackVector(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
        __slots__ = ()
        ATTACK_LOCAL: _ClassVar[CVSSV3.AttackVector]
        ATTACK_ADJACENT: _ClassVar[CVSSV3.AttackVector]
        ATTACK_NETWORK: _ClassVar[CVSSV3.AttackVector]
        ATTACK_PHYSICAL: _ClassVar[CVSSV3.AttackVector]

    ATTACK_LOCAL: CVSSV3.AttackVector
    ATTACK_ADJACENT: CVSSV3.AttackVector
    ATTACK_NETWORK: CVSSV3.AttackVector
    ATTACK_PHYSICAL: CVSSV3.AttackVector
    class Complexity(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
        __slots__ = ()
        COMPLEXITY_LOW: _ClassVar[CVSSV3.Complexity]
        COMPLEXITY_HIGH: _ClassVar[CVSSV3.Complexity]

    COMPLEXITY_LOW: CVSSV3.Complexity
    COMPLEXITY_HIGH: CVSSV3.Complexity
    class Privileges(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
        __slots__ = ()
        PRIVILEGE_NONE: _ClassVar[CVSSV3.Privileges]
        PRIVILEGE_LOW: _ClassVar[CVSSV3.Privileges]
        PRIVILEGE_HIGH: _ClassVar[CVSSV3.Privileges]

    PRIVILEGE_NONE: CVSSV3.Privileges
    PRIVILEGE_LOW: CVSSV3.Privileges
    PRIVILEGE_HIGH: CVSSV3.Privileges
    class UserInteraction(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
        __slots__ = ()
        UI_NONE: _ClassVar[CVSSV3.UserInteraction]
        UI_REQUIRED: _ClassVar[CVSSV3.UserInteraction]

    UI_NONE: CVSSV3.UserInteraction
    UI_REQUIRED: CVSSV3.UserInteraction
    class Scope(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
        __slots__ = ()
        UNCHANGED: _ClassVar[CVSSV3.Scope]
        CHANGED: _ClassVar[CVSSV3.Scope]

    UNCHANGED: CVSSV3.Scope
    CHANGED: CVSSV3.Scope
    class Severity(int, metaclass=_enum_type_wrapper.EnumTypeWrapper):
        __slots__ = ()
        UNKNOWN: _ClassVar[CVSSV3.Severity]
        NONE: _ClassVar[CVSSV3.Severity]
        LOW: _ClassVar[CVSSV3.Severity]
        MEDIUM: _ClassVar[CVSSV3.Severity]
        HIGH: _ClassVar[CVSSV3.Severity]
        CRITICAL: _ClassVar[CVSSV3.Severity]

    UNKNOWN: CVSSV3.Severity
    NONE: CVSSV3.Severity
    LOW: CVSSV3.Severity
    MEDIUM: CVSSV3.Severity
    HIGH: CVSSV3.Severity
    CRITICAL: CVSSV3.Severity
    VECTOR_FIELD_NUMBER: _ClassVar[int]
    EXPLOITABILITY_SCORE_FIELD_NUMBER: _ClassVar[int]
    IMPACT_SCORE_FIELD_NUMBER: _ClassVar[int]
    ATTACK_VECTOR_FIELD_NUMBER: _ClassVar[int]
    ATTACK_COMPLEXITY_FIELD_NUMBER: _ClassVar[int]
    PRIVILEGES_REQUIRED_FIELD_NUMBER: _ClassVar[int]
    USER_INTERACTION_FIELD_NUMBER: _ClassVar[int]
    SCOPE_FIELD_NUMBER: _ClassVar[int]
    CONFIDENTIALITY_FIELD_NUMBER: _ClassVar[int]
    INTEGRITY_FIELD_NUMBER: _ClassVar[int]
    AVAILABILITY_FIELD_NUMBER: _ClassVar[int]
    SCORE_FIELD_NUMBER: _ClassVar[int]
    SEVERITY_FIELD_NUMBER: _ClassVar[int]
    vector: str
    exploitability_score: float
    impact_score: float
    attack_vector: CVSSV3.AttackVector
    attack_complexity: CVSSV3.Complexity
    privileges_required: CVSSV3.Privileges
    user_interaction: CVSSV3.UserInteraction
    scope: CVSSV3.Scope
    confidentiality: CVSSV3.Impact
    integrity: CVSSV3.Impact
    availability: CVSSV3.Impact
    score: float
    severity: CVSSV3.Severity
    def __init__(
        self,
        vector: _Optional[str] = ...,
        exploitability_score: _Optional[float] = ...,
        impact_score: _Optional[float] = ...,
        attack_vector: _Optional[_Union[CVSSV3.AttackVector, str]] = ...,
        attack_complexity: _Optional[_Union[CVSSV3.Complexity, str]] = ...,
        privileges_required: _Optional[_Union[CVSSV3.Privileges, str]] = ...,
        user_interaction: _Optional[_Union[CVSSV3.UserInteraction, str]] = ...,
        scope: _Optional[_Union[CVSSV3.Scope, str]] = ...,
        confidentiality: _Optional[_Union[CVSSV3.Impact, str]] = ...,
        integrity: _Optional[_Union[CVSSV3.Impact, str]] = ...,
        availability: _Optional[_Union[CVSSV3.Impact, str]] = ...,
        score: _Optional[float] = ...,
        severity: _Optional[_Union[CVSSV3.Severity, str]] = ...,
    ) -> None: ...
