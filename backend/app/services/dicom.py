from dataclasses import dataclass
from pathlib import Path

from pydicom import dcmread
from pydicom.dataset import Dataset
from pydicom.uid import generate_uid

ANONYMIZE_BLANK_FIELDS = {
    "AccessionNumber",
    "AdditionalPatientHistory",
    "AdmissionID",
    "AdmittingDiagnosesDescription",
    "BranchOfService",
    "ClinicalTrialProtocolID",
    "ClinicalTrialProtocolName",
    "ClinicalTrialSiteID",
    "ClinicalTrialSiteName",
    "ClinicalTrialSponsorName",
    "ClinicalTrialSubjectID",
    "ClinicalTrialSubjectReadingID",
    "ConsultingPhysicianName",
    "ContentCreatorName",
    "DeviceSerialNumber",
    "EthnicGroup",
    "FillerOrderNumberImagingServiceRequest",
    "HospitalAdmissionID",
    "InstitutionAddress",
    "InstitutionName",
    "InstitutionalDepartmentName",
    "IssuerOfPatientID",
    "IssuerOfPatientIDQualifiersSequence",
    "MedicalRecordLocator",
    "MilitaryRank",
    "Occupation",
    "OperatorsName",
    "OrderCallbackPhoneNumber",
    "OtherPatientIDs",
    "OtherPatientIDsSequence",
    "OtherPatientNames",
    "PatientAddress",
    "PatientBirthDate",
    "PatientBirthName",
    "PatientBirthTime",
    "PatientID",
    "PatientInsurancePlanCodeSequence",
    "PatientMotherBirthName",
    "PatientName",
    "PatientPhoneNumbers",
    "PatientReligiousPreference",
    "PatientSex",
    "PatientSize",
    "PatientTelephoneNumbers",
    "PatientWeight",
    "PerformingPhysicianName",
    "PersonAddress",
    "PersonName",
    "PersonTelephoneNumbers",
    "PhysiciansOfRecord",
    "PhysiciansOfRecordIdentificationSequence",
    "PlacerOrderNumberImagingServiceRequest",
    "ProtocolName",
    "ReferringPhysicianAddress",
    "ReferringPhysicianName",
    "ReferringPhysicianTelephoneNumbers",
    "ReferencedPatientAliasSequence",
    "RequestingPhysician",
    "RequestingService",
    "ResponsibleOrganization",
    "ResponsiblePerson",
    "ScheduledPerformingPhysicianName",
    "StudyID",
}

ANONYMIZE_REMOVE_FIELDS = {
    "CurrentPatientLocation",
    "DerivationDescription",
    "ImageComments",
    "InterpretationAuthor",
    "NamesOfIntendedRecipientsOfResults",
    "PatientComments",
    "PerformedProcedureStepDescription",
    "PerformedStationAETitle",
    "PerformedStationGeographicLocationCodeSequence",
    "PerformedStationName",
    "PerformedLocation",
    "ReasonForRequestedProcedure",
    "RequestAttributesSequence",
    "RequestComments",
    "ScheduledProcedureStepDescription",
}

ANONYMIZE_UID_FIELDS = {
    "FrameOfReferenceUID",
    "MediaStorageSOPInstanceUID",
    "ReferencedSOPInstanceUID",
    "SeriesInstanceUID",
    "SOPInstanceUID",
    "StudyInstanceUID",
}


@dataclass
class DicomAnonymizationResult:
    anonymized: bool
    tags_blanketed: int
    tags_removed: int
    private_tags_removed: bool
    note: str


def anonymize_dicom_file(path: str | Path) -> DicomAnonymizationResult:
    dataset = dcmread(str(path), stop_before_pixels=False, force=True)
    removed = 0
    blanketed = 0

    def scrub(target: Dataset) -> None:
        nonlocal removed, blanketed

        for element in list(target):
            if element.VR == "SQ":
                for item in element.value:
                    scrub(item)
                continue

            keyword = element.keyword
            if not keyword:
                continue

            if keyword in ANONYMIZE_UID_FIELDS:
                target[element.tag].value = generate_uid()
                blanketed += 1
                continue

            if keyword in ANONYMIZE_REMOVE_FIELDS:
                del target[element.tag]
                removed += 1
                continue

            if keyword in ANONYMIZE_BLANK_FIELDS or element.VR == "PN":
                replacement = "ANONYMIZED" if element.VR == "PN" else ""
                target[element.tag].value = replacement
                blanketed += 1

    scrub(dataset)
    dataset.remove_private_tags()
    dataset.PatientIdentityRemoved = "YES"
    dataset.DeidentificationMethod = (
        "Basic profile; private tags removed; identifiers anonymized."
    )

    file_meta = getattr(dataset, "file_meta", None)
    if file_meta is not None and hasattr(file_meta, "MediaStorageSOPInstanceUID"):
        file_meta.MediaStorageSOPInstanceUID = generate_uid()
        blanketed += 1

    dataset.save_as(str(path), write_like_original=False)
    return DicomAnonymizationResult(
        anonymized=True,
        tags_blanketed=blanketed,
        tags_removed=removed,
        private_tags_removed=True,
        note=(
            "Metadata-level anonymization applied. Burned-in pixel annotations, if present, "
            "are not scrubbed in Phase 2."
        ),
    )
