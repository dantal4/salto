/*
*                      Copyright 2022 Salto Labs Ltd.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with
* the License.  You may obtain a copy of the License at
*
*     http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/
/* eslint-disable camelcase */
import { ElemID, InstanceElement, isInstanceElement, Value } from '@salto-io/adapter-api'
import { TransformFunc, transformValues } from '@salto-io/adapter-utils'
import { collections } from '@salto-io/lowerdash'
import { FilterWith } from '../filter'
import {
  CUSTOM_RECORD_TYPE, ENTRY_FORM, TRANSACTION_FORM, PERMITTED_ROLE, RECORD_TYPE, NETSUITE,
} from '../constants'

const { awu } = collections.asynciterable
type InconsistentFieldMapping = {
  fieldElemID: ElemID
  inconsistentValues: Value[]
  consistentValue: Value
}

const customRecordTypeApClerkPermittedRole = {
  fieldElemID: new ElemID(NETSUITE, 'customrecordtype_permissions_permission', 'field', PERMITTED_ROLE),
  inconsistentValues: ['CUSTOMROLEAP_CLERK', 'AP_CLERK'],
  consistentValue: 'AP_CLERK',
}

const customRecordTypeCeoHandsOffPermittedRole = {
  fieldElemID: new ElemID(NETSUITE, 'customrecordtype_permissions_permission', 'field', PERMITTED_ROLE),
  inconsistentValues: ['CUSTOMROLEATHENA_NS_VIEW_ALL', 'CEO_HANDS_OFF'],
  consistentValue: 'CEO_HANDS_OFF',
}

const customRecordTypeBuyerPermittedRole = {
  fieldElemID: new ElemID(NETSUITE, 'customrecordtype_permissions_permission', 'field', PERMITTED_ROLE),
  inconsistentValues: ['BUYER', 'CUSTOMROLEPURCHASING'],
  consistentValue: 'BUYER',
}

const entryFormDiscountItemRecordType = {
  fieldElemID: new ElemID(NETSUITE, ENTRY_FORM, 'field', RECORD_TYPE),
  inconsistentValues: ['DISCOUNTITEM', 'MARKUPITEM'],
  consistentValue: 'DISCOUNTITEM',
}

const entryFormItemGroupRecordType = {
  fieldElemID: new ElemID(NETSUITE, ENTRY_FORM, 'field', RECORD_TYPE),
  inconsistentValues: ['ASSEMBLYITEM', 'KITITEM', 'ITEMGROUP'],
  consistentValue: 'ITEMGROUP',
}

const entryFormJobRecordType = {
  fieldElemID: new ElemID(NETSUITE, ENTRY_FORM, 'field', RECORD_TYPE),
  inconsistentValues: ['MFGPROJECT', 'JOB'],
  consistentValue: 'JOB',
}

const entryFormServiceItemRecordType = {
  fieldElemID: new ElemID(NETSUITE, ENTRY_FORM, 'field', RECORD_TYPE),
  inconsistentValues: ['OTHERCHARGEPURCHASEITEM', 'OTHERCHARGERESALEITEM', 'NONINVENTORYSALEITEM', 'SERVICEPURCHASEITEM', 'GIFTCERTIFICATEITEM', 'DOWNLOADITEM', 'SERVICERESALEITEM', 'OTHERCHARGEITEM', 'SERVICEITEM', 'NONINVENTORYPURCHASEITEM', 'OTHERCHARGESALEITEM', 'NONINVENTORYRESALEITEM', 'SERVICESALEITEM', 'NONINVENTORYITEM'],
  consistentValue: 'SERVICEITEM',
}

const transactionFormRecordType = {
  fieldElemID: new ElemID(NETSUITE, TRANSACTION_FORM, 'field', RECORD_TYPE),
  inconsistentValues: ['JOURNALENTRY', 'INTERCOMPANYJOURNALENTRY', 'ADVINTERCOMPANYJOURNALENTRY', 'STATISTICALJOURNALENTRY'],
  consistentValue: 'JOURNALENTRY',
}

const typeToFieldMappings: Record<string, InconsistentFieldMapping[]> = {
  [CUSTOM_RECORD_TYPE]: [
    customRecordTypeApClerkPermittedRole,
    customRecordTypeCeoHandsOffPermittedRole,
    customRecordTypeBuyerPermittedRole,
  ],
  [ENTRY_FORM]: [
    entryFormDiscountItemRecordType,
    entryFormItemGroupRecordType,
    entryFormJobRecordType,
    entryFormServiceItemRecordType,
  ],
  [TRANSACTION_FORM]: [transactionFormRecordType],
}

const setConsistentValues = async (instance: InstanceElement): Promise<void> => {
  const transformFunc = (
    fieldMappings: InconsistentFieldMapping[]
  ): TransformFunc => ({ value, field }) => {
    const matchingFieldMapping = fieldMappings.find(fieldMapping =>
      field
      && fieldMapping.fieldElemID.isEqual(field.elemID)
      && fieldMapping.inconsistentValues.includes(value))
    if (matchingFieldMapping) {
      return matchingFieldMapping.consistentValue
    }
    return value
  }

  const fieldMappings = typeToFieldMappings[instance.refType.elemID.name]
  if (!fieldMappings) return
  instance.value = await transformValues({
    values: instance.value,
    type: await instance.getType(),
    transformFunc: transformFunc(fieldMappings),
    strict: false,
  }) ?? instance.value
}

const filterCreator = (): FilterWith<'onFetch'> => ({
  /**
   * Upon fetch, set fields that are randomly returned with different values but have the same
   * meaning to have a consistent equivalent value so there won't be irrelevant changes upon fetch
   * even if nothing hasn't really changed in the service.
   *
   * @param elements the already fetched elements
   */
  onFetch: async elements => {
    await awu(elements)
      .filter(isInstanceElement)
      .forEach(setConsistentValues)
  },
})

export default filterCreator
