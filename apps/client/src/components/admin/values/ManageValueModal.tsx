import * as React from "react";
import {
  DEPARTMENT_SCHEMA,
  DIVISION_SCHEMA,
  HASH_SCHEMA,
  CODES_10_SCHEMA,
  BUSINESS_ROLE_SCHEMA,
  BASE_VALUE_SCHEMA,
  CALL_TYPE_SCHEMA,
} from "@snailycad/schemas";
import { Loader, Button, SelectField, TextField, SwitchField } from "@snailycad/ui";
import { Modal } from "components/modal/Modal";
import { Form, Formik, FormikHelpers } from "formik";
import { handleValidate } from "lib/handleValidate";
import useFetch from "lib/useFetch";
import { useModal } from "state/modalState";
import { useValues } from "context/ValuesContext";
import {
  AnyValue,
  DriversLicenseCategoryType,
  EmployeeAsEnum,
  QualificationValueType,
  ValueType,
} from "@snailycad/types";
import { useTranslations } from "use-intl";
import hexColor from "hex-color-regex";
import { ModalIds } from "types/modal-ids";
import { DepartmentFields } from "./manage-modal/department-fields";
import { StatusValueFields, useDefaultDepartments } from "./manage-modal/status-value-fields";
import { LicenseFields } from "./manage-modal/license-fields";
import {
  isEmployeeValue,
  isBaseValue,
  isDepartmentValue,
  isDivisionValue,
  isStatusValue,
  isVehicleValue,
  isWeaponValue,
  isUnitQualification,
  isDLCategoryValue,
  isCallTypeValue,
  isOfficerRankValue,
  isAddressValue,
  isEmergencyVehicleValue,
} from "@snailycad/utils/typeguards";
import { QualificationFields } from "./manage-modal/qualification-fields";
import { ImageSelectInput, validateFile } from "components/form/inputs/ImageSelectInput";
import type { PatchValueByIdData, PostValuesData } from "@snailycad/types/api";
import {
  getDisabledFromValue,
  getValueStrFromValue,
  makeDefaultWhatPages,
} from "lib/admin/values/utils";
import { DivisionFields } from "./manage-modal/division-fields";
import { AddressFields } from "./manage-modal/address-fields";
import {
  EmergencyVehicleFields,
  useDefaultDivisions,
} from "./manage-modal/emergency-vehicle-fields";
import { useFeatureEnabled } from "hooks/useFeatureEnabled";

interface Props {
  type: ValueType;
  value: AnyValue | null;
  clType?: DriversLicenseCategoryType | null;
  onCreate(newValue: AnyValue): void;
  onUpdate(oldValue: AnyValue, newValue: AnyValue): void;
}

const EXTRA_SCHEMAS: Partial<Record<ValueType, Zod.ZodObject<Zod.ZodRawShape>>> = {
  CODES_10: CODES_10_SCHEMA,
  DEPARTMENT: DEPARTMENT_SCHEMA,
  DIVISION: DIVISION_SCHEMA,
  VEHICLE: HASH_SCHEMA,
  WEAPON: HASH_SCHEMA,
  BUSINESS_ROLE: BUSINESS_ROLE_SCHEMA,
  CALL_TYPE: CALL_TYPE_SCHEMA,
};

