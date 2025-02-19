/*
 * Copyright 2025 Salto Labs Ltd.
 * Licensed under the Salto Terms of Use (the "License");
 * You may not use this file except in compliance with the License.  You may obtain a copy of the License at https://www.salto.io/terms-of-use
 *
 * CERTAIN THIRD PARTY SOFTWARE MAY BE CONTAINED IN PORTIONS OF THE SOFTWARE. See NOTICE FILE AT https://github.com/salto-io/salto/blob/main/NOTICES
 */
import { ChangeError, ChangeValidator, CORE_ANNOTATIONS, Element, getChangeData } from '@salto-io/adapter-api'
import _ from 'lodash'
import { collections, values } from '@salto-io/lowerdash'
import { apiName } from '../transformers/transformer'
import { NAMESPACE_SEPARATOR } from '../constants'
import { INSTANCE_SUFFIXES } from '../types'

const { awu } = collections.asynciterable
const { isDefined } = values

const createPackageElementModificationChangeWarning = (
  { elemID, annotations }: Element,
  namespace: string,
): ChangeError => ({
  elemID,
  severity: 'Warning',
  message: 'Modification of element from managed package may not be allowed',
  detailedMessage:
    `Modification of element ${elemID.getFullName()} from managed package with namespace ${namespace} may not be allowed. ` +
    `For more information refer to ${annotations[CORE_ANNOTATIONS.SERVICE_URL]}. You can learn more about this deployment preview error here: https://help.salto.io/en/articles/8046659-modifying-an-element-from-a-managed-package-may-not-be-allowed`,
})

export const hasNamespace = async (customElement: Element): Promise<boolean> => {
  const apiNameResult = await apiName(customElement, true)
  if (_.isUndefined(apiNameResult)) {
    return false
  }
  const partialFullName = apiNameResult.split('-')[0]

  const elementSuffix = INSTANCE_SUFFIXES.map(suffix => `__${suffix}`).find(suffix => partialFullName.endsWith(suffix))

  const cleanFullName = elementSuffix !== undefined ? partialFullName.slice(0, -elementSuffix.length) : partialFullName
  return cleanFullName.includes(NAMESPACE_SEPARATOR)
}

const getNamespace = async (customElement: Element): Promise<string> =>
  (await apiName(customElement, true)).split(NAMESPACE_SEPARATOR)[0]

const changeValidator: ChangeValidator = async changes =>
  awu(changes)
    .map(getChangeData)
    .filter(hasNamespace)
    .map(async managedElement =>
      createPackageElementModificationChangeWarning(managedElement, await getNamespace(managedElement)),
    )
    .filter(isDefined)
    .toArray()

export default changeValidator
