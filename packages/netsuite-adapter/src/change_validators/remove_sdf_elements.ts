/*
 * Copyright 2025 Salto Labs Ltd.
 * Licensed under the Salto Terms of Use (the "License");
 * You may not use this file except in compliance with the License.  You may obtain a copy of the License at https://www.salto.io/terms-of-use
 *
 * CERTAIN THIRD PARTY SOFTWARE MAY BE CONTAINED IN PORTIONS OF THE SOFTWARE. See NOTICE FILE AT https://github.com/salto-io/salto/blob/main/NOTICES
 */
import {
  Change,
  isRemovalChange,
  getChangeData,
  Element,
  isInstanceElement,
  isObjectType,
  isField,
  ChangeError,
} from '@salto-io/adapter-api'
import { values, collections } from '@salto-io/lowerdash'
import { isCustomRecordType, isStandardType, hasInternalId } from '../types'
import { NetsuiteChangeValidator } from './types'
import { isSupportedInstance } from '../filters/internal_ids/sdf_internal_ids'
import { IS_LOCKED } from '../constants'

const { isDefined } = values
const { awu } = collections.asynciterable

const validateRemovableChange = async (
  element: Element,
  changes: ReadonlyArray<Change>,
): Promise<ChangeError | undefined> => {
  if (isInstanceElement(element) && isStandardType(element.refType)) {
    if (!isSupportedInstance(element)) {
      return {
        elemID: element.elemID,
        severity: 'Error',
        message: "Can't remove instance",
        detailedMessage: `Can't remove this ${element.elemID.typeName}. Remove it in NetSuite UI`,
      }
    }
    if (!hasInternalId(element)) {
      return {
        elemID: element.elemID,
        severity: 'Error',
        message: "Can't remove instance",
        detailedMessage: `Can't remove this ${element.elemID.typeName}. Try fetching and deploying again, or remove it in Netsuite UI`,
      }
    }
  } else if (isObjectType(element) && isCustomRecordType(element) && !element.annotations[IS_LOCKED]) {
    if (!hasInternalId(element)) {
      return {
        elemID: element.elemID,
        severity: 'Error',
        message: "Can't remove Custom Record Type",
        detailedMessage:
          "Can't remove this Custom Record Type. Try fetching and deploying again, or remove it in Netsuite UI",
      }
    }
    return {
      elemID: element.elemID,
      severity: 'Warning',
      message: 'Instances of Custom Record Type might be removed',
      detailedMessage:
        'If there are instances of this Custom Record Type in your Netsuite account - they will be removed',
    }
  } else if (isField(element) && isCustomRecordType(element.parent)) {
    if (
      !changes
        .filter(isRemovalChange)
        .map(getChangeData)
        .filter(isObjectType)
        .some(elem => elem.elemID.isEqual(element.parent.elemID))
    ) {
      return {
        elemID: element.elemID,
        severity: 'Error',
        message: "Can't remove fields of Custom Record Types",
        detailedMessage: `Can't remove field ${element.elemID.name} of this Custom Record Type. Remove it in NetSuite UI`,
      }
    }
  }
  return undefined
}

const changeValidator: NetsuiteChangeValidator = async changes =>
  awu(changes)
    .filter(isRemovalChange)
    .map(getChangeData)
    .map(element => validateRemovableChange(element, changes))
    .filter(isDefined)
    .toArray()

export default changeValidator