export function ManageValueModal({ onCreate, onUpdate, clType: dlType, type, value }: Props) {
  const [image, setImage] = React.useState<File | string | null>(null);

  const { state, execute } = useFetch();
  const { isOpen, closeModal } = useModal();
  const t = useTranslations(type);
  const common = useTranslations("Common");
  const tValues = useTranslations("Values");
  const { makeDefaultDepartmentsValues } = useDefaultDepartments();
  const defaultDivisions = useDefaultDivisions();

  const title = !value ? t("ADD") : t("EDIT");
  const footerTitle = !value ? t("ADD") : common("save");
  const { vehicleTrimLevel, department } = useValues();
  const { DIVISIONS } = useFeatureEnabled();

  const BUSINESS_VALUES = [
    {
      value: EmployeeAsEnum.OWNER,
      label: tValues("owner"),
    },
    {
      value: EmployeeAsEnum.MANAGER,
      label: tValues("manager"),
    },
    {
      value: EmployeeAsEnum.EMPLOYEE,
      label: tValues("employee"),
    },
  ];

  async function onSubmit(
    values: typeof INITIAL_VALUES,
    helpers: FormikHelpers<typeof INITIAL_VALUES>,
  ) {
    const data = {
      ...values,
      type: dlType ? dlType : values.type,
      whatPages: values.whatPages,
      departments: values.departments,
      divisions: values.divisions,
      officerRankDepartments: values.officerRankDepartments,
      trimLevels: values.trimLevels,
      extraFields: JSON.parse(values.extraFields),
    };

    if (value) {
      const { json } = await execute<PatchValueByIdData, typeof INITIAL_VALUES>({
        path: `/admin/values/${type.toLowerCase()}/${value.id}`,
        method: "PATCH",
        data,
        helpers,
      });

      if (json?.id) {
        closeModal(ModalIds.ManageValue);
        await handleValueImageUpload(type.toLowerCase(), value.id, helpers);
        onUpdate(value, json);
      }
    } else {
      const { json } = await execute<PostValuesData, typeof INITIAL_VALUES>({
        path: `/admin/values/${type.toLowerCase()}`,
        method: "POST",
        data,
        helpers,
      });

      if (json?.id) {
        await handleValueImageUpload(type.toLowerCase(), json.id, helpers);
        closeModal(ModalIds.ManageValue);
        onCreate(json);
      }
    }
  }

  async function handleValueImageUpload(
    type: string,
    id: string,
    helpers: FormikHelpers<typeof INITIAL_VALUES>,
  ) {
    const fd = new FormData();
    const validatedImage = validateFile(image, helpers);

    if (validatedImage) {
      if (typeof validatedImage !== "string") {
        fd.set("image", validatedImage, validatedImage.name);
      }
    }

    if (validatedImage && typeof validatedImage === "object") {
      await execute({
        path: `/admin/values/${type}/image/${id}`,
        method: "POST",
        data: fd,
        helpers,
        headers: {
          "content-type": "multipart/form-data",
        },
      });
    }
  }

  // todo: make this a function
  const INITIAL_VALUES = {
    isDisabled: value ? getDisabledFromValue(value) : false,
    value: value ? getValueStrFromValue(value) : "",

    description:
      value && (isUnitQualification(value) || isDLCategoryValue(value))
        ? value.description ?? ""
        : "",
    qualificationType:
      value && isUnitQualification(value)
        ? value.qualificationType
        : QualificationValueType.QUALIFICATION,

    shouldDo: value && isStatusValue(value) ? value.shouldDo : "",
    color: value && isStatusValue(value) ? value.color ?? "" : "",
    type: value && (isStatusValue(value) || isDepartmentValue(value)) ? value.type : "STATUS_CODE",
    departments:
      value &&
      (isStatusValue(value) || isUnitQualification(value) || isEmergencyVehicleValue(value))
        ? makeDefaultDepartmentsValues(value)
        : undefined,
    whatPages: value && isStatusValue(value) ? makeDefaultWhatPages(value) : [],

    pairedUnitTemplate: value && isDivisionValue(value) ? value.pairedUnitTemplate ?? "" : "",
    departmentId: value && isDivisionValue(value) ? value.departmentId : "",
    isConfidential: value && isDepartmentValue(value) ? value.isConfidential : false,
    whitelisted: value && isDepartmentValue(value) ? value.whitelisted : false,
    defaultOfficerRankId: value && isDepartmentValue(value) ? value.defaultOfficerRankId : null,
    isDefaultDepartment: value && isDepartmentValue(value) ? value.isDefaultDepartment : false,
    callsign:
      value && (isDepartmentValue(value) || isDivisionValue(value)) ? value.callsign ?? "" : "",
    customTemplate: value && isDepartmentValue(value) ? value.customTemplate ?? "" : "",

    as: value && isEmployeeValue(value) ? value.as : "",
    hash: value && (isVehicleValue(value) || isWeaponValue(value)) ? value.hash ?? "" : undefined,
    trimLevels: value && isVehicleValue(value) ? value.trimLevels?.map((v) => v.id) ?? [] : [],

    licenseType: value && isBaseValue(value) ? value.licenseType : null,
    isDefault: value && isBaseValue(value) ? value.isDefault : undefined,
    priority: value && isCallTypeValue(value) ? value.priority ?? undefined : undefined,

    officerRankImageId: "",
    officerRankDepartments:
      value && isOfficerRankValue(value) ? makeDefaultDepartmentsValues(value) : undefined,

    postal: value && isAddressValue(value) ? value.postal ?? "" : "",
    county: value && isAddressValue(value) ? value.county ?? "" : "",

    divisions:
      value && isEmergencyVehicleValue(value) && DIVISIONS ? defaultDivisions(value) : undefined,

    showPicker: false,
    image: "",

    extraFields:
      value && (isDivisionValue(value) || isDepartmentValue(value))
        ? JSON.stringify(value.extraFields)
        : "null",
  };

  function validate(values: typeof INITIAL_VALUES) {
    if (type === ValueType.LICENSE) {
      // temporary fix, it seems to not update the schema :thinking:
      return {};
    }

    const schemaToUse = EXTRA_SCHEMAS[type] ?? BASE_VALUE_SCHEMA;
    const errors = handleValidate(schemaToUse)(values);

    if (values.color && !hexColor().test(values.color)) {
      return {
        ...errors,
        color: tValues("mustBeValidHexColor"),
      };
    }

    return errors;
  }

  return (
    <Modal
      className="w-[600px]"
      title={title}
      onClose={() => closeModal(ModalIds.ManageValue)}
      isOpen={isOpen(ModalIds.ManageValue)}
    >
      <Formik validate={validate} onSubmit={onSubmit} initialValues={INITIAL_VALUES}>
        {({ setFieldValue, values, errors }) => (
          <Form>
            {type === ValueType.DIVISION ? null : (
              <TextField
                errorMessage={errors.value}
                label={tValues("value")}
                autoFocus
                name="value"
                onChange={(value) => setFieldValue("value", value)}
                value={values.value}
              />
            )}

            {type === ValueType.EMERGENCY_VEHICLE ? <EmergencyVehicleFields /> : null}
            {type === ValueType.LICENSE ? <LicenseFields /> : null}

            {type === ValueType.DIVISION ? <DivisionFields /> : null}
            {type === ValueType.DEPARTMENT ? <DepartmentFields /> : null}
            {type === ValueType.QUALIFICATION ? (
              <QualificationFields image={image} setImage={setImage} />
            ) : null}

            {type === ValueType.ADDRESS ? <AddressFields /> : null}

            {type === ValueType.BUSINESS_ROLE ? (
              <SelectField
                errorMessage={errors.as}
                label={tValues("as")}
                options={BUSINESS_VALUES}
                name="as"
                onSelectionChange={(key) => setFieldValue("as", key)}
                selectedKey={values.as}
              />
            ) : null}

            {["VEHICLE", "WEAPON"].includes(type) ? (
              <TextField
                isOptional
                errorMessage={errors.hash}
                label={tValues("gameHash")}
                name="hash"
                onChange={(value) => setFieldValue("hash", value)}
                value={values.hash}
              />
            ) : null}

            {ValueType.VEHICLE === type ? (
              <SelectField
                isOptional
                isClearable
                selectionMode="multiple"
                errorMessage={errors.trimLevels}
                label={tValues("trimLevels")}
                options={vehicleTrimLevel.values.map((trimLevel) => ({
                  value: trimLevel.id,
                  label: trimLevel.value,
                }))}
                selectedKeys={values.trimLevels}
                onSelectionChange={(keys) => setFieldValue("trimLevels", keys)}
              />
            ) : null}

            {type === ValueType.CALL_TYPE ? (
              <TextField
                type="number"
                isOptional
                errorMessage={errors.priority}
                label={tValues("priority")}
                name="priority"
                onChange={(value) => setFieldValue("priority", value)}
                value={values.priority}
              />
            ) : null}

            {type === ValueType.OFFICER_RANK ? (
              <>
                <ImageSelectInput valueKey="officerRankImageId" image={image} setImage={setImage} />

                <SelectField
                  isOptional
                  label={tValues("departments")}
                  isClearable
                  selectionMode="multiple"
                  errorMessage={errors.officerRankDepartments}
                  options={department.values.map((department) => ({
                    value: department.id,
                    label: department.value.value,
                  }))}
                  selectedKeys={values.officerRankDepartments}
                  onSelectionChange={(keys) => setFieldValue("officerRankDepartments", keys)}
                />
              </>
            ) : null}

            {type === ValueType.DRIVERSLICENSE_CATEGORY ? (
              <TextField
                isTextarea
                isOptional
                errorMessage={errors.description}
                label={common("description")}
                name="description"
                onChange={(value) => setFieldValue("description", value)}
                value={values.description}
              />
            ) : null}

            {type === "CODES_10" ? <StatusValueFields /> : null}

            <SwitchField
              className="my-4 mt-8"
              isSelected={values.isDisabled}
              onChange={(isSelected) => setFieldValue("isDisabled", isSelected)}
              description={tValues("disabledDescription")}
            >
              {tValues("isDisabled")}
            </SwitchField>

            <footer className="flex justify-end mt-5">
              <Button
                type="reset"
                onPress={() => closeModal(ModalIds.ManageValue)}
                variant="cancel"
              >
                {common("cancel")}
              </Button>
              <Button className="flex items-center" disabled={state === "loading"} type="submit">
                {state === "loading" ? <Loader className="mr-2" /> : null}
                {footerTitle}
              </Button>
            </footer>
          </Form>
        )}
      </Formik>
    </Modal>
  );
}
