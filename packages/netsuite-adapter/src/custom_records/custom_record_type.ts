/*
 * Copyright 2025 Salto Labs Ltd.
 * Licensed under the Salto Terms of Use (the "License");
 * You may not use this file except in compliance with the License.  You may obtain a copy of the License at https://www.salto.io/terms-of-use
 *
 * CERTAIN THIRD PARTY SOFTWARE MAY BE CONTAINED IN PORTIONS OF THE SOFTWARE. See NOTICE FILE AT https://github.com/salto-io/salto/blob/main/NOTICES
 */
import _ from 'lodash'
import {
  BuiltinTypes,
  CORE_ANNOTATIONS,
  ElemID,
  FieldDefinition,
  InstanceElement,
  ListType,
  ObjectType,
  TypeRefMap,
  Values,
} from '@salto-io/adapter-api'
import {
  CUSTOM_RECORDS_PATH,
  CUSTOM_RECORD_TYPE,
  INDEX,
  INTERNAL_ID,
  METADATA_TYPE,
  NETSUITE,
  SCRIPT_ID,
  SOAP,
  SOURCE,
} from '../constants'
import { customrecordtypeType } from '../autogen/types/standard_types/customrecordtype'
import { isCustomFieldName } from '../types'

export const CUSTOM_FIELDS = 'customrecordcustomfields'
export const CUSTOM_FIELDS_LIST = 'customrecordcustomfield'

const TRANSLATION_LIST = 'translationsList'
const TRANSLATIONS = 'customRecordTranslations'
const CUSTOM_RECORD_TRANSLATION_LIST = 'customRecordTranslationsList'

export const toAnnotationRefTypes = (type: ObjectType): TypeRefMap =>
  _.mapValues(type.fields, field => {
    if (field.annotations[CORE_ANNOTATIONS.HIDDEN_VALUE]) {
      if (field.refType.elemID.isEqual(BuiltinTypes.BOOLEAN.elemID)) {
        return BuiltinTypes.HIDDEN_BOOLEAN
      }
      if (field.refType.elemID.isEqual(BuiltinTypes.STRING.elemID)) {
        return BuiltinTypes.HIDDEN_STRING
      }
    }
    return field.refType
  })

const createCustomRecordType = (
  instanceValues: Values,
  annotationRefsOrTypes: TypeRefMap = {},
  additionalFields: Record<string, FieldDefinition> = {},
): ObjectType =>
  new ObjectType({
    elemID: new ElemID(NETSUITE, instanceValues[SCRIPT_ID]),
    fields: {
      [SCRIPT_ID]: {
        refType: BuiltinTypes.STRING,
        annotations: { [CORE_ANNOTATIONS.REQUIRED]: true },
      },
      [INTERNAL_ID]: {
        refType: BuiltinTypes.SERVICE_ID,
        annotations: { [CORE_ANNOTATIONS.HIDDEN_VALUE]: true },
      },
      ...additionalFields,
    },
    annotationRefsOrTypes: {
      ...annotationRefsOrTypes,
      [SOURCE]: BuiltinTypes.HIDDEN_STRING,
      [INTERNAL_ID]: BuiltinTypes.HIDDEN_STRING,
    },
    annotations: {
      ...instanceValues,
      [SOURCE]: SOAP,
      [METADATA_TYPE]: CUSTOM_RECORD_TYPE,
    },
    path: [NETSUITE, CUSTOM_RECORDS_PATH, instanceValues[SCRIPT_ID]],
  })

export const createCustomRecordTypes = (
  customRecordTypeInstances: InstanceElement[],
  customRecordType: ObjectType,
): ObjectType[] => {
  const translation = new ObjectType({
    elemID: new ElemID(NETSUITE, TRANSLATIONS),
    fields: {
      locale: { refType: BuiltinTypes.STRING },
      language: { refType: BuiltinTypes.STRING },
      label: { refType: BuiltinTypes.STRING },
    },
    annotationRefsOrTypes: {
      [SOURCE]: BuiltinTypes.HIDDEN_STRING,
    },
    annotations: {
      [SOURCE]: SOAP,
    },
  })
  const translationsList = new ObjectType({
    elemID: new ElemID(NETSUITE, CUSTOM_RECORD_TRANSLATION_LIST),
    fields: {
      [TRANSLATIONS]: {
        refType: new ListType(translation),
      },
    },
    annotationRefsOrTypes: {
      [SOURCE]: BuiltinTypes.HIDDEN_STRING,
    },
    annotations: {
      [SOURCE]: SOAP,
    },
  })
  const annotationRefsOrTypes = toAnnotationRefTypes(customRecordType)
  return customRecordTypeInstances
    .map(instance =>
      createCustomRecordType(instance.value, annotationRefsOrTypes, {
        [TRANSLATION_LIST]: {
          refType: translationsList,
        },
      }),
    )
    .concat(translation, translationsList)
}

export const createLockedCustomRecordTypes = (scriptIds: string[]): ObjectType[] =>
  scriptIds.map(scriptId =>
    createCustomRecordType({
      [SCRIPT_ID]: scriptId,
      [CORE_ANNOTATIONS.HIDDEN]: true,
    }),
  )

export const toCustomRecordTypeInstance = (element: ObjectType): InstanceElement =>
  new InstanceElement(element.elemID.name, customrecordtypeType().type, {
    ..._.omit(element.annotations, [SOURCE, METADATA_TYPE, ...Object.values(CORE_ANNOTATIONS)]),
    [CUSTOM_FIELDS]: {
      [CUSTOM_FIELDS_LIST]: _(Object.values(element.fields))
        .filter(field => isCustomFieldName(field.name))
        .map(field => field.annotations)
        .sortBy(INDEX)
        .map(item => _.omit(item, INDEX))
        .value(),
    },
  })
